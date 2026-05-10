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
  const name     = document.querySelector('input[type="text"]').value.trim();
  const email    = document.querySelector('input[type="email"]').value.trim();
  const password = document.getElementById("regPassword").value;
  const confirm  = document.getElementById("regPasswordConfirm").value;
  const btn      = document.querySelector(".auth-submit-btn");

  clearError();

  if (!name || !email || !password) { showError("Заповніть усі поля"); return; }
  if (!isValidEmail(email))          { showError("Невірний формат електронної пошти"); return; }
  if (password !== confirm)          { showError("Паролі не збігаються"); return; }
  if (password.length < 6)           { showError("Пароль мінімум 6 символів"); return; }

  btn.disabled    = true;
  btn.textContent = "Реєстрація...";

  try {
    await usersApi.register(name, email, password);
    window.location.href = "index.html";
  } catch (err) {
    showError(err.message);
    btn.disabled    = false;
    btn.textContent = "Створити акаунт";
  }
});

// Обробка редіректу після Google OAuth (якщо хтось потрапить сюди)
const params     = new URLSearchParams(window.location.search);
const googleUser = params.get("google_user");
if (googleUser) {
  try {
    const user = JSON.parse(decodeURIComponent(googleUser));
    auth.setUser(user); 
    window.location.href = "index.html";
  } catch (_) {}
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