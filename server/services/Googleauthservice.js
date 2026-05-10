import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import {
  findUserByGoogleId,
  findUserByEmail,
  createGoogleUser,
  linkGoogleId,
} from "../models/userModel.js";

export function initGoogleAuth() {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/users/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email    = profile.emails?.[0]?.value;
          const name     = profile.displayName;
          const avatar   = profile.photos?.[0]?.value;

          // Шукаємо за google_id
          let user = await findUserByGoogleId(googleId);
          if (user) return done(null, user);

          // Є акаунт з таким email — прив'язуємо google_id
          if (email) {
            const existing = await findUserByEmail(email);
            if (existing) {
              await linkGoogleId(existing.id, googleId);
              return done(null, { id: existing.id, name: existing.name, email: existing.email, avatar: existing.avatar });
            }
          }

          // Створюємо новий акаунт
          user = await createGoogleUser(name, email, googleId, avatar);
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
}