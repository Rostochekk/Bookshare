// client/js/api.js
// ──────────────────────────────────────────────────────────────
//  Єдиний клієнтський API-модуль
//  Використовується на всіх сторінках
// ──────────────────────────────────────────────────────────────

const BASE = "/api";

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Помилка запиту");
  return data;
}

// ════════════════════════════════════════════════════════════
//  AUTH helpers (localStorage-based, без сесій на сервері)
// ════════════════════════════════════════════════════════════

export const auth = {
  /** Повертає об'єкт { id, name, email, ... } або null */
  getUser() {
    try {
      return JSON.parse(localStorage.getItem("bs_user")) || null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem("bs_user", JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem("bs_user");
    window.location.href = "/login.html";
  },

  isLoggedIn() {
    return Boolean(this.getUser());
  },

  /** Редіректить на login якщо не залогований */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = "/login.html";
      return false;
    }
    return true;
  },
};

// ════════════════════════════════════════════════════════════
//  Users API
// ════════════════════════════════════════════════════════════

export const usersApi = {
  async register(name, email, password) {
    const data = await request("/users/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    auth.setUser(data.user);
    return data;
  },

  async login(email, password) {
    const data = await request("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    auth.setUser(data.user);
    return data;
  },

  async getMe(id) {
    return request(`/users/me?id=${id}`);
  },
};

// ════════════════════════════════════════════════════════════
//  Books API
// ════════════════════════════════════════════════════════════

export const booksApi = {
  async getCount() {
    return request("/books/count");
  },

  async getRecent() {
    return request("/books/recent");
  },

  /** @param {{ category?, condition?, search? }} filters */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category)  params.set("category",  filters.category);
    if (filters.condition) params.set("condition", filters.condition);
    if (filters.search)    params.set("search",    filters.search);
    const qs = params.toString();
    return request(`/books/all${qs ? "?" + qs : ""}`);
  },

  async getById(id) {
    return request(`/books/${id}`);
  },

  async getRelated(id) {
    return request(`/books/${id}/related`);
  },

  async getMy(ownerId) {
    return request(`/books/my?owner_id=${ownerId}`);
  },

  async getCategories() {
    return request("/books/categories");
  },

  async add(bookData) {
    return request("/books/add", {
      method: "POST",
      body: JSON.stringify(bookData),
    });
  },

  async update(id, bookData) {
    return request(`/books/${id}`, {
      method: "PUT",
      body: JSON.stringify(bookData),
    });
  },

  async delete(id, ownerId) {
    return request(`/books/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ owner_id: ownerId }),
    });
  },
};

// ════════════════════════════════════════════════════════════
//  Утиліти для карток книг
// ════════════════════════════════════════════════════════════

// Мапи: англійський slug → українська назва
export const CATEGORY_LABELS = {
  educational:   "Навчальна",
  fiction:       "Художня",
  technical:     "Технічна",
  science:       "Наукова",
  literature:    "Література",
  history:       "Історія",
  mathematics:   "Математика",
  programming:   "Програмування",
};

export const CONDITION_LABELS = {
  likenew:    "Як нова",
  verygood:   "Дуже добрий",
  good:       "Добрий",
  acceptable: "Прийнятний",
  fair:       "Задовільний",
};

/** Будує HTML картки книги (для index та browse) */
export function buildBookCard(book, requireLogin = false) {
  const catLabel  = CATEGORY_LABELS[book.category]  || book.category  || "—";
  const condClass = book.condition ? `condition-${book.condition}` : "";
  const condLabel = CONDITION_LABELS[book.condition] || book.condition || "—";
  const cover     = book.cover || "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=280&fit=crop";
  const owner     = book.owner_name || "—";

  const href = requireLogin
    ? `javascript:void(0)" data-book-id="${book.id}" data-require-auth="1`
    : `book-info.html?id=${book.id}`;

  return `
    <div class="book-card" onclick="openBook(${book.id})" data-id="${book.id}">
      <img class="cover" src="${cover}" alt="${book.title}" onerror="this.src='https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=280&fit=crop'">
      <div class="book-card-body">
        <div class="book-card-top">
          <h3 class="book-title">${book.title}</h3>
          <span class="condition-badge ${condClass}">${condLabel}</span>
        </div>
        <p class="book-author">${book.author || ""}</p>
        <div class="book-card-footer">
          <span class="tag">${catLabel}</span>
          <span class="book-owner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            ${owner}
          </span>
        </div>
      </div>
    </div>
  `;
}

/** Глобальний обробник кліку по картці — перевіряє авторизацію */
window.openBook = function(id) {
  const user = auth.getUser();
  if (!user) {
    window.location.href = "/login.html";
    return;
  }
  window.location.href = `/book-info.html?id=${id}`;
};