import express from "express";
import {
  uploadCover, getCount, getRecent, getMy, getCategories,
  getAll, getById, getRelated, addBook, editBook, removeBook,
} from "../controllers/bookController.js";
import { uploadCover as coverUpload } from "../middlewares/upload.js";

const router = express.Router();

router.post("/upload-cover",       coverUpload.single("cover"), uploadCover);
router.get("/count",               getCount);
router.get("/recent",              getRecent);
router.get("/my",                  getMy);
router.get("/categories",          getCategories);
router.get("/all",                 getAll);
router.get("/:id(\\d+)",           getById);
router.get("/:id(\\d+)/related",   getRelated);
router.post("/add",                addBook);
router.put("/:id(\\d+)",           editBook);
router.delete("/:id(\\d+)",        removeBook);

export default router;
