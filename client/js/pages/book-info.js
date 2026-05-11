  import { initNavbar }  from "../modules/navbar.js";
  import { booksApi }    from "../api/books.js";
  import { chatsApi }    from "../api/chats.js";
  import { auth }        from "../core/router.js";
  import { showAlert }   from "../core/utils.js";
  import { CATEGORY_LABELS, CONDITION_LABELS, buildBookCard } from "../modules/books/bookCard.js";

  initNavbar();

  const params = new URLSearchParams(window.location.search);
  const bookId = params.get("id");

  if (!bookId) {
    window.location.href = "browse.html";
    throw new Error("no id");
  }

  async function loadBook() {
    try {
      const book = await booksApi.getById(bookId);

      renderBook(book);

      const [related, ownerBooks] = await Promise.all([
        booksApi.getRelated(bookId).catch(() => []),
        book.owner_id
          ? booksApi.getMy(book.owner_id).catch(() => [])
          : Promise.resolve([]),
      ]);

      const countEl = document.getElementById("ownerBookCount");
      if (countEl) countEl.textContent = Array.isArray(ownerBooks) ? ownerBooks.length : 0;

      renderRelated(related);
    } catch (err) {
      document.querySelector(".bookinfo-main").innerHTML =
        `<p style="text-align:center;padding:60px;color:#c00;font-size:18px;">
          Книгу не знайдено або виникла помилка сервера.
        </p>`;
    }
  }

  function renderBook(b) {
    const catLabel  = CATEGORY_LABELS[b.category]  || b.category  || "—";
    const condClass = b.condition ? `condition-${b.condition}` : "";
    const condLabel = CONDITION_LABELS[b.condition] || b.condition || "—";

    const cover = b.cover ||
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=340&h=440&fit=crop";

    const date = b.created_at
      ? new Date(b.created_at).toLocaleDateString("uk-UA", {
          day: "numeric", month: "long", year: "numeric",
        })
      : "—";

    const ownerName = b.owner_name || "—";

    const coverEl = document.getElementById("bookCover");
    coverEl.src = cover;
    coverEl.alt = b.title || "Книга";
    coverEl.onerror = () => {
      coverEl.src = "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=340&h=440&fit=crop";
    };

    document.getElementById("bookTitle").textContent  = b.title || "—";
    document.getElementById("bookAuthor").textContent = b.author || "";

    const crumb = document.getElementById("bookBreadcrumb");
    if (crumb) crumb.textContent = b.title || "—";

    document.getElementById("bookBadges").innerHTML = `
      <span class="category-badge">${catLabel}</span>
      <span class="condition-badge ${condClass}">${condLabel}</span>
    `;

    document.getElementById("metaDate").textContent      = date;
    document.getElementById("metaCategory").textContent  = catLabel;
    document.getElementById("metaCondition").textContent = condLabel;
    document.getElementById("metaOwner").textContent     = ownerName;
    document.getElementById("bookDesc").textContent      = b.description || "Опис відсутній.";

    document.getElementById("ownerName").textContent = ownerName;
    document.getElementById("ownerAvatar").src =
      `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=00a870&color=fff&size=56`;
const ownerNameEl   = document.getElementById("ownerName");
const ownerAvatarEl = document.getElementById("ownerAvatar");
if (b.owner_id) {
  ownerNameEl.style.cursor = "pointer";
  ownerNameEl.addEventListener("click", () => {
    window.location.href = `public-profile.html?id=${b.owner_id}`;
  });
  ownerAvatarEl.style.cursor = "pointer";
  ownerAvatarEl.addEventListener("click", () => {
    window.location.href = `public-profile.html?id=${b.owner_id}`;
  });
}
    const ratingEl = document.getElementById("ownerRating");
    if (ratingEl) ratingEl.textContent = b.owner_rating ?? "—";

    const contactBtn   = document.getElementById("contactBtn");
    const ownerChatBtn = document.getElementById("ownerChatBtn");

    const handleChat = async (e) => {
      e.preventDefault();

      if (!auth.isLoggedIn()) {
        window.location.href = "login.html";
        return;
      }

      const user = auth.getUser();

      // ── Кастомний алерт замість alert() ────────────────────
      if (String(b.owner_id) === String(user.id)) {
        showAlert({
          type:    "info",
          title:   "Це ваша книга",
          message: "Ви не можете написати самому собі. Перейдіть до профілю, щоб редагувати оголошення.",
          confirmText: "Зрозуміло",
        });
        return;
      }

      try {
        if (contactBtn) {
          contactBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Відкриваємо чат...
          `;
          contactBtn.disabled = true;
        }

        const data = await chatsApi.startChat(b.id, user.id);
        window.location.href = `chat.html?chat=${data.chat_id}`;
      } catch (err) {
        // ── Кастомний алерт для помилки ────────────────────
        showAlert({
          type:    "error",
          title:   "Помилка",
          message: "Не вдалося відкрити чат: " + (err.message || "невідома помилка"),
          confirmText: "Закрити",
        });
        if (contactBtn) {
          contactBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Зв'язатися з власником
          `;
          contactBtn.disabled = false;
        }
      }
    };

    contactBtn?.addEventListener("click", handleChat);
    ownerChatBtn?.addEventListener("click", handleChat);

    // Анімація спінера
    if (!document.getElementById("_spin_style")) {
      const s = document.createElement("style");
      s.id = "_spin_style";
      s.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
      document.head.appendChild(s);
    }
  }

  function renderRelated(books) {
    const container = document.getElementById("relatedBooks");
    if (!books || !books.length) {
      container.innerHTML = "<p style='color:#aaa;padding:10px 0;'>Схожих книг поки немає.</p>";
      return;
    }
    container.innerHTML = books.map(b => buildBookCard(b)).join("");
  }

  loadBook();