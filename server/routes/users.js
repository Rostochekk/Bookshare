import express  from "express";
import passport from "passport";
import {
  register,
  login,
  getMe,
  uploadAvatar,
  forgotPassword,
  resetPasswordHandler,
  googleCallback,
} from "../controllers/userController.js";
import { uploadAvatar as avatarUpload } from "../middlewares/upload.js";

const router = express.Router();

// Стандартна авторизація
router.post("/register",        register);
router.post("/login",           login);
router.get("/me",               getMe);
router.post("/avatar",          avatarUpload.single("avatar"), uploadAvatar);

// Скидання паролю
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPasswordHandler);

// Google OAuth
router.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);
router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login.html?error=google", session: false }),
  googleCallback
);

export default router;