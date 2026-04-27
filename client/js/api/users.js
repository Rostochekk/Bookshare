import { request, requestForm } from "./client.js";
import { auth }                 from "../core/router.js";

export const usersApi = {
  async register(name, email, password) {
    const data = await request("/users/register", {
      method: "POST",
      body:   JSON.stringify({ name, email, password }),
    });
    auth.setUser(data.user);
    return data;
  },

  async login(email, password) {
    const data = await request("/users/login", {
      method: "POST",
      body:   JSON.stringify({ email, password }),
    });
    auth.setUser(data.user);
    return data;
  },

  async getMe(id) {
    return request(`/users/me?id=${id}`);
  },

  async uploadAvatar(formData) {
    return requestForm("/users/avatar", formData);
  },
};
