import bcrypt from "bcrypt";
import { findUserByEmail, createUser } from "../models/userModel.js";

export async function registerUser(name, email, password) {
  if (!name || !email || !password)
    throw { status: 400, message: "Всі поля обов'язкові" };
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

  const user = await findUserByEmail(email);
  if (!user)
    throw { status: 401, message: "Невірний email або пароль" };

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok)
    throw { status: 401, message: "Невірний email або пароль" };

  const { password_hash: _, ...safeUser } = user;
  return safeUser;
}
