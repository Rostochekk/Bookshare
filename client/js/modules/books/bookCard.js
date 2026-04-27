import { auth } from "../../core/router.js";

export const CATEGORY_LABELS = {
  educational:  "Навчальна",
  fiction:      "Художня",
  technical:    "Технічна",
  science:      "Наукова",
  literature:   "Література",
  history:      "Історія",
  mathematics:  "Математика",
  programming:  "Програмування",
};

export const CONDITION_LABELS = {
  likenew:    "Як нова",
  verygood:   "Дуже добрий",
  good:       "Добрий",
  acceptable: "Прийнятний",
  fair:       "Задовільний",
};

export function buildBookCard(book) {
  const catLabel  = CATEGORY_LABELS[book.category]  || book.category  || "—";
  const condClass = book.condition ? `condition-${book.condition}` : "";
  const condLabel = CONDITION_LABELS[book.condition] || book.condition || "—";
  const cover     = book.cover
    || "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=280&fit=crop";
  const owner     = book.owner_name || "—";

  return `
    <div class="book-card" onclick="openBook(${book.id})" data-id="${book.id}">
      <img class="cover" src="${cover}" alt="${book.title}"
        onerror="this.src='https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=280&fit=crop'">
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

window.openBook = function(id) {
  const user = auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  window.location.href = `book-info.html?id=${id}`;
};
