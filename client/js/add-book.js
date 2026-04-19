// client/js/add-book.js
import { auth, booksApi } from "./api.js";
import "./main.js";

// ── Захист ────────────────────────────────────────────────
if (!auth.requireAuth()) throw new Error("redirect");
const user = auth.getUser();

// ════════════════════════════════════════════════════════════
//  ТОСТ (той самий що в profile.js, але локальний щоб не
//  залежати від порядку імпортів)
// ════════════════════════════════════════════════════════════

function showToast(message, type = "success") {
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
  requestAnimationFrame(() => toast.classList.add("bs-toast--visible"));
  setTimeout(() => {
    toast.classList.remove("bs-toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ════════════════════════════════════════════════════════════
//  ОБКЛАДИНКА
// ════════════════════════════════════════════════════════════

let coverFile    = null;
let existingCover = null; // URL обкладинки при редагуванні

const coverArea        = document.getElementById("coverUploadArea");
const coverInput       = document.getElementById("coverInput");
const coverPreview     = document.getElementById("coverPreview");
const coverPlaceholder = document.getElementById("coverPlaceholder");
const coverRemoveBtn   = document.getElementById("coverRemoveBtn");

coverArea.addEventListener("click", (e) => {
  if (coverRemoveBtn.contains(e.target)) return;
  coverInput.click();
});

coverArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  coverArea.classList.add("drag-over");
});
coverArea.addEventListener("dragleave", () => coverArea.classList.remove("drag-over"));
coverArea.addEventListener("drop", (e) => {
  e.preventDefault();
  coverArea.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file?.type.startsWith("image/")) handleCoverFile(file);
});

coverInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) handleCoverFile(file);
});

coverRemoveBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  coverFile     = null;
  existingCover = null;
  coverPreview.src           = "";
  coverPreview.style.display = "none";
  coverPlaceholder.style.display = "flex";
  coverRemoveBtn.style.display   = "none";
  coverInput.value = "";
});

function handleCoverFile(file) {
  if (file.size > 3 * 1024 * 1024) {
    showToast("Файл занадто великий. Максимум 3 МБ.", "error");
    return;
  }
  coverFile = file;
  showPreview(URL.createObjectURL(file));
}

function showPreview(src) {
  coverPreview.src               = src;
  coverPreview.style.display     = "block";
  coverPlaceholder.style.display = "none";
  coverRemoveBtn.style.display   = "flex";
}

// ════════════════════════════════════════════════════════════
//  ЛІЧИЛЬНИК СИМВОЛІВ
// ════════════════════════════════════════════════════════════

const textarea = document.getElementById("book-desc");
const counter  = document.getElementById("char-count");

textarea.addEventListener("input", () => {
  const len = textarea.value.length;
  counter.textContent = len;
  document.querySelector(".char-counter").classList.toggle("valid", len >= 20);
});

// ════════════════════════════════════════════════════════════
//  РЕЖИМ РЕДАГУВАННЯ — винесено в окрему async-функцію
//  щоб не було top-level await з проблемним error handling
// ════════════════════════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

async function initEditMode() {
  document.getElementById("formTitle").textContent    = "Редагувати книгу";
  document.getElementById("formSubtitle").textContent = "Оновіть інформацію про книгу";

  const btn = document.getElementById("submit-btn");
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
    Зберегти зміни
  `;

  // Показуємо скелетон поки вантажиться
  btn.disabled = true;

  try {
    const book = await booksApi.getById(editId);

    // Перевіряємо що книга належить поточному юзеру
    if (String(book.owner_id) !== String(user.id)) {
      showToast("У вас немає прав редагувати цю книгу", "error");
      setTimeout(() => { window.location.href = "profile.html"; }, 2000);
      return;
    }

    document.getElementById("book-title").value     = book.title       || "";
    document.getElementById("book-author").value    = book.author      || "";
    document.getElementById("book-category").value  = book.category    || "";
    document.getElementById("book-condition").value = book.condition   || "";
    document.getElementById("book-desc").value      = book.description || "";

    const len = (book.description || "").length;
    counter.textContent = len;
    if (len >= 20) document.querySelector(".char-counter").classList.add("valid");

    if (book.cover) {
      existingCover = book.cover;
      showPreview(book.cover);
    }

  } catch (err) {
    // ✅ Замість alert — тост. Не блокує браузер, не виглядає дивно
    showToast("Не вдалося завантажити книгу: " + (err.message || ""), "error");
    // Не редіректимо — нехай юзер бачить порожню форму і може вийти самостійно
  } finally {
    btn.disabled = false;
  }
}

// Запускаємо тільки якщо є edit параметр
if (editId) {
  initEditMode();
}

// ════════════════════════════════════════════════════════════
//  САБМІТ
// ════════════════════════════════════════════════════════════

document.getElementById("submit-btn").addEventListener("click", async () => {
  const title     = document.getElementById("book-title").value.trim();
  const author    = document.getElementById("book-author").value.trim();
  const category  = document.getElementById("book-category").value;
  const condition = document.getElementById("book-condition").value;
  const desc      = textarea.value.trim();

  // ── Валідація ────────────────────────────────────────────
  const fields = [
    { el: document.getElementById("book-title"),     val: title },
    { el: document.getElementById("book-author"),    val: author },
    { el: document.getElementById("book-category"),  val: category },
    { el: document.getElementById("book-condition"), val: condition },
    { el: textarea,                                  val: desc.length >= 20 ? desc : "" },
  ];

  let valid = true;
  fields.forEach(({ el, val }) => {
    el.classList.toggle("input-error", !val);
    if (!val) valid = false;
  });

  if (!valid) {
    showToast("Заповніть усі обов'язкові поля", "error");
    return;
  }

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Збереження...
  `;

  try {
    let coverUrl = existingCover || null;

    // Завантажуємо нову обкладинку якщо вибрали
    if (coverFile) {
      const fd = new FormData();
      fd.append("cover", coverFile);
      fd.append("user_id", user.id);

      const res  = await fetch("/api/books/upload-cover", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка завантаження фото");
      coverUrl = data.cover;
    }

    const bookData = {
      title,
      author,
      category,
      condition,
      description: desc,
      owner_id: user.id,
      cover: coverUrl,
    };

    if (editId) {
      await booksApi.update(editId, bookData);
      showToast("Книгу оновлено!");
    } else {
      await booksApi.add(bookData);
      showToast("Книгу додано!");
    }

    // Невелика затримка щоб тост встиг показатись
    setTimeout(() => { window.location.href = "profile.html"; }, 900);

  } catch (err) {
    // ✅ Тост замість alert
    showToast("Помилка: " + (err.message || "Невідома помилка"), "error");
    btn.disabled  = false;
    btn.innerHTML = originalHTML;
  }
});

// ── Анімація спінера ──────────────────────────────────────
const style = document.createElement("style");
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);