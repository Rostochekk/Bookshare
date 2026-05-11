import bcrypt  from "bcrypt";
import crypto  from "crypto";
import {
  findUserByEmail,
  createUser,
  saveResetToken,
  findResetToken,
  updateUserPassword,
} from "../models/userModel.js";
import { sendPasswordResetEmail } from "./emailService.js";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export async function registerUser(name, email, password) {
  if (!name || !email || !password)
    throw { status: 400, message: "Всі поля обов'язкові" };

  if (!isValidEmail(email))
    throw { status: 400, message: "Невірний формат електронної пошти" };

  if (password.length < 6)
    throw { status: 400, message: "Пароль мінімум 6 символів" };

  const existing = await findUserByEmail(email);
  if (existing)
    throw { status: 409, message: "Email вже використовується" };

  const passwordHash = await bcrypt.hash(password, 10);
  return createUser(name, email, passwordHash);
}

export async function loginUser(email, password) {
  if (!email || !password)
    throw { status: 400, message: "Email та пароль обов'язкові" };

  if (!isValidEmail(email))
    throw { status: 400, message: "Невірний формат електронної пошти" };

  const user = await findUserByEmail(email);  // ← тільки один раз
  if (!user)
    throw { status: 401, message: "Невірний email або пароль" };

  if (user.role === "banned")
    throw { status: 403, message: "Ваш акаунт заблоковано" };

  if (!user.password_hash)
    throw { status: 401, message: "Цей акаунт використовує вхід через Google" };

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok)
    throw { status: 401, message: "Невірний email або пароль" };

  const { password_hash: _, google_id: __, ...safeUser } = user;
  return safeUser;
}

export async function requestPasswordReset(email) {
  if (!email)
    throw { status: 400, message: "Email обов'язковий" };

  if (!isValidEmail(email))
    throw { status: 400, message: "Невірний формат електронної пошти" };

  const user = await findUserByEmail(email);
  if (!user) return; // Не розкриваємо чи існує email

  const token     = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 година

  await saveResetToken(user.id, token, expiresAt);
  await sendPasswordResetEmail(email, token);
}

export async function resetPassword(token, newPassword) {
  if (!token || !newPassword)
    throw { status: 400, message: "Токен та новий пароль обов'язкові" };

  if (newPassword.length < 6)
    throw { status: 400, message: "Пароль мінімум 6 символів" };

  const record = await findResetToken(token);
  if (!record)
    throw { status: 400, message: "Посилання недійсне або термін дії закінчився" };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(record.user_id, passwordHash);
}