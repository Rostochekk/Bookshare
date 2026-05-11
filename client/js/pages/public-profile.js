import { initNavbar } from "../modules/navbar.js";
import { chatsApi }   from "../api/chats.js";
import { auth }       from "../core/router.js";
import { showAlert }  from "../core/utils.js";

initNavbar();

const params = new URLSearchParams(window.location.search);
const userId = params.get("id");

if (!userId) {
  window.location.href = "browse.html";
  throw new Error("no id");
}

const me = auth.getUser();

if (me && String(me.id) === String(userId)) {
  window.location.href = "profile.html";
  throw new Error("redirect");
}

const CATEGORY_LABELS = {
  educational: "Навчальна", fiction: "Художня", technical: "Технічна",
  science: "Наука", literature: "Література", history: "Історія",
  mathematics: "Математика", programming: "Програмування",
};

const CONDITION_LABELS = {
  likenew: "Як нова", verygood: "Дуже добрий",
  good: "Добрий", acceptable: "Прийнятний", fair: "Задовільний",
};

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("uk-UA", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function buildPublicBookCard(book) {
  const catLabel  = CATEGORY_LABELS[book.category]  || book.category  || "—";
  const condClass = book.condition ? `condition-${book.condition}` : "";
  const condLabel = CONDITION_LABELS[book.condition] || book.condition || "—";
  const cover     = book.cover ||
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=120&h=120&fit=crop";
  const desc = book.description
    ? book.description.slice(0, 180) + (book.description.length > 180 ? "…" : "")
    : "Опис відсутній";

  const chatBtn = me ? `
    <div class="profile-book-actions">
      <button class="btn-edit pub-chat-btn" data-book-id="${book.id}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Написати
      </button>
    </div>
  ` : "";

  return `
    <div class="profile-book-card">
      <img src="${cover}" alt="Обкладинка" class="profile-book-cover"
           onclick="window.location.href='book-info.html?id=${book.id}'"
           style="cursor:pointer"
           onerror="this.src='https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=120&h=120&fit=crop'" />
      <div class="profile-book-info" onclick="window.location.href='book-info.html?id=${book.id}'" style="cursor:pointer">
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
      ${chatBtn}
    </div>
  `;
}

async function load() {
  try {
    const [userRes, booksRes] = await Promise.all([
      fetch(`/api/users/me?id=${userId}`),
      fetch(`/api/books/my?owner_id=${userId}`),
    ]);

    const user  = await userRes.json();
    const books = await booksRes.json().then(d => Array.isArray(d) ? d : []);

    document.title = `BookShare — ${user.name}`;

    const avatarEl   = document.getElementById("profileAvatar");
    const fallback   = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "?")}&background=00a870&color=fff&size=120`;
    avatarEl.src     = user.avatar || fallback;
    avatarEl.onerror = () => { avatarEl.src = fallback; };

    document.getElementById("profileName").textContent = user.name || "—";
    document.getElementById("statBooks").textContent   = books.length;
    document.getElementById("booksCount").textContent  = `${books.length} книг`;

    const list       = document.getElementById("booksList");
    const emptyState = document.getElementById("emptyState");

    if (!books.length) {
      emptyState.style.display = "block";
      return;
    }

    list.innerHTML = books.map(b => buildPublicBookCard(b)).join("");

    // ── Кнопка "Написати" — старт чату по конкретній книзі ──
    list.addEventListener("click", async (e) => {
      const btn = e.target.closest(".pub-chat-btn");
      if (!btn) return;
      e.stopPropagation();

      if (!me) {
        window.location.href = "login.html";
        return;
      }

      const bookId = Number(btn.dataset.bookId);
      btn.disabled = true;
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Відкриваємо...
      `;

      try {
        const data = await chatsApi.startChat(bookId, me.id);
        window.location.href = `chat.html?chat=${data.chat_id}`;
      } catch (err) {
        showAlert({
          type: "error",
          title: "Помилка",
          message: err.message || "Не вдалося відкрити чат",
          confirmText: "Закрити",
        });
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Написати
        `;
      }
    });

  } catch (err) {
    document.getElementById("profileName").textContent = "Помилка завантаження";
    console.error(err);
  }
}

const s = document.createElement("style");
s.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(s);

load();