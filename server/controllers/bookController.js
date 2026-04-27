import { withDefaultCover, withDefaultCovers } from "../services/bookService.js";
import { deleteFile }                          from "../utils/fileHelper.js";
import {
  countBooks, getRecentBooks, getBooksByOwner, getCategoryStats,
  getAllBooks, getBookById, getRelatedBooks, getBookOwnerAndCover,
  createBook, updateBook, deleteBookById,
} from "../models/bookModel.js";

export async function uploadCover(req, res) {
  if (!req.file) return res.status(400).json({ error: "Файл не отримано" });
  res.json({ cover: `/uploads/covers/${req.file.filename}` });
}

export async function getCount(req, res) {
  try {
    const count = await countBooks();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getRecent(req, res) {
  try {
    const books = await getRecentBooks();
    res.json(withDefaultCovers(books));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMy(req, res) {
  try {
    const { owner_id } = req.query;
    if (!owner_id) return res.status(400).json({ error: "owner_id обов'язковий" });
    const books = await getBooksByOwner(owner_id);
    res.json(withDefaultCovers(books));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCategories(req, res) {
  try {
    const rows = await getCategoryStats();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAll(req, res) {
  try {
    const books = await getAllBooks(req.query);
    res.json(withDefaultCovers(books));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getById(req, res) {
  try {
    const book = await getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: "Книгу не знайдено" });
    res.json(withDefaultCover(book));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getRelated(req, res) {
  try {
    const book = await getBookById(req.params.id);
    if (!book) return res.json([]);
    const related = await getRelatedBooks(req.params.id, book.category);
    res.json(withDefaultCovers(related));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addBook(req, res) {
  try {
    const { title, author, category, condition, description, owner_id, cover } = req.body;
    if (!title)    return res.status(400).json({ error: "Назва обов'язкова" });
    if (!owner_id) return res.status(400).json({ error: "owner_id обов'язковий" });
    const book = await createBook({ title, author, category, condition, description, owner_id, cover });
    res.status(201).json({ message: "Книгу додано", book: withDefaultCover(book) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function editBook(req, res) {
  try {
    const { title, author, category, condition, description, cover, owner_id } = req.body;
    const existing = await getBookOwnerAndCover(req.params.id);
    if (!existing) return res.status(404).json({ error: "Книгу не знайдено" });
    if (String(existing.owner_id) !== String(owner_id))
      return res.status(403).json({ error: "Немає прав на редагування" });

    if (cover && existing.cover && existing.cover !== cover)
      deleteFile(existing.cover);

    const book = await updateBook(req.params.id, {
      title, author, category, condition, description,
      cover: cover ?? existing.cover,
    });
    res.json({ message: "Книгу оновлено", book: withDefaultCover(book) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function removeBook(req, res) {
  try {
    const owner_id = req.body?.owner_id || req.query?.owner_id;
    const existing = await getBookOwnerAndCover(req.params.id);
    if (!existing) return res.status(404).json({ error: "Книгу не знайдено" });
    if (String(existing.owner_id) !== String(owner_id))
      return res.status(403).json({ error: "Немає прав на видалення" });

    deleteFile(existing.cover);
    await deleteBookById(req.params.id);
    res.json({ message: "Книгу видалено" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
