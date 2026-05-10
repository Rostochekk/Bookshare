import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Завантаження .env без зовнішніх залежностей
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dirname, "../.env");
  const lines   = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch (_) {
  console.warn("⚠️  Файл .env не знайдено");
}

import { initDB } from "./config/db.js";
import app        from "./app.js";

const PORT = process.env.PORT || 3000;

await initDB();
app.listen(PORT, () => {
  console.log(`✅ Сервер: http://localhost:${PORT}`);
});