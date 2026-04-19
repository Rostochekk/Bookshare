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

  // ── Таблиця користувачів ──────────────────────────────
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

  // ── Таблиця книг ──────────────────────────────────────
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

  // ── Міграції (безпечно — не падає якщо колонка вже є) ─
  await runMigrations(db);

  console.log("📚 База даних готова!");
}

async function runMigrations(db) {
  // Додаємо avatar до users якщо відсутня
  await safeAddColumn(db, "users", "avatar", "TEXT DEFAULT NULL");

  // Прибираємо застарілі колонки зі старої схеми
  // (SQLite не підтримує DROP COLUMN до версії 3.35,
  //  тому просто ігноруємо — вони не заважають)
}

/**
 * Безпечно додає колонку якщо вона ще не існує.
 * SQLite не має IF NOT EXISTS для ALTER TABLE ADD COLUMN,
 * тому ловимо помилку якщо колонка вже є.
 */
async function safeAddColumn(db, table, column, definition) {
  try {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`✅ Міграція: додано ${table}.${column}`);
  } catch (e) {
    // "duplicate column name" — колонка вже є, все ок
    if (!e.message.includes("duplicate column name")) {
      throw e;
    }
  }
}