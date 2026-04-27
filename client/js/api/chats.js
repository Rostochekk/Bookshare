import { request, requestForm } from "./client.js";

export const chatsApi = {
  async getChats(userId) {
    return request(`/chats?user_id=${userId}`);
  },

  async getMessages(chatId, userId) {
    return request(`/chats/${chatId}/messages?user_id=${userId}`);
  },

  async startChat(bookId, buyerId) {
    return request("/chats/start", {
      method: "POST",
      body:   JSON.stringify({ book_id: bookId, buyer_id: buyerId }),
    });
  },

  async sendMessage(chatId, senderId, text, file) {
    const formData = new FormData();
    formData.append("sender_id", senderId);
    if (text) formData.append("text",  text);
    if (file) formData.append("image", file);
    return requestForm(`/chats/${chatId}/messages`, formData);
  },

  async rateChat(chatId, userId, rating) {
    return request(`/chats/${chatId}/rate`, {
      method: "POST",
      body:   JSON.stringify({ user_id: userId, rating }),
    });
  },
};
