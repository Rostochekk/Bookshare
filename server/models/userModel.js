import { openDB } from "../config/db.js";

export async function findUserByEmail(email) {
  const db = await openDB();
  return db.get(
    "SELECT id, name, email, avatar, password_hash, google_id FROM users WHERE email = ?",
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

export async function findUserByGoogleId(googleId) {
  const db = await openDB();
  return db.get(
    "SELECT id, name, email, avatar FROM users WHERE google_id = ?",
    [googleId]
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

export async function createGoogleUser(name, email, googleId, avatar) {
  const db     = await openDB();
  const result = await db.run(
    "INSERT INTO users (name, email, google_id, avatar, password_hash) VALUES (?, ?, ?, ?, NULL)",
    [name, email, googleId, avatar || null]
  );
  return db.get(
    "SELECT id, name, email, avatar FROM users WHERE id = ?",
    [result.lastID]
  );
}

export async function linkGoogleId(userId, googleId) {
  const db = await openDB();
  await db.run("UPDATE users SET google_id = ? WHERE id = ?", [googleId, userId]);
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

// --- Скидання паролю ---

export async function saveResetToken(userId, token, expiresAt) {
  const db = await openDB();
  await db.run("DELETE FROM password_resets WHERE user_id = ?", [userId]);
  await db.run(
    "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expiresAt]
  );
}

export async function findResetToken(token) {
  const db = await openDB();
  return db.get(
    "SELECT * FROM password_resets WHERE token = ? AND expires_at > ?",
    [token, Date.now()]
  );
}

export async function updateUserPassword(userId, passwordHash) {
  const db = await openDB();
  await db.run("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
  await db.run("DELETE FROM password_resets WHERE user_id = ?", [userId]);
}