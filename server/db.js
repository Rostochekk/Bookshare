// server/db.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function openDB() {
  return open({
    filename: path.join(__dirname, "bookshare.db"),
    driver: sqlite3.Database,
  });
}

export async function initDB() {
  const db = await openDB();

  // ── Користувачі ───────────────────────────────────────
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      avatar        TEXT    DEFAULT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Книги ─────────────────────────────────────────────
  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      author      TEXT,
      category    TEXT,
      condition   TEXT,
      description TEXT,
      cover       TEXT    DEFAULT NULL,
      owner_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Чати ──────────────────────────────────────────────
  // book_id   — книга про яку чат
  // buyer_id  — хто написав першим
  // owner_id  — власник книги
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id    INTEGER REFERENCES books(id) ON DELETE SET NULL,
      buyer_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(book_id, buyer_id, owner_id)
    )
  `);

  // ── Повідомлення ──────────────────────────────────────
  // is_system = 1 — автоматичне повідомлення про книгу
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id    INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      sender_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text       TEXT,
      image_path TEXT    DEFAULT NULL,
      is_system  INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Рейтинги чатів ────────────────────────────────────
  // Кожен учасник може оцінити чат лише один раз
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_ratings (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id    INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(chat_id, user_id)
    )
  `);

  await runMigrations(db);
  console.log("📚 База даних готова!");
}

async function runMigrations(db) {
  await safeAddColumn(db, "users",    "avatar",     "TEXT DEFAULT NULL");
  await safeAddColumn(db, "messages", "image_path", "TEXT DEFAULT NULL");
  await safeAddColumn(db, "messages", "is_system",  "INTEGER DEFAULT 0");
}

async function safeAddColumn(db, table, column, definition) {
  try {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`✅ Міграція: ${table}.${column} додано`);
  } catch (e) {
    if (!e.message.includes("duplicate column name")) throw e;
  }
}