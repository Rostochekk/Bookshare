// client/js/profile.js
import { auth, booksApi, CATEGORY_LABELS, CONDITION_LABELS } from "./api.js";

// ── Захист сторінки ──────────────────────────────────────────
if (!auth.requireAuth()) throw new Error("redirect");

const user = auth.getUser();

// ── Заповнюємо профіль ───────────────────────────────────────
document.getElementById("profileName").textContent  = user.name;
document.getElementById("profileEmail").textContent = user.email;
document.getElementById("profileAvatar").src =
  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=00a870&color=fff&size=96`;

// Статистика
async function loadStats() {
  try {
    const fresh = await booksApi.getMy(user.id);
    document.getElementById("statBooks").textContent    = fresh.length;
    document.getElementById("statExchanged").textContent = user.exchanged ?? 0;
    document.getElementById("statRating").textContent    = user.rating ?? "—";
    document.getElementById("booksCount").textContent    =
      `${fresh.length} ${pluralBooks(fresh.length)} додано`;
    return fresh;
  } catch {
    return [];
  }
}

// ── Рендер книг ──────────────────────────────────────────────
function renderBooks(books) {
  const list      = document.getElementById("booksList");
  const emptyState = document.getElementById("emptyState");

  if (!books.length) {
    list.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  list.innerHTML = books.map(b => {
    const catLabel  = CATEGORY_LABELS[b.category]  || b.category  || "—";
    const condClass = b.condition ? `condition-${b.condition}` : "";
    const condLabel = CONDITION_LABELS[b.condition] || b.condition || "—";
    const cover     = b.cover || "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=120&h=120&fit=crop";
    const date      = b.created_at
      ? new Date(b.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "short", year: "numeric" })
      : "";

    return `
      <div class="profile-book-card" data-book-id="${b.id}">
        <img src="${cover}" alt="${b.title}" class="profile-book-cover"
          onerror="this.src='https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=120&h=120&fit=crop'">
        <div class="profile-book-info">
          <div class="profile-book-badges">
            <span class="category-badge">${catLabel}</span>
            <span class="condition-badge ${condClass}">${condLabel}</span>
          </div>
          <div class="profile-book-title">${b.title}</div>
          <div class="profile-book-author">${b.author || ""}</div>
          <div class="profile-book-desc">${b.description || ""}</div>
          ${date ? `<div class="profile-book-listed">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            Додано ${date}
          </div>` : ""}
        </div>
        <div class="profile-book-actions">
          <button class="btn-edit" onclick="editBook(${b.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Редагувати
          </button>
          <button class="btn-delete" onclick="deleteBook(${b.id})">
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
  }).join("");
}

// ── Редагувати ───────────────────────────────────────────────
window.editBook = function(id) {
  window.location.href = `/add-book.html?edit=${id}`;
};

// ── Видалити ─────────────────────────────────────────────────
window.deleteBook = async function(id) {
  if (!confirm("Ви впевнені, що хочете видалити цю книгу?")) return;

  const card = document.querySelector(`[data-book-id="${id}"]`);
  if (card) {
    card.style.opacity = "0";
    card.style.transition = "opacity 0.3s ease";
  }

  try {
    await booksApi.delete(id, user.id);
    setTimeout(async () => {
      card?.remove();
      const books = await booksApi.getMy(user.id);
      document.getElementById("statBooks").textContent = books.length;
      document.getElementById("booksCount").textContent =
        `${books.length} ${pluralBooks(books.length)} додано`;
      if (!books.length) {
        document.getElementById("emptyState").style.display = "block";
      }
    }, 300);
  } catch (err) {
    if (card) card.style.opacity = "1";
    alert("Помилка видалення: " + err.message);
  }
};

// ── Утиліта ──────────────────────────────────────────────────
function pluralBooks(n) {
  if (n % 10 === 1 && n % 100 !== 11) return "книга";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "книги";
  return "книг";
}

// ── Запуск ───────────────────────────────────────────────────
loadStats().then(renderBooks);