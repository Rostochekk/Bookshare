import { initNavbar } from "../modules/navbar.js";
import { usersApi }  from "../api/users.js";
import { auth }      from "../core/router.js";

initNavbar();

if (auth.isLoggedIn()) window.location.href = "index.html";

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

  if (!email || !password) { showError("Введіть email і пароль"); return; }

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
