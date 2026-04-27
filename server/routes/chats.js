import express from "express";
import {
  getUserChats, getChatMessages, startChat, sendMessage, rateChat,
} from "../controllers/chatController.js";
import { uploadMsgImage } from "../middlewares/upload.js";

const router = express.Router();

router.get("/",               getUserChats);
router.get("/:id/messages",   getChatMessages);
router.post("/start",         startChat);
router.post("/:id/messages",  uploadMsgImage.single("image"), sendMessage);
router.post("/:id/rate",      rateChat);

export default router;
