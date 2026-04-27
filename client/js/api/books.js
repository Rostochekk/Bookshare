import { request, requestForm } from "./client.js";

export const booksApi = {
  async uploadCover(formData) {
    return requestForm("/books/upload-cover", formData);
  },

  async getCount() {
    return request("/books/count");
  },

  async getRecent() {
    return request("/books/recent");
  },

  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category)  params.set("category",  filters.category);
    if (filters.condition) params.set("condition", filters.condition);
    if (filters.search)    params.set("search",    filters.search);
    const qs = params.toString();
    return request(`/books/all${qs ? "?" + qs : ""}`);
  },

  async getById(id) {
    return request(`/books/${id}`);
  },

  async getRelated(id) {
    return request(`/books/${id}/related`);
  },

  async getMy(ownerId) {
    return request(`/books/my?owner_id=${ownerId}`);
  },

  async getCategories() {
    return request("/books/categories");
  },

  async add(bookData) {
    return request("/books/add", {
      method: "POST",
      body:   JSON.stringify(bookData),
    });
  },

  async update(id, bookData) {
    return request(`/books/${id}`, {
      method: "PUT",
      body:   JSON.stringify(bookData),
    });
  },

  async delete(id, ownerId) {
    return request(`/books/${id}`, {
      method: "DELETE",
      body:   JSON.stringify({ owner_id: ownerId }),
    });
  },
};
