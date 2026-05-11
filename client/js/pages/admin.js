import { initNavbar } from "../modules/navbar.js";
import { auth }       from "../core/router.js";

initNavbar();

const user = auth.getUser();
if (!user || user.role !== "admin") {
  window.location.href = "index.html";
  throw new Error("redirect");
}

const ME_ID = user.id;

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "x-user-id": ME_ID, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Помилка");
  return data;
}

// ── Статистика ────────────────────────────────────────────
async function loadStats() {
  try {
    const stats = await apiFetch("/api/users/admin/stats");
    document.getElementById("stat-users").textContent = stats.users;
    document.getElementById("stat-books").textContent = stats.books;
    document.getElementById("stat-chats").textContent = stats.chats;
  } catch {}
}

// ── Користувачі ───────────────────────────────────────────
async function loadUsers() {
  try {
    const users = await apiFetch("/api/users/admin/users");
    const tbody = document.getElementById("users-body");
    tbody.innerHTML = users.map(u => `
      <tr id="user-row-${u.id}">
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td><span class="role-badge role-${u.role || 'user'}">${u.role || 'user'}</span></td>
        <td>${new Date(u.created_at).toLocaleDateString("uk-UA")}</td>
        <td>
          <div class="btn-gap">
            ${u.role !== "admin" ? `<button class="admin-btn btn-ban" onclick="banUser(${u.id})">Заблокувати</button>` : ""}
            ${u.id !== ME_ID ? `<button class="admin-btn btn-delete" onclick="deleteUser(${u.id})">Видалити</button>` : ""}
          </div>
        </td>
      </tr>
    `).join("");
    document.getElementById("users-loading").style.display = "none";
    document.getElementById("users-table").style.display = "table";
  } catch (e) {
    document.getElementById("users-loading").textContent = "Помилка: " + e.message;
  }
}

window.banUser = async function(id) {
  if (!confirm("Заблокувати користувача?")) return;
  try {
    await apiFetch(`/api/users/admin/users/${id}/block`, { method: "PATCH" });
    const badge = document.querySelector(`#user-row-${id} .role-badge`);
    if (badge) { badge.className = "role-badge role-banned"; badge.textContent = "banned"; }
    const btnDiv = document.querySelector(`#user-row-${id} .btn-gap`);
    if (btnDiv) btnDiv.innerHTML = `
      <button class="admin-btn btn-ban" onclick="unbanUser(${id})">Розблокувати</button>
      <button class="admin-btn btn-delete" onclick="deleteUser(${id})">Видалити</button>
    `;
  } catch (e) { alert(e.message); }
};

window.unbanUser = async function(id) {
  if (!confirm("Розблокувати користувача?")) return;
  try {
    await apiFetch(`/api/users/admin/users/${id}/unblock`, { method: "PATCH" });
    const badge = document.querySelector(`#user-row-${id} .role-badge`);
    if (badge) { badge.className = "role-badge role-user"; badge.textContent = "user"; }
    const btnDiv = document.querySelector(`#user-row-${id} .btn-gap`);
    if (btnDiv) btnDiv.innerHTML = `
      <button class="admin-btn btn-ban" onclick="banUser(${id})">Заблокувати</button>
      <button class="admin-btn btn-delete" onclick="deleteUser(${id})">Видалити</button>
    `;
  } catch (e) { alert(e.message); }
};

// ── Книги ─────────────────────────────────────────────────
async function loadBooks() {
  try {
    const books = await apiFetch("/api/users/admin/books");
    const tbody = document.getElementById("books-body");
    tbody.innerHTML = books.map(b => `
      <tr id="book-row-${b.id}">
        <td>${b.id}</td>
        <td>${b.title}</td>
        <td>${b.author || "—"}</td>
        <td>${b.category || "—"}</td>
        <td>${b.owner_name || "—"}</td>
        <td>${new Date(b.created_at).toLocaleDateString("uk-UA")}</td>
        <td>
          <button class="admin-btn btn-delete" onclick="deleteBook(${b.id})">Видалити</button>
        </td>
      </tr>
    `).join("");
    document.getElementById("books-loading").style.display = "none";
    document.getElementById("books-table").style.display = "table";
  } catch (e) {
    document.getElementById("books-loading").textContent = "Помилка: " + e.message;
  }
}

window.deleteBook = async function(id) {
  if (!confirm("Видалити книгу?")) return;
  try {
    await apiFetch(`/api/users/admin/books/${id}`, { method: "DELETE" });
    document.getElementById(`book-row-${id}`)?.remove();
  } catch (e) { alert(e.message); }
};

// ── Таби ─────────────────────────────────────────────────
window.switchTab = function(tab) {
  document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
  document.getElementById(`section-${tab}`).classList.add("active");
  event.target.classList.add("active");
};

// ── Ініціалізація ─────────────────────────────────────────
loadStats();
loadUsers();
loadBooks();