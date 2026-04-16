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

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      exchanged     INTEGER DEFAULT 0,
      rating        REAL    DEFAULT 5.0,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      author      TEXT,
      category    TEXT,
      condition   TEXT,
      description TEXT,
      cover       TEXT,
      owner_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("📚 База даних готова!");
}