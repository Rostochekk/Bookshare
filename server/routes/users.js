// server/routes/users.js
import express from "express";
import bcrypt from "bcrypt";
import { openDB } from "../db.js";

const router = express.Router();
const SALT_ROUNDS = 12;

// ─── Реєстрація ───────────────────────────────────────────────
// POST /api/users/register
// Body: { name, email, password }
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "Усі поля обов'язкові" });

  if (password.length < 6)
    return res.status(400).json({ error: "Пароль мінімум 6 символів" });

  try {
    const db = await openDB();

    const existing = await db.get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing)
      return res.status(409).json({ error: "Email вже використовується" });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await db.run(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, password_hash]
    );

    const user = await db.get(
      "SELECT id, name, email, exchanged, rating FROM users WHERE id = ?",
      [result.lastID]
    );
    res.status(201).json({ message: "Зареєстровано", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// ─── Вхід ─────────────────────────────────────────────────────
// POST /api/users/login
// Body: { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email і пароль обов'язкові" });

  try {
    const db = await openDB();
    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);

    if (!user)
      return res.status(401).json({ error: "Невірний email або пароль" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: "Невірний email або пароль" });

    // Повертаємо дані без хешу пароля
    const { password_hash, ...safeUser } = user;
    res.json({ message: "Успішний вхід", user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// ─── Поточний користувач (по id з query або body) ─────────────
// GET /api/users/me?id=5
router.get("/me", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id обов'язковий" });

  try {
    const db = await openDB();
    const user = await db.get(
      "SELECT id, name, email, exchanged, rating, created_at FROM users WHERE id = ?",
      [id]
    );
    if (!user) return res.status(404).json({ error: "Користувача не знайдено" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// ─── Список усіх (адмін / дебаг) ──────────────────────────────
router.get("/", async (req, res) => {
  const db = await openDB();
  const users = await db.all(
    "SELECT id, name, email, exchanged, rating, created_at FROM users"
  );
  res.json(users);
});

export default router;