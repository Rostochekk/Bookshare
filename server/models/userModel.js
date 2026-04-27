import { openDB } from "../config/db.js";

export async function findUserByEmail(email) {
  const db = await openDB();
  return db.get(
    "SELECT id, name, email, avatar, password_hash FROM users WHERE email = ?",
    [email]
  );
}

export async function findUserById(id) {
  const db = await openDB();
  return db.get(
    "SELECT id, name, email, avatar FROM users WHERE id = ?",
    [id]
  );
}

export async function createUser(name, email, passwordHash) {
  const db     = await openDB();
  const result = await db.run(
    "INSERT INTO users (name, email, password_hash, avatar) VALUES (?, ?, ?, NULL)",
    [name, email, passwordHash]
  );
  return db.get(
    "SELECT id, name, email, avatar FROM users WHERE id = ?",
    [result.lastID]
  );
}

export async function getUserAvatar(userId) {
  const db  = await openDB();
  const row = await db.get("SELECT avatar FROM users WHERE id = ?", [userId]);
  return row?.avatar || null;
}

export async function updateUserAvatar(userId, avatarUrl) {
  const db = await openDB();
  await db.run("UPDATE users SET avatar = ? WHERE id = ?", [avatarUrl, userId]);
}
