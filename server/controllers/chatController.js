import { openDB }            from "../config/db.js";
import { buildAvatarUrl, formatChatForUser, shouldShowRating } from "../services/chatService.js";
import {
  getChatsByUser, getChatAccess, getMessagesByChatId,
  getMessageCount, getChatRating, findExistingChat,
  createChat, createMessage, upsertRating, markChatAsRead,
} from "../models/chatModel.js";

export async function getUserChats(req, res) {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id обов'язковий" });

    const chats  = await getChatsByUser(user_id);
    const result = chats.map(c => formatChatForUser(c, user_id));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getChatMessages(req, res) {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id обов'язковий" });

    const chat = await getChatAccess(req.params.id, user_id);
    if (!chat) return res.status(403).json({ error: "Доступ заборонено" });

    const messages = await getMessagesByChatId(req.params.id);
    const existing = await getChatRating(req.params.id, user_id);

    // Автоматично позначаємо як прочитане при завантаженні повідомлень
    await markChatAsRead(req.params.id, user_id);

    res.json({
      chat,
      messages: messages.map(m => ({
        ...m,
        sender_avatar: buildAvatarUrl(m.sender_name, m.sender_avatar, 32),
      })),
      total_count: messages.length,
      show_rating: shouldShowRating(messages.length, existing),
      my_rating:   existing?.rating || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function startChat(req, res) {
  try {
    const { book_id, buyer_id } = req.body;
    if (!book_id || !buyer_id)
      return res.status(400).json({ error: "book_id та buyer_id обов'язкові" });

    const db   = await openDB();
    const book = await db.get(
      "SELECT id, title, author, cover, owner_id FROM books WHERE id = ?",
      [book_id]
    );
    if (!book) return res.status(404).json({ error: "Книгу не знайдено" });
    if (String(book.owner_id) === String(buyer_id))
      return res.status(400).json({ error: "Не можна писати самому собі" });

    let chat  = await findExistingChat(book_id, buyer_id, book.owner_id);
    const isNew = !chat;

    if (isNew) {
      chat = await createChat(book_id, buyer_id, book.owner_id);
      const autoText = `Привіт! Мене цікавить ваша книга «${book.title}»${book.author ? ` (${book.author})` : ""}. Вона ще доступна?`;
      await createMessage(chat.id, buyer_id, autoText, book.cover, 1);
    }

    res.status(isNew ? 201 : 200).json({ chat_id: chat.id, is_new: isNew });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function sendMessage(req, res) {
  try {
    const { sender_id, text } = req.body;
    const image_path = req.file ? `/uploads/messages/${req.file.filename}` : null;

    if (!sender_id)
      return res.status(400).json({ error: "sender_id обов'язковий" });
    if (!text && !image_path)
      return res.status(400).json({ error: "Потрібен текст або фото" });

    const chat = await getChatAccess(req.params.id, sender_id);
    if (!chat) return res.status(403).json({ error: "Доступ заборонено" });

    const msg   = await createMessage(req.params.id, sender_id, text, image_path);
    const total = await getMessageCount(req.params.id);
    const rated = await getChatRating(req.params.id, sender_id);

    // Відправник автоматично прочитав своє ж повідомлення
    await markChatAsRead(req.params.id, sender_id);

    res.status(201).json({
      message: {
        ...msg,
        sender_avatar: buildAvatarUrl(msg.sender_name, msg.sender_avatar, 32),
      },
      show_rating: shouldShowRating(total, rated),
      total_count: total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function rateChat(req, res) {
  try {
    const { user_id, rating } = req.body;
    if (!user_id || !rating)
      return res.status(400).json({ error: "user_id та rating обов'язкові" });
    if (rating < 1 || rating > 5)
      return res.status(400).json({ error: "Рейтинг від 1 до 5" });

    const chat = await getChatAccess(req.params.id, user_id);
    if (!chat) return res.status(403).json({ error: "Доступ заборонено" });

    await upsertRating(req.params.id, user_id, rating);
    res.json({ message: "Дякуємо за оцінку!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}