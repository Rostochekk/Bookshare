// server/routes/books.js
import express from "express";
import multer  from "multer";
import path    from "path";
import fs      from "fs";
import { fileURLToPath } from "url";
import { openDB } from "../db.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Дефолтна обкладинка (повертається якщо cover = NULL) ─
// Можна замінити на свій файл: покладіть його в client/images/book-default.jpg
const DEFAULT_COVER = "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=280&fit=crop";

// ── Папка для обкладинок ──────────────────────────────────
const COVERS_DIR = path.join(__dirname, "../../client/uploads/covers");
if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });

const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, COVERS_DIR),
  filename:    (_req,  file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cover_${Date.now()}${ext}`);
  },
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// ── Хелпер: підставляємо дефолтну обкладинку якщо NULL ──
function withDefaultCover(book) {
  return { ...book, cover: book.cover || DEFAULT_COVER };
}

function withDefaultCovers(books) {
  return books.map(withDefaultCover);
}

// ── SQL заготовка з джойном ───────────────────────────────
const WITH_OWNER = `
  SELECT b.*, u.name AS owner_name
  FROM books b
  LEFT JOIN users u ON u.id = b.owner_id
`;

// ════════════════════════════════════════════════════════════
//  POST /api/books/upload-cover
//  FormData: { cover: File, user_id: number }
// ════════════════════════════════════════════════════════════
router.post("/upload-cover", uploadCover.single("cover"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: "Файл не отримано" });
  res.json({ cover: `/uploads/covers/${req.file.filename}` });
});

// ════════════════════════════════════════════════════════════
//  GET /api/books/count
// ════════════════════════════════════════════════════════════
router.get("/count", async (req, res) => {
  const db  = await openDB();
  const row = await db.get("SELECT COUNT(*) AS count FROM books");
  res.json({ count: row?.count ?? 0 });
});

// ════════════════════════════════════════════════════════════
//  GET /api/books/recent   (4 останні)
// ════════════════════════════════════════════════════════════
router.get("/recent", async (req, res) => {
  const db    = await openDB();
  const books = await db.all(`${WITH_OWNER} ORDER BY b.created_at DESC LIMIT 4`);
  res.json(withDefaultCovers(books));
});

// ════════════════════════════════════════════════════════════
//  GET /api/books/my?owner_id=5
// ════════════════════════════════════════════════════════════
router.get("/my", async (req, res) => {
  const { owner_id } = req.query;
  if (!owner_id)
    return res.status(400).json({ error: "owner_id обов'язковий" });

  const db    = await openDB();
  const books = await db.all(
    `${WITH_OWNER} WHERE b.owner_id = ? ORDER BY b.created_at DESC`,
    [owner_id]
  );
  res.json(withDefaultCovers(books));
});

// ════════════════════════════════════════════════════════════
//  GET /api/books/categories
// ════════════════════════════════════════════════════════════
router.get("/categories", async (req, res) => {
  const db   = await openDB();
  const rows = await db.all(
    "SELECT category AS name, COUNT(*) AS count FROM books GROUP BY category"
  );
  res.json(rows);
});

// ════════════════════════════════════════════════════════════
//  GET /api/books/all?category=&condition=&search=
// ════════════════════════════════════════════════════════════
router.get("/all", async (req, res) => {
  const { category, condition, search } = req.query;

  let sql    = `${WITH_OWNER} WHERE 1=1`;
  const params = [];

  if (category) {
    const cats = category.split(",").map(c => c.trim()).filter(Boolean);
    sql += ` AND b.category IN (${cats.map(() => "?").join(",")})`;
    params.push(...cats);
  }
  if (condition) {
    const conds = condition.split(",").map(c => c.trim()).filter(Boolean);
    sql += ` AND b.condition IN (${conds.map(() => "?").join(",")})`;
    params.push(...conds);
  }
  if (search) {
    sql += ` AND (b.title LIKE ? OR b.author LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += " ORDER BY b.created_at DESC";

  const db    = await openDB();
  const books = await db.all(sql, params);
  res.json(withDefaultCovers(books));
});

// ════════════════════════════════════════════════════════════
//  GET /api/books/:id
// ════════════════════════════════════════════════════════════
router.get("/:id(\\d+)", async (req, res) => {
  const db   = await openDB();
  const book = await db.get(`${WITH_OWNER} WHERE b.id = ?`, [req.params.id]);
  if (!book) return res.status(404).json({ error: "Книгу не знайдено" });
  res.json(withDefaultCover(book));
});

// ════════════════════════════════════════════════════════════
//  GET /api/books/:id/related
// ════════════════════════════════════════════════════════════
router.get("/:id(\\d+)/related", async (req, res) => {
  const db   = await openDB();
  const book = await db.get("SELECT category FROM books WHERE id = ?", [req.params.id]);
  if (!book) return res.json([]);

  const related = await db.all(
    `${WITH_OWNER} WHERE b.category = ? AND b.id != ? ORDER BY b.created_at DESC LIMIT 3`,
    [book.category, req.params.id]
  );
  res.json(withDefaultCovers(related));
});

// ════════════════════════════════════════════════════════════
//  POST /api/books/add
//  Body: { title, author, category, condition, description, owner_id, cover? }
// ════════════════════════════════════════════════════════════
router.post("/add", async (req, res) => {
  const { title, author, category, condition, description, owner_id, cover } = req.body;

  if (!title)    return res.status(400).json({ error: "Назва обов'язкова" });
  if (!owner_id) return res.status(400).json({ error: "owner_id обов'язковий" });

  const db     = await openDB();
  const result = await db.run(
    `INSERT INTO books (title, author, category, condition, description, owner_id, cover)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, author, category, condition, description, owner_id, cover || null]
  );

  const book = await db.get(`${WITH_OWNER} WHERE b.id = ?`, [result.lastID]);
  res.status(201).json({ message: "Книгу додано", book: withDefaultCover(book) });
});

// ════════════════════════════════════════════════════════════
//  PUT /api/books/:id
// ════════════════════════════════════════════════════════════
router.put("/:id(\\d+)", async (req, res) => {
  const { title, author, category, condition, description, cover, owner_id } = req.body;

  const db       = await openDB();
  const existing = await db.get(
    "SELECT id, owner_id, cover FROM books WHERE id = ?", [req.params.id]
  );
  if (!existing) return res.status(404).json({ error: "Книгу не знайдено" });
  if (String(existing.owner_id) !== String(owner_id))
    return res.status(403).json({ error: "Немає прав на редагування" });

  // Якщо нова обкладинка — видаляємо стару з диску
  if (cover && existing.cover && existing.cover !== cover && !existing.cover.startsWith("http")) {
    const oldPath = path.join(__dirname, "../../client", existing.cover);
    if (fs.existsSync(oldPath)) {
      try { fs.unlinkSync(oldPath); } catch {}
    }
  }

  await db.run(
    `UPDATE books SET title=?, author=?, category=?, condition=?, description=?, cover=?
     WHERE id=?`,
    [title, author, category, condition, description, cover ?? existing.cover, req.params.id]
  );

  const book = await db.get(`${WITH_OWNER} WHERE b.id = ?`, [req.params.id]);
  res.json({ message: "Книгу оновлено", book: withDefaultCover(book) });
});

// ════════════════════════════════════════════════════════════
//  DELETE /api/books/:id
//  Body: { owner_id }
// ════════════════════════════════════════════════════════════
router.delete("/:id(\\d+)", async (req, res) => {
  const owner_id = req.body?.owner_id || req.query?.owner_id;

  const db       = await openDB();
  const existing = await db.get(
    "SELECT id, owner_id, cover FROM books WHERE id = ?", [req.params.id]
  );
  if (!existing) return res.status(404).json({ error: "Книгу не знайдено" });
  if (String(existing.owner_id) !== String(owner_id))
    return res.status(403).json({ error: "Немає прав на видалення" });

  // Видаляємо файл обкладинки якщо він локальний
  if (existing.cover && !existing.cover.startsWith("http")) {
    const coverPath = path.join(__dirname, "../../client", existing.cover);
    if (fs.existsSync(coverPath)) {
      try { fs.unlinkSync(coverPath); } catch {}
    }
  }

  await db.run("DELETE FROM books WHERE id = ?", [req.params.id]);
  res.json({ message: "Книгу видалено" });
});

export default router;