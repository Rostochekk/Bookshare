// server/server.js
import express from "express";
import cors    from "cors";
import path    from "path";
import { fileURLToPath } from "url";
import { initDB } from "./db.js";
import booksRouter from "./routes/books.js";
import usersRouter from "./routes/users.js";
import chatsRouter from "./routes/chats.js";

const app  = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Статика ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../client")));

// ── API ───────────────────────────────────────────────────
app.use("/api/books", booksRouter);
app.use("/api/users", usersRouter);
app.use("/api/chats", chatsRouter);

// ── SPA fallback ──────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// ── Старт ─────────────────────────────────────────────────
await initDB();
app.listen(PORT, () => {
  console.log(`✅ Сервер: http://localhost:${PORT}`);
});