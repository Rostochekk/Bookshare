// Файл: client/js/api.js

// ======================
// КАТЕГОРІЇ
// ======================
const categoriesGrid = document.getElementById("categoriesGrid");
if (categoriesGrid) {
  fetch("/api/categories")
    .then(res => res.ok ? res.json() : [])
    .then(cats => {
      if (!cats.length) {
        categoriesGrid.innerHTML = "<p>Категорії поки відсутні.</p>";
        return;
      }
      categoriesGrid.innerHTML = cats
        .map(c => `
          <div class="category-card" onclick="filterByCategory('${c.name}')">
            <img src="images/book.svg" alt="">
            <h3>${c.name}</h3>
            <p>${c.count} книг</p>
          </div>
        `)
        .join("");
    });
}

// ======================
// СПИСОК КНИГ
// ======================
const booksGrid = document.getElementById("booksGrid");
const browseTitle = document.getElementById("browseTitle");

if (booksGrid) {
  fetch("/api/books/all")
    .then(res => res.ok ? res.json() : [])
    .then(books => renderBooks(books));
}

function renderBooks(books) {
  if (!books || !books.length) {
    booksGrid.innerHTML = "<p style='text-align:center;'>Книг поки нема.</p>";
    return;
  }
  booksGrid.innerHTML = books.map(b => `
    <div class="book-card">
      <img class="cover" src="${b.cover || 'images/placeholder-cover.jpg'}" alt="${b.title}">
      <h3>${b.title}</h3>
      <p>${b.author}</p>
      <span class="tag">${b.category || 'Без категорії'}</span>
    </div>
  `).join("");
}

function filterByCategory(cat) {
  browseTitle.textContent = `Категорія: ${cat}`;
  fetch(`/api/books/category/${encodeURIComponent(cat)}`)
    .then(res => res.ok ? res.json() : [])
    .then(books => renderBooks(books));
}
