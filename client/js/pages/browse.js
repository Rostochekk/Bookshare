import { initNavbar }   from "../modules/navbar.js";
import { booksApi }     from "../api/books.js";
import { buildBookCard } from "../modules/books/bookCard.js";

initNavbar();

const grid       = document.getElementById("books-grid");
const countEl    = document.getElementById("books-count");
const emptyState = document.getElementById("empty-state");
const errorState = document.getElementById("error-state");
const errorMsg   = document.getElementById("error-message");

let allBooks = [];

const urlParams   = new URLSearchParams(window.location.search);
const urlCategory = urlParams.get("category");
const urlSearch   = urlParams.get("search");

if (urlCategory) {
  const cb = document.querySelector(`input[name="category"][value="${urlCategory}"]`);
  if (cb) cb.checked = true;
}
if (urlSearch) {
  document.getElementById("search-input").value = urlSearch;
}

async function loadBooks() {
  try {
    errorState.style.display = "none";
    allBooks = await booksApi.getAll();

    if (!Array.isArray(allBooks)) {
      showError("Сервер повернув некоректні дані.");
      return;
    }

    updateCounts();
    applyFilters();
  } catch (e) {
    showError(e.message || "Невідома помилка");
  }
}

function showError(msg) {
  grid.innerHTML = "";
  errorMsg.textContent = msg;
  errorState.style.display = "block";
  emptyState.style.display = "none";
  countEl.textContent = "0";
}

function updateCounts() {
  const catMap  = {};
  const condMap = {};

  allBooks.forEach(b => {
    if (b.category)  catMap[b.category]  = (catMap[b.category]  || 0) + 1;
    if (b.condition) condMap[b.condition] = (condMap[b.condition] || 0) + 1;
  });

  document.querySelectorAll("[id^='count-']").forEach(el => {
    const key = el.id.replace("count-", "");
    el.textContent = catMap[key] ?? condMap[key] ?? 0;
  });
}

function applyFilters() {
  const search       = document.getElementById("search-input").value.toLowerCase().trim();
  const checkedCats  = [...document.querySelectorAll('input[name="category"]:checked')].map(i => i.value);
  const checkedConds = [...document.querySelectorAll('input[name="condition"]:checked')].map(i => i.value);

  const filtered = allBooks.filter(b => {
    const matchSearch = !search
      || (b.title  || "").toLowerCase().includes(search)
      || (b.author || "").toLowerCase().includes(search);
    const matchCat  = !checkedCats.length  || checkedCats.includes(b.category);
    const matchCond = !checkedConds.length || checkedConds.includes(b.condition);
    return matchSearch && matchCat && matchCond;
  });

  countEl.textContent = filtered.length;
  const hasResults = filtered.length > 0;
  emptyState.style.display = hasResults ? "none" : "flex";
  errorState.style.display = "none";
  grid.innerHTML = hasResults ? filtered.map(b => buildBookCard(b)).join("") : "";
}

document.getElementById("search-input").addEventListener("input", applyFilters);
document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener("change", applyFilters));

loadBooks();
