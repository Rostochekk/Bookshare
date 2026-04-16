// server/server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initDB } from "./db.js";
import booksRouter from "./routes/books.js";
import usersRouter from "./routes/users.js";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Статичний фронтенд ────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../client")));

// ─── API роути ─────────────────────────────────────────────────
app.use("/api/books", booksRouter);
app.use("/api/users", usersRouter);

// ─── SPA fallback ──────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// ─── Старт ────────────────────────────────────────────────────
await initDB();
app.listen(PORT, () => {
  console.log(`✅ Сервер запущено: http://localhost:${PORT}`);
});