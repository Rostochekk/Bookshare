// server/routes/users.js
import express from "express";
import multer  from "multer";
import path    from "path";
import fs      from "fs";
import bcrypt  from "bcrypt";
import { fileURLToPath } from "url";
import { openDB } from "../db.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Папка для аватарів ────────────────────────────────────
const AVATARS_DIR = path.join(__dirname, "../../client/uploads/avatars");
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename:    (_req,  file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${Date.now()}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// ════════════════════════════════════════════════════════════
//  POST /api/users/register
// ════════════════════════════════════════════════════════════
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "Всі поля обов'язкові" });
  if (password.length < 6)
    return res.status(400).json({ error: "Пароль мінімум 6 символів" });

  const db = await openDB();
  const existing = await db.get("SELECT id FROM users WHERE email = ?", [email]);
  if (existing)
    return res.status(409).json({ error: "Email вже використовується" });

  const password_hash = await bcrypt.hash(password, 10);
  const result = await db.run(
    "INSERT INTO users (name, email, password_hash, avatar) VALUES (?, ?, ?, NULL)",
    [name, email, password_hash]
  );

  const user = await db.get(
    "SELECT id, name, email, avatar FROM users WHERE id = ?",
    [result.lastID]
  );
  res.status(201).json({ message: "Реєстрація успішна", user });
});

// ════════════════════════════════════════════════════════════
//  POST /api/users/login
// ════════════════════════════════════════════════════════════
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email та пароль обов'язкові" });

  const db   = await openDB();
  const user = await db.get(
    "SELECT id, name, email, avatar, password_hash FROM users WHERE email = ?",
    [email]
  );

  if (!user)
    return res.status(401).json({ error: "Невірний email або пароль" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok)
    return res.status(401).json({ error: "Невірний email або пароль" });

  const { password_hash: _, ...safeUser } = user;
  res.json({ message: "Вхід успішний", user: safeUser });
});

// ════════════════════════════════════════════════════════════
//  GET /api/users/me?id=5
// ════════════════════════════════════════════════════════════
router.get("/me", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id обов'язковий" });

  const db   = await openDB();
  const user = await db.get(
    "SELECT id, name, email, avatar FROM users WHERE id = ?", [id]
  );
  if (!user) return res.status(404).json({ error: "Користувача не знайдено" });
  res.json(user);
});

// ════════════════════════════════════════════════════════════
//  POST /api/users/avatar
//  FormData: { avatar: File, user_id: number }
// ════════════════════════════════════════════════════════════
router.post("/avatar", uploadAvatar.single("avatar"), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: "Файл не отримано" });

  const { user_id } = req.body;
  if (!user_id)
    return res.status(400).json({ error: "user_id обов'язковий" });

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const db = await openDB();

  // Видаляємо старий аватар з диску
  const old = await db.get("SELECT avatar FROM users WHERE id = ?", [user_id]);
  if (old?.avatar) {
    const oldPath = path.join(__dirname, "../../client", old.avatar);
    if (fs.existsSync(oldPath)) {
      try { fs.unlinkSync(oldPath); } catch {}
    }
  }

  await db.run("UPDATE users SET avatar = ? WHERE id = ?", [avatarUrl, user_id]);
  res.json({ avatar: avatarUrl });
});

export default router;