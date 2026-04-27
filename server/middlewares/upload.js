import multer from "multer";
import path   from "path";
import fs     from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

function createStorage(subdir, prefix) {
  const dir = path.join(__dirname, "../../client/uploads", subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename:    (_req,  file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${prefix}_${Date.now()}${ext}`);
    },
  });
}

function imageOnly(_req, file, cb) {
  cb(null, file.mimetype.startsWith("image/"));
}

export const uploadAvatar = multer({
  storage: createStorage("avatars", "avatar"),
  limits:  { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageOnly,
});

export const uploadCover = multer({
  storage: createStorage("covers", "cover"),
  limits:  { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageOnly,
});

export const uploadMsgImage = multer({
  storage: createStorage("messages", "msg"),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageOnly,
});
