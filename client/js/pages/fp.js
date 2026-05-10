import { initNavbar } from "../modules/navbar.js";

initNavbar();

const API = "/api/users";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

window.togglePassword = function(id, btn) {
  const input  = document.getElementById(id);
  const isText = input.type === "text";
  input.type = isText ? "password" : "text";
  btn.querySelector("svg").style.stroke = isText ? "#aaa" : "#00a870";
};

const params     = new URLSearchParams(window.location.search);
const resetToken = params.get("token");

const requestSection      = document.getElementById("request-section");
const sentSection         = document.getElementById("sent-section");
const resetSection        = document.getElementById("reset-section");
const resetSuccessSection = document.getElementById("reset-success-section");

if (resetToken) {
  requestSection.style.display = "none";
  resetSection.style.display   = "block";
} else {
  requestSection.style.display = "block";
}

// --- ЗАПИТ НА СКИДАННЯ ---
document.getElementById("fpSendBtn")?.addEventListener("click", async () => {
  const email = document.getElementById("fpEmail").value.trim();
  const btn   = document.getElementById("fpSendBtn");

  clearError();

  if (!email)               { showError("Введіть email"); return; }
  if (!isValidEmail(email)) { showError("Невірний формат електронної пошти"); return; }

  btn.disabled    = true;
  btn.textContent = "Надсилання...";

  try {
    await fetch(`${API}/forgot-password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email }),
    });
    requestSection.style.display = "none";
    sentSection.style.display    = "block";
  } catch (err) {
    showError("Помилка мережі. Спробуйте ще раз.");
    btn.disabled    = false;
    btn.textContent = "Надіслати посилання";
  }
});

// --- ВСТАНОВЛЕННЯ НОВОГО ПАРОЛЮ ---
document.getElementById("resetBtn")?.addEventListener("click", async () => {
  const password = document.getElementById("newPassword").value;
  const confirm  = document.getElementById("newPasswordConfirm").value;
  const btn      = document.getElementById("resetBtn");

  clearError();

  if (!password)            { showError("Введіть новий пароль"); return; }
  if (password.length < 6)  { showError("Пароль мінімум 6 символів"); return; }
  if (password !== confirm)  { showError("Паролі не збігаються"); return; }

  btn.disabled    = true;
  btn.textContent = "Збереження...";

  try {
    const res  = await fetch(`${API}/reset-password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token: resetToken, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Помилка скидання паролю");
      btn.disabled    = false;
      btn.textContent = "Змінити пароль";
      return;
    }

    resetSection.style.display        = "none";
    resetSuccessSection.style.display = "block";
  } catch (err) {
    showError("Помилка мережі. Спробуйте ще раз.");
    btn.disabled    = false;
    btn.textContent = "Змінити пароль";
  }
});

function showError(msg) {
  let errEl = document.getElementById("fp-error");
  if (!errEl) {
    errEl = document.createElement("p");
    errEl.id = "fp-error";
    errEl.style.cssText = "color:#e53935;font-size:14px;margin-top:-10px;margin-bottom:16px;text-align:center;";
    const activeBtn = document.getElementById("fpSendBtn") || document.getElementById("resetBtn");
    if (activeBtn) activeBtn.before(errEl);
  }
  errEl.textContent = msg;
}

function clearError() {
  const errEl = document.getElementById("fp-error");
  if (errEl) errEl.textContent = "";
}