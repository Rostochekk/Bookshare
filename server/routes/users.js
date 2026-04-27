import express from "express";
import { register, login, getMe, uploadAvatar } from "../controllers/userController.js";
import { uploadAvatar as avatarUpload }          from "../middlewares/upload.js";

const router = express.Router();

router.post("/register", register);
router.post("/login",    login);
router.get("/me",        getMe);
router.post("/avatar",   avatarUpload.single("avatar"), uploadAvatar);

export default router;
