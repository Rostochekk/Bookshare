import express from "express";
import cors    from "cors";
import path    from "path";
import { fileURLToPath } from "url";
import booksRouter from "./routes/books.js";
import usersRouter from "./routes/users.js";
import chatsRouter from "./routes/chats.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../client")));

app.use("/api/books", booksRouter);
app.use("/api/users", usersRouter);
app.use("/api/chats", chatsRouter);

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

export default app;
