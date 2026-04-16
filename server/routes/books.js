// server/routes/books.js
import express from "express";
import { openDB } from "../db.js";

const router = express.Router();

// Отримати загальну кількість книг
router.get("/count", async (req, res) => {
  const db = await openDB();
  const { count } = (await db.get("SELECT COUNT(*) as count FROM books")) || {
    count: 0,
  };
  res.json({ count });
});

// Отримати нещодавно додані (4 останні)
router.get("/recent", async (req, res) => {
  const db = await openDB();
  const books = await db.all(
    "SELECT * FROM books ORDER BY created_at DESC LIMIT 4"
  );
  res.json(books);
});

// Усі книги
router.get("/all", async (req, res) => {
  const db = await openDB();
  const books = await db.all("SELECT * FROM books ORDER BY id DESC");
  res.json(books);
});

// Книги за категорією
router.get("/category/:name", async (req, res) => {
  const db = await openDB();
  const books = await db.all(
    "SELECT * FROM books WHERE category = ? ORDER BY id DESC",
    [req.params.name]
  );
  res.json(books);
});

// Категорії з кількістю
router.get("/../../api/categories", async (req, res) => {
  const db = await openDB();
  const rows = await db.all(
    "SELECT category AS name, COUNT(*) AS count FROM books GROUP BY category"
  );
  res.json(rows);
});

// Додавання книги
router.post("/add", async (req, res) => {
  const { title, author, category, condition, added_by, cover } = req.body;
  if (!title) return res.status(400).json({ error: "Назва обов’язкова" });

  const db = await openDB();
  await db.run(
    "INSERT INTO books (title, author, category, condition, added_by, cover) VALUES (?, ?, ?, ?, ?, ?)",
    [title, author, category, condition, added_by, cover]
  );
  res.json({ message: "Книгу додано" });
});

export default router;
