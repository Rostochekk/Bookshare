// server/routes/chats.js
import express from "express";
import multer  from "multer";
import path    from "path";
import fs      from "fs";
import { fileURLToPath } from "url";
import { openDB } from "../db.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Папка для фото в повідомленнях ───────────────────────
const MSG_IMAGES_DIR = path.join(__dirname, "../../client/uploads/messages");
if (!fs.existsSync(MSG_IMAGES_DIR)) fs.mkdirSync(MSG_IMAGES_DIR, { recursive: true });

const msgImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MSG_IMAGES_DIR),
  filename:    (_req,  file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `msg_${Date.now()}${ext}`);
  },
});

const uploadMsgImage = multer({
  storage: msgImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// Скільки повідомлень має бути в чаті перш ніж показати рейтинг
const RATING_THRESHOLD = 10;

// ── Хелпер: аватар користувача ───────────────────────────
function avatarUrl(user) {
  if (user.avatar) return user.avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=00a870&color=fff&size=48`;
}

// ════════════════════════════════════════════════════════════
//  GET /api/chats?user_id=5
//  Повертає всі чати юзера з останнім повідомленням
// ════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id обов'язковий" });

  const db = await openDB();

  const chats = await db.all(`
    SELECT
      c.id,
      c.book_id,
      c.buyer_id,
      c.owner_id,
      c.created_at,
      b.title       AS book_title,
      b.author      AS book_author,
      b.cover       AS book_cover,
      buyer.name    AS buyer_name,
      buyer.avatar  AS buyer_avatar,
      owner_.name   AS owner_name,
      owner_.avatar AS owner_avatar,
      (
        SELECT m.text
        FROM messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_text,
      (
        SELECT m.image_path
        FROM messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_image,
      (
        SELECT m.created_at
        FROM messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_time,
      (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.chat_id = c.id
          AND m.sender_id != ?
          AND m.created_at > COALESCE(
            (SELECT r.created_at FROM messages r WHERE r.chat_id = c.id AND r.sender_id = ? ORDER BY r.created_at DESC LIMIT 1),
            '1970-01-01'
          )
      ) AS unread_count
    FROM chats c
    JOIN users buyer  ON buyer.id  = c.buyer_id
    JOIN users owner_ ON owner_.id = c.owner_id
    LEFT JOIN books b ON b.id = c.book_id
    WHERE c.buyer_id = ? OR c.owner_id = ?
    ORDER BY last_time DESC NULLS LAST
  `, [user_id, user_id, user_id, user_id]);

  // Формуємо відповідь з точки зору поточного юзера
  const result = chats.map(c => {
    const isBuyer    = String(c.buyer_id) === String(user_id);
    const otherName  = isBuyer ? c.owner_name  : c.buyer_name;
    const otherAvatar= isBuyer ? c.owner_avatar : c.buyer_avatar;
    const otherId    = isBuyer ? c.owner_id     : c.buyer_id;

    return {
      id:           c.id,
      book_id:      c.book_id,
      book_title:   c.book_title,
      book_author:  c.book_author,
      book_cover:   c.book_cover,
      other_id:     otherId,
      other_name:   otherName,
      other_avatar: otherAvatar
        ? otherAvatar
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(otherName || "?")}&background=00a870&color=fff&size=48`,
      last_text:    c.last_text || (c.last_image ? "📷 Фото" : ""),
      last_time:    c.last_time,
      unread_count: c.unread_count || 0,
    };
  });

  res.json(result);
});

// ════════════════════════════════════════════════════════════
//  GET /api/chats/:id/messages?user_id=5
//  Повертає всі повідомлення чату + мета-інфо
// ════════════════════════════════════════════════════════════
router.get("/:id/messages", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id обов'язковий" });

  const db = await openDB();

  // Перевіряємо доступ
  const chat = await db.get(
    "SELECT * FROM chats WHERE id = ? AND (buyer_id = ? OR owner_id = ?)",
    [req.params.id, user_id, user_id]
  );
  if (!chat) return res.status(403).json({ error: "Доступ заборонено" });

  const messages = await db.all(`
    SELECT
      m.id,
      m.chat_id,
      m.sender_id,
      m.text,
      m.image_path,
      m.is_system,
      m.created_at,
      u.name   AS sender_name,
      u.avatar AS sender_avatar
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.chat_id = ?
    ORDER BY m.created_at ASC
  `, [req.params.id]);

  // Загальна кількість повідомлень для логіки рейтингу
  const totalCount = messages.length;

  // Чи поставив поточний юзер рейтинг?
  const existingRating = await db.get(
    "SELECT rating FROM chat_ratings WHERE chat_id = ? AND user_id = ?",
    [req.params.id, user_id]
  );

  // Чи показувати форму рейтингу?
  // Показуємо якщо: повідомлень >= RATING_THRESHOLD І рейтинг ще не поставлено
  const showRating = totalCount >= RATING_THRESHOLD && !existingRating;

  res.json({
    chat,
    messages: messages.map(m => ({
      ...m,
      sender_avatar: m.sender_avatar
        ? m.sender_avatar
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.sender_name || "?")}&background=00a870&color=fff&size=32`,
    })),
    total_count:   totalCount,
    show_rating:   showRating,
    my_rating:     existingRating?.rating || null,
  });
});

// ════════════════════════════════════════════════════════════
//  POST /api/chats/start
//  Створює новий чат або повертає існуючий.
//  При створенні надсилає автоматичне повідомлення про книгу.
//  Body: { book_id, buyer_id }
// ════════════════════════════════════════════════════════════
router.post("/start", async (req, res) => {
  const { book_id, buyer_id } = req.body;

  if (!book_id || !buyer_id)
    return res.status(400).json({ error: "book_id та buyer_id обов'язкові" });

  const db = await openDB();

  // Знаходимо книгу і її власника
  const book = await db.get(
    "SELECT id, title, author, cover, owner_id FROM books WHERE id = ?",
    [book_id]
  );
  if (!book) return res.status(404).json({ error: "Книгу не знайдено" });

  if (String(book.owner_id) === String(buyer_id))
    return res.status(400).json({ error: "Не можна писати самому собі" });

  // Шукаємо існуючий чат
  let chat = await db.get(
    "SELECT * FROM chats WHERE book_id = ? AND buyer_id = ? AND owner_id = ?",
    [book_id, buyer_id, book.owner_id]
  );

  const isNew = !chat;

  if (isNew) {
    const result = await db.run(
      "INSERT INTO chats (book_id, buyer_id, owner_id) VALUES (?, ?, ?)",
      [book_id, buyer_id, book.owner_id]
    );
    chat = await db.get("SELECT * FROM chats WHERE id = ?", [result.lastID]);

    // ── Автоматичне повідомлення від buyer ─────────────
    // Надсилається від імені покупця як системне повідомлення
    // Містить обкладинку книги та текст
    const buyer = await db.get("SELECT name FROM users WHERE id = ?", [buyer_id]);
    const autoText = `Привіт! Мене цікавить ваша книга «${book.title}»${book.author ? ` (${book.author})` : ""}. Вона ще доступна?`;

    await db.run(
      `INSERT INTO messages (chat_id, sender_id, text, image_path, is_system)
       VALUES (?, ?, ?, ?, 1)`,
      [chat.id, buyer_id, autoText, book.cover || null]
    );
  }

  res.status(isNew ? 201 : 200).json({ chat_id: chat.id, is_new: isNew });
});

// ════════════════════════════════════════════════════════════
//  POST /api/chats/:id/messages
//  Надсилає повідомлення (текст і/або фото)
//  FormData: { sender_id, text? } + file field "image"
// ════════════════════════════════════════════════════════════
router.post("/:id/messages", uploadMsgImage.single("image"), async (req, res) => {
  const { sender_id, text } = req.body;
  const image_path = req.file ? `/uploads/messages/${req.file.filename}` : null;

  if (!sender_id)
    return res.status(400).json({ error: "sender_id обов'язковий" });
  if (!text && !image_path)
    return res.status(400).json({ error: "Потрібен текст або фото" });

  const db = await openDB();

  // Перевіряємо доступ
  const chat = await db.get(
    "SELECT * FROM chats WHERE id = ? AND (buyer_id = ? OR owner_id = ?)",
    [req.params.id, sender_id, sender_id]
  );
  if (!chat) return res.status(403).json({ error: "Доступ заборонено" });

  const result = await db.run(
    "INSERT INTO messages (chat_id, sender_id, text, image_path) VALUES (?, ?, ?, ?)",
    [req.params.id, sender_id, text || null, image_path]
  );

  const msg = await db.get(`
    SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.id = ?
  `, [result.lastID]);

  // Перевіряємо чи треба показати форму рейтингу
  const total = await db.get(
    "SELECT COUNT(*) AS cnt FROM messages WHERE chat_id = ?",
    [req.params.id]
  );
  const existingRating = await db.get(
    "SELECT id FROM chat_ratings WHERE chat_id = ? AND user_id = ?",
    [req.params.id, sender_id]
  );
  const show_rating = total.cnt >= RATING_THRESHOLD && !existingRating;

  res.status(201).json({
    message: {
      ...msg,
      sender_avatar: msg.sender_avatar
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name)}&background=00a870&color=fff&size=32`,
    },
    show_rating,
    total_count: total.cnt,
  });
});

// ════════════════════════════════════════════════════════════
//  POST /api/chats/:id/rate
//  Body: { user_id, rating (1-5) }
// ════════════════════════════════════════════════════════════
router.post("/:id/rate", async (req, res) => {
  const { user_id, rating } = req.body;

  if (!user_id || !rating)
    return res.status(400).json({ error: "user_id та rating обов'язкові" });
  if (rating < 1 || rating > 5)
    return res.status(400).json({ error: "Рейтинг від 1 до 5" });

  const db = await openDB();

  const chat = await db.get(
    "SELECT * FROM chats WHERE id = ? AND (buyer_id = ? OR owner_id = ?)",
    [req.params.id, user_id, user_id]
  );
  if (!chat) return res.status(403).json({ error: "Доступ заборонено" });

  // INSERT OR REPLACE — якщо вже є, оновлюємо
  await db.run(
    `INSERT INTO chat_ratings (chat_id, user_id, rating)
     VALUES (?, ?, ?)
     ON CONFLICT(chat_id, user_id) DO UPDATE SET rating = excluded.rating`,
    [req.params.id, user_id, rating]
  );

  res.json({ message: "Дякуємо за оцінку!" });
});

export default router;