// client/js/profile.js
import { auth, booksApi, CATEGORY_LABELS, CONDITION_LABELS } from "./api.js";
import "./main.js";

// ── Захист сторінки ────────────────────────────────────────
if (!auth.requireAuth()) throw new Error("redirect");

const user = auth.getUser();

// ════════════════════════════════════════════════════════════
//  ТОСТ (замість alert)
// ════════════════════════════════════════════════════════════

function showToast(message, type = "success") {
  // Видаляємо попередній якщо є
  document.querySelector(".bs-toast")?.remove();

  const toast = document.createElement("div");
  toast.className = `bs-toast bs-toast--${type}`;
  toast.innerHTML = `
    <span class="bs-toast__icon">
      ${type === "success"
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      }
    </span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  // Анімація появи
  requestAnimationFrame(() => toast.classList.add("bs-toast--visible"));

  // Автоприховування
  setTimeout(() => {
    toast.classList.remove("bs-toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ════════════════════════════════════════════════════════════
//  КАСТОМНА МОДАЛКА ПІДТВЕРДЖЕННЯ (замість confirm)
// ════════════════════════════════════════════════════════════

function showConfirm({ title, message, confirmText = "Видалити", onConfirm }) {
  document.querySelector(".bs-modal-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "bs-modal-overlay";
  overlay.innerHTML = `
    <div class="bs-modal">
      <div class="bs-modal__icon bs-modal__icon--danger">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </div>
      <h3 class="bs-modal__title">${title}</h3>
      <p class="bs-modal__message">${message}</p>
      <div class="bs-modal__actions">
        <button class="bs-modal__cancel">Скасувати</button>
        <button class="bs-modal__confirm">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("bs-modal-overlay--visible"));

  const close = () => {
    overlay.classList.remove("bs-modal-overlay--visible");
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector(".bs-modal__cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector(".bs-modal__confirm").addEventListener("click", () => {
    close();
    onConfirm();
  });
}

// ════════════════════════════════════════════════════════════
//  ХЕЛПЕРИ
// ════════════════════════════════════════════════════════════

function pluralBooks(n) {
  if (n % 10 === 1 && n % 100 !== 11) return "книга";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "книги";
  return "книг";
}

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("uk-UA", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ════════════════════════════════════════════════════════════
//  АВАТАР
// ════════════════════════════════════════════════════════════

function renderAvatar(avatarUrl) {
  const img = document.getElementById("profileAvatar");
  if (!img) return;
  const name = encodeURIComponent(user.name || "User");
  img.src = avatarUrl || `https://ui-avatars.com/api/?name=${name}&background=00a870&color=fff&size=96`;
  img.onerror = () => {
    img.src = `https://ui-avatars.com/api/?name=${name}&background=00a870&color=fff&size=96`;
  };
}

document.getElementById("avatarInput")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    showToast("Файл занадто великий. Максимум 3 МБ.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("avatar", file);
  formData.append("user_id", user.id);

  try {
    const res  = await fetch("/api/users/avatar", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");

    const updated = { ...user, avatar: data.avatar };
    auth.setUser(updated);
    renderAvatar(data.avatar);
    showToast("Фото профілю оновлено");
  } catch (err) {
    showToast("Не вдалося завантажити фото: " + err.message, "error");
  }
});

// ════════════════════════════════════════════════════════════
//  КАРТКА КНИГИ
// ════════════════════════════════════════════════════════════

function buildProfileBookCard(book) {
  const catLabel  = CATEGORY_LABELS[book.category]  || book.category  || "—";
  const condClass = book.condition ? `condition-${book.condition}` : "";
  const condLabel = CONDITION_LABELS[book.condition] || book.condition || "—";
  const cover     = book.cover ||
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=120&h=120&fit=crop";
  const desc = book.description
    ? book.description.slice(0, 180) + (book.description.length > 180 ? "…" : "")
    : "Опис відсутній";

  return `
    <div class="profile-book-card" data-book-id="${book.id}">
      <img
        src="${cover}"
        alt="Обкладинка"
        class="profile-book-cover"
        onerror="this.src='https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=120&h=120&fit=crop'"
      />
      <div class="profile-book-info">
        <div class="profile-book-badges">
          <span class="category-badge">${catLabel}</span>
          <span class="condition-badge ${condClass}">${condLabel}</span>
        </div>
        <div class="profile-book-title">${book.title}</div>
        <div class="profile-book-author">${book.author || ""}</div>
        <div class="profile-book-desc">${desc}</div>
        <div class="profile-book-listed">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Додано ${formatDate(book.created_at)}
        </div>
      </div>
      <div class="profile-book-actions">
        <button class="btn-edit" data-edit-id="${book.id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Редагувати
        </button>
        <button class="btn-delete" data-delete-id="${book.id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Видалити
        </button>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
//  ЛІЧИЛЬНИК
// ════════════════════════════════════════════════════════════

function updateCounter(count) {
  const countEl = document.getElementById("booksCount");
  const statEl  = document.getElementById("statBooks");
  if (countEl) countEl.textContent = `${count} ${pluralBooks(count)} додано`;
  if (statEl)  statEl.textContent  = count;

  const emptyState = document.getElementById("emptyState");
  const booksList  = document.getElementById("booksList");
  if (emptyState) emptyState.style.display = count === 0 ? "block" : "none";
  if (booksList)  booksList.style.display  = count === 0 ? "none"  : "block";
}

// ════════════════════════════════════════════════════════════
//  КЛІКИ: edit / delete — без confirm(), без alert()
// ════════════════════════════════════════════════════════════

document.getElementById("booksList")?.addEventListener("click", (e) => {

  // ── Редагування ────────────────────────────────────────
  const editBtn = e.target.closest("[data-edit-id]");
  if (editBtn) {
    window.location.href = `add-book.html?edit=${editBtn.dataset.editId}`;
    return;
  }

  // ── Видалення — кастомна модалка замість confirm() ────
  const delBtn = e.target.closest("[data-delete-id]");
  if (delBtn) {
    const id = delBtn.dataset.deleteId;
    const cardTitle = document.querySelector(`[data-book-id="${id}"] .profile-book-title`)?.textContent || "цю книгу";

    showConfirm({
      title:       "Видалити книгу?",
      message:     `«${cardTitle}» буде видалено назавжди. Це не можна скасувати.`,
      confirmText: "Видалити",
      onConfirm:   () => deleteBook(id),
    });
  }
});

async function deleteBook(id) {
  const card = document.querySelector(`[data-book-id="${id}"]`);

  try {
    await booksApi.delete(id, user.id);

    if (card) {
      card.style.transition = "opacity 0.3s, transform 0.3s";
      card.style.opacity    = "0";
      card.style.transform  = "translateY(-6px)";
      setTimeout(() => {
        card.remove();
        const remaining = document.querySelectorAll(".profile-book-card").length;
        updateCounter(remaining);
      }, 300);
    }

    showToast("Книгу видалено");
  } catch (err) {
    showToast("Помилка видалення: " + err.message, "error");
  }
}

// ════════════════════════════════════════════════════════════
//  ЗАВАНТАЖЕННЯ ПРОФІЛЮ
// ════════════════════════════════════════════════════════════

async function loadProfile() {
  document.getElementById("profileName").textContent  = user.name  || "—";
  document.getElementById("profileEmail").textContent = user.email || "—";
  renderAvatar(user.avatar || null);

  try {
    const books = await booksApi.getMy(user.id);
    const list  = document.getElementById("booksList");

    updateCounter(books.length);
    if (books.length === 0) return;
    list.innerHTML = books.map(buildProfileBookCard).join("");
  } catch (err) {
    document.getElementById("booksList").innerHTML =
      `<p style="color:#c00;padding:20px">Не вдалося завантажити книги: ${err.message}</p>`;
  }
}

loadProfile();