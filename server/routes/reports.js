import express from "express";
import { openDB } from '../config/db.js';

const router = express.Router();

// Надіслати скаргу
router.post("/", async (req, res) => {
  const { reporter_id, target_type, target_id, reason, comment } = req.body;
  if (!reporter_id || !target_type || !target_id || !reason)
    return res.status(400).json({ error: "Заповніть всі обов'язкові поля" });

  const db = await openDB();
  await db.run(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason, comment, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [reporter_id, target_type, target_id, reason, comment || ""]
  );
  res.json({ ok: true });
});

// Отримати всі скарги (тільки для адміна)
router.get("/", async (req, res) => {
  const db = await openDB();
  const reports = await db.all(`
    SELECT r.*, u.name as reporter_name
    FROM reports r
    LEFT JOIN users u ON u.id = r.reporter_id
    ORDER BY r.created_at DESC
  `);
  res.json(reports);
});

// Видалити скаргу
router.delete("/:id", async (req, res) => {
  const db = await openDB();
  await db.run("DELETE FROM reports WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

export default router;