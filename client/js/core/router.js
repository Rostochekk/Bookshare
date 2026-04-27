export const auth = {
  getUser() {
    try {
      return JSON.parse(localStorage.getItem("bs_user")) || null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem("bs_user", JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem("bs_user");
    window.location.href = "login.html";
  },

  isLoggedIn() {
    return Boolean(this.getUser());
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  },
};
