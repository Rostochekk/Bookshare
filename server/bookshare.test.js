import request from "supertest";
import app     from "./app.js";

// ─────────────────────────────────────────
// Тести: Авторизація (/api/users)
// ─────────────────────────────────────────
describe("AUTH — реєстрація та вхід", () => {
  const testUser = {
    name:     "Тест Юзер",
    email:    `test_${Date.now()}@bookshare.com`,
    password: "Test1234!",
  };

  test("POST /api/users/register — успішна реєстрація", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message", "Реєстрація успішна");
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user).toHaveProperty("email", testUser.email);
  });

  test("POST /api/users/register — помилка: email вже існує", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send(testUser);

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /api/users/login — успішний вхід", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Вхід успішний");
    expect(res.body.user).toHaveProperty("id");
  });

  test("POST /api/users/login — помилка: невірний пароль", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: testUser.email, password: "wrongpassword" });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /api/users/login — помилка: email не існує", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "notexist@bookshare.com", password: "Test1234!" });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});

// ─────────────────────────────────────────
// Тести: Книги (/api/books)
// ─────────────────────────────────────────
describe("BOOKS — каталог книг", () => {
  let createdBookId;
  let ownerId;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({
        name:     "Книжковий Юзер",
        email:    `book_owner_${Date.now()}@bookshare.com`,
        password: "Test1234!",
      });
    ownerId = res.body.user?.id;
  });

  test("GET /api/books/count — повертає кількість книг", async () => {
    const res = await request(app).get("/api/books/count");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("count");
    expect(typeof res.body.count).toBe("number");
  });

  test("GET /api/books/all — повертає список книг", async () => {
    const res = await request(app).get("/api/books/all");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/books/recent — повертає нещодавні книги", async () => {
    const res = await request(app).get("/api/books/recent");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/books/categories — повертає категорії", async () => {
    const res = await request(app).get("/api/books/categories");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /api/books/add — успішне додавання книги", async () => {
    const res = await request(app)
      .post("/api/books/add")
      .send({
        title:       "Тестова книга",
        author:      "Тест Автор",
        category:    "програмування",
        condition:   "Хороший",
        description: "Опис тестової книги",
        owner_id:    ownerId,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message", "Книгу додано");
    expect(res.body.book).toHaveProperty("id");
    expect(res.body.book).toHaveProperty("title", "Тестова книга");
    createdBookId = res.body.book.id;
  });

  test("POST /api/books/add — помилка: немає назви", async () => {
    const res = await request(app)
      .post("/api/books/add")
      .send({ owner_id: ownerId });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /api/books/add — помилка: немає owner_id", async () => {
    const res = await request(app)
      .post("/api/books/add")
      .send({ title: "Без власника" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("GET /api/books/:id — отримати книгу по ID", async () => {
    const res = await request(app).get(`/api/books/${createdBookId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id", createdBookId);
    expect(res.body).toHaveProperty("title", "Тестова книга");
  });

  test("GET /api/books/:id — 404 якщо книга не існує", async () => {
    const res = await request(app).get("/api/books/999999");

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  test("GET /api/books/my — книги конкретного власника", async () => {
    const res = await request(app)
      .get("/api/books/my")
      .query({ owner_id: ownerId });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("GET /api/books/my — помилка: без owner_id", async () => {
    const res = await request(app).get("/api/books/my");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("PUT /api/books/:id — редагування книги", async () => {
    const res = await request(app)
      .put(`/api/books/${createdBookId}`)
      .send({
        title:    "Оновлена книга",
        owner_id: ownerId,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Книгу оновлено");
    expect(res.body.book).toHaveProperty("title", "Оновлена книга");
  });

  test("PUT /api/books/:id — помилка: чужий owner_id", async () => {
    const res = await request(app)
      .put(`/api/books/${createdBookId}`)
      .send({ title: "Хак", owner_id: 99999 });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  test("DELETE /api/books/:id — видалення книги", async () => {
    const res = await request(app)
      .delete(`/api/books/${createdBookId}`)
      .send({ owner_id: ownerId });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Книгу видалено");
  });

  test("DELETE /api/books/:id — 404 після видалення", async () => {
    const res = await request(app).get(`/api/books/${createdBookId}`);

    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────
// Тести: Пошук та фільтрація
// ─────────────────────────────────────────
describe("BOOKS — пошук та фільтрація", () => {
  test("GET /api/books/all?search= — пошук за назвою", async () => {
    const res = await request(app)
      .get("/api/books/all")
      .query({ search: "книга" });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/books/all?category= — фільтрація за категорією", async () => {
    const res = await request(app)
      .get("/api/books/all")
      .query({ category: "програмування" });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/books/all?condition= — фільтрація за станом", async () => {
    const res = await request(app)
      .get("/api/books/all")
      .query({ condition: "Хороший" });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});