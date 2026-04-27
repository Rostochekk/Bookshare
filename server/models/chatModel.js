import { openDB } from "../config/db.js";

export async function getChatsByUser(userId) {
  const db = await openDB();
  return db.all(`
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
        SELECT m.text FROM messages m
        WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1
      ) AS last_text,
      (
        SELECT m.image_path FROM messages m
        WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1
      ) AS last_image,
      (
        SELECT m.created_at FROM messages m
        WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1
      ) AS last_time,
      (
        SELECT COUNT(*) FROM messages m
        WHERE m.chat_id = c.id
          AND m.sender_id != ?
          AND m.created_at > COALESCE(
            (SELECT r.created_at FROM messages r
             WHERE r.chat_id = c.id AND r.sender_id = ?
             ORDER BY r.created_at DESC LIMIT 1),
            '1970-01-01'
          )
      ) AS unread_count
    FROM chats c
    JOIN users buyer  ON buyer.id  = c.buyer_id
    JOIN users owner_ ON owner_.id = c.owner_id
    LEFT JOIN books b ON b.id = c.book_id
    WHERE c.buyer_id = ? OR c.owner_id = ?
    ORDER BY last_time DESC NULLS LAST
  `, [userId, userId, userId, userId]);
}

export async function getChatAccess(chatId, userId) {
  const db = await openDB();
  return db.get(
    "SELECT * FROM chats WHERE id = ? AND (buyer_id = ? OR owner_id = ?)",
    [chatId, userId, userId]
  );
}

export async function getMessagesByChatId(chatId) {
  const db = await openDB();
  return db.all(`
    SELECT
      m.id, m.chat_id, m.sender_id, m.text, m.image_path, m.is_system, m.created_at,
      u.name   AS sender_name,
      u.avatar AS sender_avatar
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.chat_id = ?
    ORDER BY m.created_at ASC
  `, [chatId]);
}

export async function getMessageCount(chatId) {
  const db  = await openDB();
  const row = await db.get(
    "SELECT COUNT(*) AS cnt FROM messages WHERE chat_id = ?",
    [chatId]
  );
  return row?.cnt ?? 0;
}

export async function getChatRating(chatId, userId) {
  const db = await openDB();
  return db.get(
    "SELECT rating FROM chat_ratings WHERE chat_id = ? AND user_id = ?",
    [chatId, userId]
  );
}

export async function findExistingChat(bookId, buyerId, ownerId) {
  const db = await openDB();
  return db.get(
    "SELECT * FROM chats WHERE book_id = ? AND buyer_id = ? AND owner_id = ?",
    [bookId, buyerId, ownerId]
  );
}

export async function createChat(bookId, buyerId, ownerId) {
  const db     = await openDB();
  const result = await db.run(
    "INSERT INTO chats (book_id, buyer_id, owner_id) VALUES (?, ?, ?)",
    [bookId, buyerId, ownerId]
  );
  return db.get("SELECT * FROM chats WHERE id = ?", [result.lastID]);
}

export async function createMessage(chatId, senderId, text, imagePath, isSystem = 0) {
  const db     = await openDB();
  const result = await db.run(
    "INSERT INTO messages (chat_id, sender_id, text, image_path, is_system) VALUES (?, ?, ?, ?, ?)",
    [chatId, senderId, text || null, imagePath || null, isSystem]
  );
  return db.get(`
    SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.id = ?
  `, [result.lastID]);
}

export async function upsertRating(chatId, userId, rating) {
  const db = await openDB();
  await db.run(
    `INSERT INTO chat_ratings (chat_id, user_id, rating)
     VALUES (?, ?, ?)
     ON CONFLICT(chat_id, user_id) DO UPDATE SET rating = excluded.rating`,
    [chatId, userId, rating]
  );
}
