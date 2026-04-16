// server/routes/users.js
import express from "express";
import { openDB } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const db = await openDB();
  const users = await db.all("SELECT * FROM users");
  res.json(users);
});

export default router;
