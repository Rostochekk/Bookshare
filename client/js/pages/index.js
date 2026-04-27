import { initNavbar }   from "../modules/navbar.js";
import { booksApi }     from "../api/books.js";
import { buildBookCard } from "../modules/books/bookCard.js";

initNavbar();
initSearch();
initStats();
initCategoryCounters();
initRecentBooks();

function initSearch() {
  const input = document.getElementById("searchInput");
  const btn   = document.getElementById("searchBtn");
  if (!input) return;
  const doSearch = () => {
    const query = input.value.trim();
    if (!query) return;
    window.location.href = `browse.html?search=${encodeURIComponent(query)}`;
  };
  btn?.addEventListener("click", doSearch);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
}

function initStats() {
  const statBooks = document.getElementById("statBooks");
  if (!statBooks) return;
  booksApi.getCount()
    .then(({ count }) => { statBooks.textContent = count + "+"; })
    .catch(() => { statBooks.textContent = "0+"; });
}

function initCategoryCounters() {
  const catCountEls = document.querySelectorAll(".cat-count[data-category]");
  if (!catCountEls.length) return;
  booksApi.getCategories()
    .then((cats) => {
      const map = Object.fromEntries(cats.map(c => [c.name, c.count]));
      catCountEls.forEach(el => {
        const slug  = el.dataset.category;
        const count = map[slug] ?? 0;
        let label;
        if (count === 0)                   label = "Немає книг";
        else if (count === 1)              label = "1 книга";
        else if (count >= 2 && count <= 4) label = `${count} книги`;
        else                               label = `${count} книг`;
        el.textContent = label;
      });
    })
    .catch(() => {
      catCountEls.forEach(el => { el.textContent = "—"; });
    });
}

function initRecentBooks() {
  const container = document.getElementById("recentBooks");
  if (!container) return;

  container.innerHTML = `
    <div class="book-card-skeleton"></div>
    <div class="book-card-skeleton"></div>
    <div class="book-card-skeleton"></div>
    <div class="book-card-skeleton"></div>
  `;

  booksApi.getRecent()
    .then((books) => {
      if (!books.length) {
        container.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <p>Поки що тут немає книг</p>
            <span>Будьте першим — <a href="add-book.html" style="color:var(--green)">додайте книгу</a></span>
          </div>`;
        return;
      }
      container.innerHTML = books.map(b => buildBookCard(b)).join("");
    })
    .catch(() => {
      container.innerHTML = `
        <p style="color:#c00;text-align:center;grid-column:1/-1;padding:40px 0">
          Не вдалося завантажити книги. Спробуйте оновити сторінку.
        </p>`;
    });
}
