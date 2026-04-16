// server/server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import booksRouter from "./routes/books.js";
import usersRouter from "./routes/users.js";

const app = express();
const PORT = 3000;

// потрібно, щоб можна було використовувати __dirname у ES-модулі
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Підключаємо статичний фронтенд (client/)
app.use(express.static(path.join(__dirname, "../client")));

// Роутинг API
app.use("/api/books", booksRouter);
app.use("/api/users", usersRouter);

// Всі інші шляхи -> index.html (щоб роутер працював при прямому вводі посилань)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});
import { initDB } from "./db.js";
// ...
// Ініціалізуємо БД перед запуском сервера
await initDB();

app.listen(PORT, () => {
  console.log(`✅ Сервер запущено: http://localhost:${PORT}`);
});
