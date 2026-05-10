import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || "smtp.gmail.com",
  port:   parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to, resetToken) {
  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/fp.html?token=${resetToken}`;

  await transporter.sendMail({
    from:    `"BookShare" <${process.env.SMTP_USER}>`,
    to,
    subject: "Скидання паролю — BookShare",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden;">
        <div style="background:#00a870;padding:28px 32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">📚 BookShare</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1a1a1a;font-size:20px;margin-top:0;">Скидання паролю</h2>
          <p style="color:#555;line-height:1.6;">Ми отримали запит на скидання паролю. Натисніть кнопку нижче, щоб встановити новий пароль.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="background:#00a870;color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">
              Скинути пароль
            </a>
          </div>
          <p style="color:#888;font-size:13px;line-height:1.5;">Посилання дійсне протягом <strong>1 години</strong>. Якщо ви не запитували скидання — проігноруйте цей лист.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">© 2026 BookShare · Зроблено з ♥ для студентів</p>
        </div>
      </div>
    `,
  });
}