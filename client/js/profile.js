const usernameInput = document.getElementById('username');
const myBooksDiv = document.getElementById('myBooks');

function getUser() {
  return localStorage.getItem('bookshareUser');
}

function setUser(name) {
  localStorage.setItem('bookshareUser', name);
}

async function loadUserBooks() {
  const name = getUser();
  if (!name) return;
  usernameInput.value = name;
  const books = await api.getUserBooks(name);
  myBooksDiv.innerHTML = books
    .map(
      b => `<div class="book-card">
              <h3>${b.title}</h3>
              <p>${b.author}</p>
              <button data-id="${b.id}">Видалити</button>
            </div>`
    )
    .join('');
  document.querySelectorAll('button[data-id]').forEach(btn =>
    btn.addEventListener('click', async e => {
      await api.deleteBook(e.target.dataset.id);
      loadUserBooks();
    })
  );
}

document.getElementById('saveUser').addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  if (name) {
    await api.createUser(name);
    setUser(name);
    loadUserBooks();
  }
});

loadUserBooks();
