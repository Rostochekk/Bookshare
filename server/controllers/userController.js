import { registerUser, loginUser, requestPasswordReset, resetPassword } from "../services/authService.js";
import { findUserById, getUserAvatar, updateUserAvatar } from "../models/userModel.js";
import { deleteFile } from "../utils/fileHelper.js";

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    const user = await registerUser(name, email, password);
    res.status(201).json({ message: "Реєстрація успішна", user });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await loginUser(email, password);
    res.json({ message: "Вхід успішний", user });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getMe(req, res) {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id обов'язковий" });
    const user = await findUserById(id);
    if (!user) return res.status(404).json({ error: "Користувача не знайдено" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function uploadAvatar(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "Файл не отримано" });
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id обов'язковий" });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const oldAvatar = await getUserAvatar(user_id);
    if (oldAvatar) deleteFile(oldAvatar);
    await updateUserAvatar(user_id, avatarUrl);
    res.json({ avatar: avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/users/forgot-password
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    await requestPasswordReset(email);
    res.json({ message: "Якщо такий email зареєстрований — лист надіслано" });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// POST /api/users/reset-password
export async function resetPasswordHandler(req, res) {
  try {
    const { token, password } = req.body;
    await resetPassword(token, password);
    res.json({ message: "Пароль успішно змінено" });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// Викликається після passport.authenticate("google")
export function googleCallback(req, res) {
  const user = req.user;
  if (!user) return res.redirect("/login.html?error=banned");
  const encoded = encodeURIComponent(JSON.stringify(user));
  res.redirect(`/login.html?google_user=${encoded}`);
}