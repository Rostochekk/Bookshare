# 📚 BookShare

Веб-платформа для обміну, позики та передачі книг між студентами.  
Розроблено в рамках навчального проєкту з дисципліни «Управління ІТ-проєктами» (Львівська політехніка, 2026).

🔗 **Live demo:** https://bookshare-ofnb.onrender.com  
📁 **Репозиторій:** https://github.com/Rostochekk/Bookshare

---

## 🛠 Технологічний стек

| Шар | Технологія |
|-----|-----------|
| Backend | Node.js, Express.js |
| База даних | SQLite (через `sqlite` + `sqlite3`) |
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Авторизація | bcrypt, Google OAuth 2.0 (Passport.js) |
| Завантаження файлів | Multer |
| Email | Nodemailer |
| Деплой | Render (безкоштовний план) |
| Тестування | Jest, Supertest |

---

## 🚀 Встановлення та запуск

### 1. Клонувати репозиторій

```bash
git clone https://github.com/Rostochekk/Bookshare.git
cd Bookshare
```

### 2. Встановити залежності

```bash
npm install
```

### 3. Створити файл `.env`

```env
PORT=3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/users/auth/google/callback

# Email (Nodemailer)
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
```

### 4. Запустити сервер

```bash
npm start
```

Відкрити у браузері: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Тестування

```bash
npm test
```

Запускає 23 автоматизованих тести (Jest + Supertest), що покривають:
- Реєстрацію та авторизацію користувачів
- CRUD операції для книг
- Пошук та фільтрацію каталогу
- Валідацію та обробку помилок

---

## 📁 Структура проєкту

```
bookshare/
├── client/                  # Frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── browse.html
│   ├── profile.html
│   └── add-book.html
├── server/                  # Backend (Node.js)
│   ├── config/
│   │   └── db.js            # Підключення та ініціалізація SQLite
│   ├── controllers/
│   │   ├── bookController.js
│   │   ├── chatController.js
│   │   └── userController.js
│   ├── models/
│   │   ├── bookModel.js
│   │   ├── chatModel.js
│   │   └── userModel.js
│   ├── routes/
│   │   ├── books.js
│   │   ├── chats.js
│   │   └── users.js
│   ├── services/
│   ├── middlewares/
│   ├── utils/
│   ├── app.js               # Express додаток
│   └── server.js            # Точка входу
├── bookshare.test.js        # Тести
├── bookshare.db             # База даних SQLite
├── package.json
└── .env
```

---

## 🗄 Схема бази даних

| Таблиця | Опис |
|---------|------|
| `users` | Користувачі (name, email, password_hash, avatar, role, google_id) |
| `books` | Оголошення книг (title, author, category, condition, cover, owner_id) |
| `chats` | Чати між власником книги та покупцем |
| `messages` | Повідомлення в чатах (text, image_path, is_system) |
| `chat_ratings` | Оцінки чатів (1–5 зірок) |
| `chat_reads` | Відстеження прочитаних повідомлень |
| `password_resets` | Токени для скидання паролю |

---

## 🔌 API Endpoints

### Користувачі `/api/users`

| Метод | Endpoint | Опис |
|-------|----------|------|
| POST | `/register` | Реєстрація |
| POST | `/login` | Вхід |
| GET | `/me?id=` | Отримати профіль |
| POST | `/avatar` | Завантажити аватар |
| POST | `/forgot-password` | Запит на скидання паролю |
| POST | `/reset-password` | Скидання паролю |
| GET | `/auth/google` | Google OAuth |

### Книги `/api/books`

| Метод | Endpoint | Опис |
|-------|----------|------|
| GET | `/all` | Всі книги (з фільтрацією) |
| GET | `/count` | Кількість книг |
| GET | `/recent` | Нещодавні книги |
| GET | `/categories` | Статистика категорій |
| GET | `/my?owner_id=` | Книги користувача |
| GET | `/:id` | Книга по ID |
| GET | `/:id/related` | Схожі книги |
| POST | `/add` | Додати книгу |
| PUT | `/:id` | Редагувати книгу |
| DELETE | `/:id` | Видалити книгу |

### Чати `/api/chats`

| Метод | Endpoint | Опис |
|-------|----------|------|
| GET | `/?user_id=` | Чати користувача |
| POST | `/start` | Почати чат |
| GET | `/:id/messages` | Повідомлення чату |
| POST | `/:id/messages` | Надіслати повідомлення |
| POST | `/:id/rate` | Оцінити чат |

---

## ✅ Функціонал MVP

- [x] Реєстрація та вхід (email + Google OAuth)
- [x] Скидання паролю через email
- [x] Каталог книг із пошуком та фільтрацією
- [x] Додавання, редагування та видалення оголошень
- [x] Завантаження обкладинок книг
- [x] Особистий кабінет
- [x] Чат між користувачами
- [x] Система оцінок чатів
- [x] Адмін-панель (управління користувачами та книгами)
- [x] Деплой на Render

---

## 👥 Команда

| Учасник | Роль |
|---------|------|
| Черній Владислав | Team Lead, Full-Stack Developer (Backend, архітектура, деплой) |
| Манчуленко Тетяна | Frontend Developer, UI Designer |

