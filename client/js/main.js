// client/js/main.js
import { auth, booksApi, buildBookCard } from "./api.js";

// ════════════════════════════════════════════════════════════
//  Navbar dropdown
// ════════════════════════════════════════════════════════════

function initNavbar() {
  const profileIcon = document.querySelector(".profile-icon");
  if (!profileIcon) return;

  const dropdown = document.createElement("div");
  dropdown.className = "nav-dropdown";

  const user = auth.getUser();

  if (user) {
    dropdown.innerHTML = `
      <div class="nav-dropdown-user">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <span>${user.name}</span>
      </div>
      <div class="nav-dropdown-divider"></div>
      <a href="/profile.html" class="nav-dropdown-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        Мій профіль
      </a>
      <a href="/add-book.html" class="nav-dropdown-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        Додати книгу
      </a>
      <a href="/chat.html" class="nav-dropdown-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        Мої чати
      </a>
      <div class="nav-dropdown-divider"></div>
      <button class="nav-dropdown-item nav-dropdown-logout" id="logoutBtn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Вийти
      </button>
    `;
  } else {
    dropdown.innerHTML = `
      <a href="/login.html" class="nav-dropdown-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        Увійти
      </a>
      <a href="/reg.html" class="nav-dropdown-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
        Зареєструватись
      </a>
    `;
  }

  // Обгортка для позиціонування dropdown
  const wrapper = document.createElement("div");
  wrapper.className = "nav-profile-wrap";
  profileIcon.parentNode.insertBefore(wrapper, profileIcon);
  wrapper.appendChild(profileIcon);
  wrapper.appendChild(dropdown);

  // Toggle відкриття/закриття
  profileIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => dropdown.classList.remove("open"));
  dropdown.addEventListener("click", (e) => e.stopPropagation());

  // Logout
  const logoutBtn = dropdown.querySelector("#logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => auth.logout());
  }
}

// ════════════════════════════════════════════════════════════
//  Пошук — перекидає на browse з параметром ?search=
// ════════════════════════════════════════════════════════════

function initSearch() {
  const input = document.getElementById("searchInput");
  const btn   = document.getElementById("searchBtn");
  if (!input) return;

  function doSearch() {
    const query = input.value.trim();
    if (!query) return;
    window.location.href = `browse.html?search=${encodeURIComponent(query)}`;
  }

  btn?.addEventListener("click", doSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });
}

// ════════════════════════════════════════════════════════════
//  Статистика — кількість книг з БД
// ════════════════════════════════════════════════════════════

function initStats() {
  const statBooks = document.getElementById("statBooks");
  if (!statBooks) return;

  booksApi.getCount()
    .then(({ count }) => { statBooks.textContent = count + "+"; })
    .catch(() => { statBooks.textContent = "0+"; });
}

// ════════════════════════════════════════════════════════════
//  Лічильники категорій з БД
// ════════════════════════════════════════════════════════════

function initCategoryCounters() {
  const catCountEls = document.querySelectorAll(".cat-count[data-category]");
  if (!catCountEls.length) return;

  booksApi.getCategories()
    .then((cats) => {
      const map = Object.fromEntries(cats.map(c => [c.name, c.count]));
      catCountEls.forEach(el => {
        const slug  = el.dataset.category;
        const count = map[slug] ?? 0;
        // Правильне відмінювання
        let label;
        if (count === 0)                          label = "Немає книг";
        else if (count === 1)                     label = "1 книга";
        else if (count >= 2 && count <= 4)        label = `${count} книги`;
        else                                      label = `${count} книг`;
        el.textContent = label;
      });
    })
    .catch(() => {
      catCountEls.forEach(el => { el.textContent = "—"; });
    });
}

// ════════════════════════════════════════════════════════════
//  Нещодавно додані книги
// ════════════════════════════════════════════════════════════

function initRecentBooks() {
  const container = document.getElementById("recentBooks");
  if (!container) return;

  // Скелетон-заглушка поки вантажиться
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
      // buildBookCard з api.js — клік через window.openBook
      container.innerHTML = books.map(b => buildBookCard(b)).join("");
    })
    .catch(() => {
      container.innerHTML = `
        <p style="color:#c00;text-align:center;grid-column:1/-1;padding:40px 0">
          Не вдалося завантажити книги. Спробуйте оновити сторінку.
        </p>`;
    });
}

// ════════════════════════════════════════════════════════════
//  Ініціалізація
// ════════════════════════════════════════════════════════════

initNavbar();
initSearch();
initStats();
initCategoryCounters();
initRecentBooks();