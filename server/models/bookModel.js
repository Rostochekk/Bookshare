import { openDB } from "../config/db.js";

const WITH_OWNER = `
  SELECT b.*, u.name AS owner_name
  FROM books b
  LEFT JOIN users u ON u.id = b.owner_id
`;

export async function countBooks() {
  const db  = await openDB();
  const row = await db.get("SELECT COUNT(*) AS count FROM books");
  return row?.count ?? 0;
}

export async function getRecentBooks(limit = 4) {
  const db = await openDB();
  return db.all(`${WITH_OWNER} ORDER BY b.created_at DESC LIMIT ?`, [limit]);
}

export async function getBooksByOwner(ownerId) {
  const db = await openDB();
  return db.all(
    `${WITH_OWNER} WHERE b.owner_id = ? ORDER BY b.created_at DESC`,
    [ownerId]
  );
}

export async function getCategoryStats() {
  const db = await openDB();
  return db.all(
    "SELECT category AS name, COUNT(*) AS count FROM books GROUP BY category"
  );
}

export async function getAllBooks({ category, condition, search } = {}) {
  let sql    = `${WITH_OWNER} WHERE 1=1`;
  const params = [];

  if (category) {
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
  return db.all(sql, params);
}

export async function getBookById(id) {
  const db = await openDB();
  return db.get(`${WITH_OWNER} WHERE b.id = ?`, [id]);
}

export async function getRelatedBooks(bookId, category) {
  const db = await openDB();
  return db.all(
    `${WITH_OWNER} WHERE b.category = ? AND b.id != ? ORDER BY b.created_at DESC LIMIT 3`,
    [category, bookId]
  );
}

export async function getBookOwnerAndCover(id) {
  const db = await openDB();
  return db.get(
    "SELECT id, owner_id, cover FROM books WHERE id = ?",
    [id]
  );
}

export async function createBook({ title, author, category, condition, description, owner_id, cover }) {
  const db     = await openDB();
  const result = await db.run(
    `INSERT INTO books (title, author, category, condition, description, owner_id, cover)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, author, category, condition, description, owner_id, cover || null]
  );
  return db.get(`${WITH_OWNER} WHERE b.id = ?`, [result.lastID]);
}

export async function updateBook(id, { title, author, category, condition, description, cover }) {
  const db = await openDB();
  await db.run(
    `UPDATE books SET title=?, author=?, category=?, condition=?, description=?, cover=?
     WHERE id=?`,
    [title, author, category, condition, description, cover, id]
  );
  return db.get(`${WITH_OWNER} WHERE b.id = ?`, [id]);
}

export async function deleteBookById(id) {
  const db = await openDB();
  await db.run("DELETE FROM books WHERE id = ?", [id]);
}
