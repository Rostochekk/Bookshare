// server/db.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function openDB() {
  return open({
    filename: path.join(__dirname, "books.db"),
    driver: sqlite3.Database,
  });
}

// Ініціалізація таблиць, якщо їх нема
export async function initDB() {
  const db = await openDB();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      category TEXT,
      condition TEXT,
      added_by TEXT,
      cover TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT
    )
  `);

  console.log("📚 База даних готова!");
}
