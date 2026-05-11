import { openDB } from "../config/db.js";
import express  from "express";
import passport from "passport";
import {
  register,
  login,
  getMe,
  uploadAvatar,
  forgotPassword,
  resetPasswordHandler,
  googleCallback,
} from "../controllers/userController.js";
import { uploadAvatar as avatarUpload } from "../middlewares/upload.js";

const router = express.Router();

// Стандартна авторизація
router.post("/register",        register);
router.post("/login",           login);
router.get("/me",               getMe);
router.post("/avatar",          avatarUpload.single("avatar"), uploadAvatar);

// Скидання паролю
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPasswordHandler);

// Google OAuth
router.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);
router.get("/auth/google/callback",
  passport.authenticate("google", { 
    failureRedirect: "/login.html?error=banned", // ← змінити з "google" на "banned"
    session: false 
  }),
  googleCallback
);
// ── Middleware перевірки адміна ──────────────────────────
async function requireAdmin(req, res, next) {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const db   = await openDB();
  const user = await db.get("SELECT role FROM users WHERE id=?", [userId]);
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
}

// ── Адмін роути ─────────────────────────────────────────
router.get("/admin/users", requireAdmin, async (req, res) => {
  const db    = await openDB();
  const users = await db.all("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC");
  res.json(users);
});

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  const db = await openDB();
  await db.run("DELETE FROM users WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

router.patch("/admin/users/:id/block", requireAdmin, async (req, res) => {
  const db = await openDB();
  await db.run("UPDATE users SET role='banned' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

router.get("/admin/books", requireAdmin, async (req, res) => {
  const db    = await openDB();
  const books = await db.all(`
    SELECT b.id, b.title, b.author, b.category, b.created_at, u.name as owner_name
    FROM books b LEFT JOIN users u ON b.owner_id = u.id
    ORDER BY b.created_at DESC
  `);
  res.json(books);
});

router.delete("/admin/books/:id", requireAdmin, async (req, res) => {
  const db = await openDB();
  await db.run("DELETE FROM books WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

router.get("/admin/stats", requireAdmin, async (req, res) => {
  const db = await openDB();
  const [users, books, chats] = await Promise.all([
    db.get("SELECT COUNT(*) as count FROM users"),
    db.get("SELECT COUNT(*) as count FROM books"),
    db.get("SELECT COUNT(*) as count FROM chats"),
  ]);
  res.json({ users: users.count, books: books.count, chats: chats.count });
});
router.patch("/admin/users/:id/unblock", requireAdmin, async (req, res) => {
  const db = await openDB();
  await db.run("UPDATE users SET role='user' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});
export default router;