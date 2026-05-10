import { initNavbar } from "../modules/navbar.js";
import { usersApi }  from "../api/users.js";
import { auth }      from "../core/router.js";

initNavbar();

if (auth.isLoggedIn()) window.location.href = "index.html";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

window.togglePassword = function(id, btn) {
  const input  = document.getElementById(id);
  const isText = input.type === "text";
  input.type = isText ? "password" : "text";
  btn.querySelector("svg").style.stroke = isText ? "#aaa" : "#00a870";
};

document.querySelector(".auth-submit-btn").addEventListener("click", async () => {
  const email    = document.querySelector('input[type="email"]').value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn      = document.querySelector(".auth-submit-btn");

  clearError();

  if (!email || !password)  { showError("Введіть email і пароль"); return; }
  if (!isValidEmail(email)) { showError("Невірний формат електронної пошти"); return; }

  btn.disabled    = true;
  btn.textContent = "Вхід...";

  try {
    await usersApi.login(email, password);
    window.location.href = "index.html";
  } catch (err) {
    showError(err.message);
    btn.disabled    = false;
    btn.textContent = "Увійти";
  }
});

// Кнопка Google
document.getElementById("google-login-btn")?.addEventListener("click", () => {
  window.location.href = "/api/users/auth/google";
});

// Обробка редіректу після Google OAuth
const params      = new URLSearchParams(window.location.search);
const googleUser  = params.get("google_user");
const googleError = params.get("error");

if (googleUser) {
  console.log("googleUser raw:", googleUser);
  try {
    const user = JSON.parse(googleUser);
    auth.setUser(user);
    window.location.href = "index.html";
  } catch (_) {
    try {
      const user = JSON.parse(decodeURIComponent(googleUser));
      auth.setUser(user);
      window.location.href = "index.html";
    } catch (_) {
      showError("Помилка входу через Google");
    }
  }
}
if (googleError === "google") {
  showError("Не вдалося увійти через Google. Спробуйте ще раз.");
}

function showError(msg) {
  let errEl = document.getElementById("auth-error");
  if (!errEl) {
    errEl = document.createElement("p");
    errEl.id = "auth-error";
    errEl.style.cssText = "color:#e53935;font-size:14px;margin-top:-10px;margin-bottom:16px;text-align:center;";
    document.querySelector(".auth-submit-btn").before(errEl);
  }
  errEl.textContent = msg;
}

function clearError() {
  const errEl = document.getElementById("auth-error");
  if (errEl) errEl.textContent = "";
}