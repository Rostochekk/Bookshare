// Файл: client/js/main.js

// ============================
//  Пошук
// ============================
function searchBooks() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;
  // просто редірект на сторінку browse.html із параметром пошуку
  window.location.href = `browse.html?search=${encodeURIComponent(query)}`;
}

// ============================
//  Завантаження статистики
// ============================
const statBooks = document.getElementById("statBooks");
if (statBooks) {
  fetch("/api/books/count")
    .then(res => res.ok ? res.json() : { count: 0 })
    .then(data => {
      statBooks.textContent = data.count + "+";
    })
    .catch(() => (statBooks.textContent = "0+"));
}

// ============================
//  Нещодавно додані книги
// ============================
const recentContainer = document.getElementById("recentBooks");
if (recentContainer) {
  fetch("/api/books/recent")
    .then(res => res.ok ? res.json() : [])
    .then(books => {
      if (!books.length) {
        recentContainer.innerHTML =
          "<p style='color:#666;text-align:center;'>Поки що тут немає книг.</p>";
        return;
      }

      recentContainer.innerHTML = books
        .map(
          (b) => `
        <div class="book-card">
          <img class="cover" src="${b.cover || "images/placeholder-cover.jpg"}" alt="${b.title}">
          <h3>${b.title}</h3>
          <p>${b.author}</p>
          <span class="tag">${b.category || "Без категорії"}</span>
        </div>
      `
        )
        .join("");
    })
    .catch((err) => {
      console.error("Помилка завантаження книг:", err);
      recentContainer.innerHTML =
        "<p style='color:#c00;text-align:center;'>Не вдалося завантажити книги.</p>";
    });
}
