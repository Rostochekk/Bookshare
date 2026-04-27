import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export function deleteFile(relativePath) {
  if (!relativePath || relativePath.startsWith("http")) return;
  const fullPath = path.join(__dirname, "../../client", relativePath);
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch {}
  }
}
