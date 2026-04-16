// server/routes/books.js
import express from "express";
import { openDB } from "../db.js";

const router = express.Router();

// Хелпер: приєднуємо ім'я власника до книги
const WITH_OWNER = `
  SELECT b.*, u.name AS owner_name
  FROM books b
  LEFT JOIN users u ON u.id = b.owner_id
`;

// ─── Кількість книг ────────────────────────────────────────────
// GET /api/books/count
router.get("/count", async (req, res) => {
  const db = await openDB();
  const row = await db.get("SELECT COUNT(*) AS count FROM books");
  res.json({ count: row?.count ?? 0 });
});

// ─── Нещодавно додані (4 останні) ─────────────────────────────
// GET /api/books/recent
router.get("/recent", async (req, res) => {
  const db = await openDB();
  const books = await db.all(
    `${WITH_OWNER} ORDER BY b.created_at DESC LIMIT 4`
  );
  res.json(books);
});

// ─── Книги поточного користувача ──────────────────────────────
// GET /api/books/my?owner_id=5
router.get("/my", async (req, res) => {
  const { owner_id } = req.query;
  if (!owner_id) return res.status(400).json({ error: "owner_id обов'язковий" });

  const db = await openDB();
  const books = await db.all(
    `${WITH_OWNER} WHERE b.owner_id = ? ORDER BY b.created_at DESC`,
    [owner_id]
  );
  res.json(books);
});

// ─── Одна книга за id ──────────────────────────────────────────
// GET /api/books/:id
router.get("/:id(\\d+)", async (req, res) => {
  const db = await openDB();
  const book = await db.get(
    `${WITH_OWNER} WHERE b.id = ?`,
    [req.params.id]
  );
  if (!book) return res.status(404).json({ error: "Книгу не знайдено" });
  res.json(book);
});

// ─── Усі книги (з фільтрами) ───────────────────────────────────
// GET /api/books/all?category=technical&condition=good&search=python
router.get("/all", async (req, res) => {
  const { category, condition, search } = req.query;

  let sql = `${WITH_OWNER} WHERE 1=1`;
  const params = [];

  if (category) {
    // підтримка кількох категорій через кому: ?category=technical,programming
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

  const db = await openDB();
  const books = await db.all(sql, params);
  res.json(books);
});

// ─── Кількість по категоріях ───────────────────────────────────
// GET /api/books/categories
router.get("/categories", async (req, res) => {
  const db = await openDB();
  const rows = await db.all(
    "SELECT category AS name, COUNT(*) AS count FROM books GROUP BY category"
  );
  res.json(rows);
});

// ─── Схожі книги (та сама категорія, без поточної) ────────────
// GET /api/books/:id/related
router.get("/:id(\\d+)/related", async (req, res) => {
  const db = await openDB();
  const book = await db.get("SELECT category FROM books WHERE id = ?", [req.params.id]);
  if (!book) return res.json([]);

  const related = await db.all(
    `${WITH_OWNER} WHERE b.category = ? AND b.id != ? ORDER BY b.created_at DESC LIMIT 3`,
    [book.category, req.params.id]
  );
  res.json(related);
});

// ─── Додавання книги ───────────────────────────────────────────
// POST /api/books/add
// Body: { title, author, category, condition, description, owner_id, cover }
router.post("/add", async (req, res) => {
  const { title, author, category, condition, description, owner_id, cover } = req.body;

  if (!title) return res.status(400).json({ error: "Назва обов'язкова" });
  if (!owner_id) return res.status(400).json({ error: "owner_id обов'язковий" });

  const db = await openDB();
  const result = await db.run(
    `INSERT INTO books (title, author, category, condition, description, owner_id, cover)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, author, category, condition, description, owner_id, cover || null]
  );

  const book = await db.get(`${WITH_OWNER} WHERE b.id = ?`, [result.lastID]);
  res.status(201).json({ message: "Книгу додано", book });
});

// ─── Редагування книги ─────────────────────────────────────────
// PUT /api/books/:id
// Body: { title, author, category, condition, description, cover, owner_id }
router.put("/:id(\\d+)", async (req, res) => {
  const { title, author, category, condition, description, cover, owner_id } = req.body;

  const db = await openDB();
  const existing = await db.get(
    "SELECT id, owner_id FROM books WHERE id = ?",
    [req.params.id]
  );
  if (!existing) return res.status(404).json({ error: "Книгу не знайдено" });

  // Дозволяємо редагувати лише власнику
  if (String(existing.owner_id) !== String(owner_id))
    return res.status(403).json({ error: "Немає прав на редагування" });

  await db.run(
    `UPDATE books SET title=?, author=?, category=?, condition=?, description=?, cover=?
     WHERE id=?`,
    [title, author, category, condition, description, cover || null, req.params.id]
  );

  const book = await db.get(`${WITH_OWNER} WHERE b.id = ?`, [req.params.id]);
  res.json({ message: "Книгу оновлено", book });
});

// ─── Видалення книги ───────────────────────────────────────────
// DELETE /api/books/:id
// Body або query: { owner_id }
router.delete("/:id(\\d+)", async (req, res) => {
  const owner_id = req.body?.owner_id || req.query?.owner_id;

  const db = await openDB();
  const existing = await db.get(
    "SELECT id, owner_id FROM books WHERE id = ?",
    [req.params.id]
  );
  if (!existing) return res.status(404).json({ error: "Книгу не знайдено" });

  if (String(existing.owner_id) !== String(owner_id))
    return res.status(403).json({ error: "Немає прав на видалення" });

  await db.run("DELETE FROM books WHERE id = ?", [req.params.id]);
  res.json({ message: "Книгу видалено" });
});

export default router;