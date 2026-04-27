// client/js/chat.js
import { auth } from "./api.js";
import "./main.js"; // navbar dropdown

// ════════════════════════════════════════════════════════════
//  Захист — тільки для залогованих
// ════════════════════════════════════════════════════════════
if (!auth.requireAuth()) throw new Error("redirect");

const ME = auth.getUser(); // { id, name, email, avatar }

// ════════════════════════════════════════════════════════════
//  Стан
// ════════════════════════════════════════════════════════════
let currentChatId   = null;   // id активного чату
let currentOther    = null;   // { id, name, avatar } співрозмовника
let pollingInterval = null;   // setInterval для оновлення повідомлень
let lastMsgId       = 0;      // для інкрементального polling
let ratingShown     = false;  // чи вже показували банер у цьому чаті

// ════════════════════════════════════════════════════════════
//  DOM refs
// ════════════════════════════════════════════════════════════
const chatList      = document.getElementById("chatList");
const chatMessages  = document.getElementById("chatMessages");
const chatArea      = document.getElementById("chatArea");
const msgInput      = document.getElementById("msgInput");
const sendBtn       = document.getElementById("sendBtn");
const chatSearch    = document.getElementById("chatSearch");
const attachBtn     = document.querySelector(".chat-attach-btn");
const fileInput     = document.getElementById("msgFileInput");
const previewWrap   = document.getElementById("imgPreviewWrap");
const previewImg    = document.getElementById("imgPreview");
const previewRemove = document.getElementById("imgPreviewRemove");
const headerAvatar  = document.getElementById("chatHeaderAvatar");
const headerName    = document.getElementById("chatHeaderName");
const headerStatus  = document.getElementById("chatHeaderStatus");
const bookPreview   = document.getElementById("chatBookPreview");
const ratingBanner  = document.getElementById("ratingBanner");

// ════════════════════════════════════════════════════════════
//  Ініціалізація
// ════════════════════════════════════════════════════════════
async function init() {
  await loadChatList();

  // Якщо прийшли з book-info.html?chat=chatId або ?start&book_id=X
  const params   = new URLSearchParams(window.location.search);
  const chatId   = params.get("chat");
  const bookId   = params.get("book_id");

  if (chatId) {
    openChat(Number(chatId));
  } else if (bookId) {
    // Чат вже мав бути створений через /api/chats/start на book-info
    // Шукаємо його у списку
    const item = chatList.querySelector(`[data-chat-book="${bookId}"]`);
    if (item) item.click();
  }
}

// ════════════════════════════════════════════════════════════
//  Завантаження списку чатів
// ════════════════════════════════════════════════════════════
async function loadChatList() {
  try {
    const chats = await apiFetch(`/api/chats?user_id=${ME.id}`);
    renderChatList(chats);
  } catch (e) {
    chatList.innerHTML = `<p style="padding:16px;color:#c00;font-size:14px">Помилка: ${e.message}</p>`;
  }
}

function renderChatList(chats) {
  if (!chats.length) {
    chatList.innerHTML = `<p style="padding:20px;color:#aaa;text-align:center;font-size:14px">Чатів поки немає</p>`;
    return;
  }

  chatList.innerHTML = chats.map(c => {
    const time     = c.last_time ? formatTime(c.last_time) : "";
    const lastText = c.last_text || "";
    const badge    = c.unread_count > 0
      ? `<span class="chat-list-badge">${c.unread_count}</span>`
      : `<span class="chat-list-badge" style="display:none">0</span>`;

    return `
      <div class="chat-list-item"
           data-chat-id="${c.id}"
           data-chat-book="${c.book_id || ""}"
           onclick="window.openChat(${c.id})">
        <img src="${c.other_avatar}" alt="${c.other_name}"
             class="chat-list-avatar"
             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(c.other_name)}&background=00a870&color=fff&size=48'">
        <div class="chat-list-info">
          <div class="chat-list-top">
            <span class="chat-list-name">${c.other_name}</span>
            <span class="chat-list-time">${time}</span>
          </div>
          <div class="chat-list-bottom">
            <span class="chat-list-last">${lastText}</span>
            ${badge}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ════════════════════════════════════════════════════════════
//  Відкрити чат
// ════════════════════════════════════════════════════════════
window.openChat = async function(chatId) {
  if (currentChatId === chatId) return;

  // Зупиняємо старий polling
  stopPolling();
  ratingShown = false;
  lastMsgId   = 0;

  currentChatId = chatId;

  // Активний елемент у списку
  document.querySelectorAll(".chat-list-item").forEach(el => el.classList.remove("active"));
  const activeItem = chatList.querySelector(`[data-chat-id="${chatId}"]`);
  if (activeItem) {
    activeItem.classList.add("active");
    // Прибираємо бейдж
    const badge = activeItem.querySelector(".chat-list-badge");
    if (badge) badge.style.display = "none";
  }

  chatArea.classList.add("mobile-open");

  // Показуємо loading
  chatMessages.innerHTML = `<div class="chat-loading">Завантаження...</div>`;

  try {
    const data = await apiFetch(`/api/chats/${chatId}/messages?user_id=${ME.id}`);
    const { chat, messages, show_rating } = data;

    // Визначаємо співрозмовника
    const otherId = String(chat.buyer_id) === String(ME.id) ? chat.owner_id : chat.buyer_id;
    const otherMsg = messages.find(m => String(m.sender_id) !== String(ME.id));
    currentOther = {
      id:     otherId,
      name:   otherMsg?.sender_name || "Користувач",
      avatar: otherMsg?.sender_avatar || `https://ui-avatars.com/api/?name=User&background=00a870&color=fff&size=40`,
    };

    // Знаходимо з chatList більше деталей (book preview)
    const chatMeta = await apiFetch(`/api/chats?user_id=${ME.id}`)
      .then(list => list.find(c => c.id === chatId))
      .catch(() => null);

    if (chatMeta) {
      currentOther.name   = chatMeta.other_name;
      currentOther.avatar = chatMeta.other_avatar;
      updateHeader(chatMeta);
    }

    renderAllMessages(messages);
    scrollToBottom();

    if (show_rating) showRatingBanner();

    lastMsgId = messages.length ? messages[messages.length - 1].id : 0;

    // Запускаємо polling кожні 3 секунди
    startPolling();
  } catch (e) {
    chatMessages.innerHTML = `<p style="padding:20px;color:#c00">Помилка: ${e.message}</p>`;
  }
};

// ════════════════════════════════════════════════════════════
//  Шапка чату
// ════════════════════════════════════════════════════════════
function updateHeader(chatMeta) {
  headerName.textContent = chatMeta.other_name;
  headerAvatar.src       = chatMeta.other_avatar;
  headerAvatar.onerror   = () => {
    headerAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chatMeta.other_name)}&background=00a870&color=fff&size=40`;
  };
  headerStatus.innerHTML = `<span class="status-dot offline"></span> Учасник`;

  // Book preview
  if (chatMeta.book_id && chatMeta.book_title) {
    const cover = chatMeta.book_cover || "";
    bookPreview.style.display = "flex";
    bookPreview.innerHTML = `
      <img src="${cover}" alt="${chatMeta.book_title}" class="chat-book-preview-img"
           onerror="this.src='https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=40&h=40&fit=crop'">
      <div>
        <div class="chat-book-preview-title">${chatMeta.book_title}</div>
        <div class="chat-book-preview-author">${chatMeta.book_author || ""}</div>
      </div>
      <a href="book-info.html?id=${chatMeta.book_id}" class="chat-book-preview-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    `;
  } else {
    bookPreview.style.display = "none";
  }
}

// ════════════════════════════════════════════════════════════
//  Рендер повідомлень
// ════════════════════════════════════════════════════════════
function renderAllMessages(messages) {
  chatMessages.innerHTML = "";

  let lastDate = null;
  messages.forEach(m => {
    const msgDate = new Date(m.created_at).toDateString();
    if (msgDate !== lastDate) {
      chatMessages.appendChild(makeDateDivider(m.created_at));
      lastDate = msgDate;
    }
    chatMessages.appendChild(buildMsgEl(m));
  });
}

function appendMessage(m) {
  // Перевіряємо чи потрібен роздільник дати
  const lastDivider = chatMessages.querySelector(".chat-date-divider:last-of-type");
  const msgDate = new Date(m.created_at).toDateString();
  if (!lastDivider || lastDivider.dataset.date !== msgDate) {
    const divider = makeDateDivider(m.created_at);
    divider.dataset.date = msgDate;
    chatMessages.appendChild(divider);
  }
  chatMessages.appendChild(buildMsgEl(m));
}

function makeDateDivider(dateStr) {
  const div = document.createElement("div");
  div.className = "chat-date-divider";
  div.dataset.date = new Date(dateStr).toDateString();
  div.textContent = formatDateLabel(dateStr);
  return div;
}

function buildMsgEl(m) {
  const isMe     = String(m.sender_id) === String(ME.id);
  const div      = document.createElement("div");
  div.className  = `chat-msg ${isMe ? "outgoing" : "incoming"}`;
  div.dataset.id = m.id;

  const time     = formatMsgTime(m.created_at);
  const avatar   = m.sender_avatar;

  // Контент: спочатку системна картинка книги (якщо є), потім текст
  let contentHtml = "";

  if (m.is_system && m.image_path) {
    // Автоповідомлення з картинкою книги
    contentHtml += `
      <div class="chat-msg-book-preview">
        <img src="${m.image_path}" alt="Книга"
             onerror="this.src='https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=120&h=80&fit=crop'">
      </div>
    `;
  } else if (m.image_path) {
    // Звичайне фото
    contentHtml += `
      <a href="${m.image_path}" target="_blank" class="chat-msg-img-link">
        <img src="${m.image_path}" alt="Фото" class="chat-msg-img"
             onerror="this.style.display='none'">
      </a>
    `;
  }

  if (m.text) {
    contentHtml += `<p>${escapeHtml(m.text)}</p>`;
  }

  if (isMe) {
    div.innerHTML = `
      <div class="chat-msg-bubble">
        ${contentHtml}
        <span class="chat-msg-time">${time}</span>
      </div>
    `;
  } else {
    div.innerHTML = `
      <img src="${avatar}" alt="${m.sender_name}" class="chat-msg-avatar"
           onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.sender_name || "?")}&background=00a870&color=fff&size=32'">
      <div class="chat-msg-bubble">
        ${contentHtml}
        <span class="chat-msg-time">${time}</span>
      </div>
    `;
  }

  return div;
}

// ════════════════════════════════════════════════════════════
//  Надіслати повідомлення
// ════════════════════════════════════════════════════════════
async function sendMessage() {
  if (!currentChatId) return;

  const text  = msgInput.value.trim();
  const file  = fileInput?.files?.[0] || null;

  if (!text && !file) return;

  // Блокуємо UI
  sendBtn.disabled  = true;
  msgInput.disabled = true;

  try {
    const formData = new FormData();
    formData.append("sender_id", ME.id);
    if (text)  formData.append("text",  text);
    if (file)  formData.append("image", file);

    const data = await fetch(`/api/chats/${currentChatId}/messages`, {
      method: "POST",
      body:   formData,
    }).then(r => r.json());

    if (data.error) throw new Error(data.error);

    // Очищаємо інпут і preview
    msgInput.value = "";
    clearImagePreview();

    // Додаємо повідомлення в UI
    appendMessage(data.message);
    lastMsgId = data.message.id;
    scrollToBottom();

    // Оновлюємо список чатів
    updateChatListItem(currentChatId, data.message);

    // Рейтинг
    if (data.show_rating && !ratingShown) showRatingBanner();

  } catch (e) {
    alert("Помилка надсилання: " + e.message);
  } finally {
    sendBtn.disabled  = false;
    msgInput.disabled = false;
    msgInput.focus();
  }
}

// ════════════════════════════════════════════════════════════
//  Polling — перевіряємо нові повідомлення кожні 3с
// ════════════════════════════════════════════════════════════
function startPolling() {
  pollingInterval = setInterval(async () => {
    if (!currentChatId) return;
    try {
      const data = await apiFetch(`/api/chats/${currentChatId}/messages?user_id=${ME.id}`);
      const newMsgs = data.messages.filter(m => m.id > lastMsgId);

      if (newMsgs.length) {
        newMsgs.forEach(m => appendMessage(m));
        lastMsgId = newMsgs[newMsgs.length - 1].id;
        scrollToBottom();

        // Оновлюємо список чатів
        updateChatListItem(currentChatId, newMsgs[newMsgs.length - 1]);
      }

      if (data.show_rating && !ratingShown) showRatingBanner();
    } catch {}
  }, 3000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// ════════════════════════════════════════════════════════════
//  Оновити елемент у списку чатів
// ════════════════════════════════════════════════════════════
function updateChatListItem(chatId, msg) {
  const item = chatList.querySelector(`[data-chat-id="${chatId}"]`);
  if (!item) return;

  const lastEl = item.querySelector(".chat-list-last");
  const timeEl = item.querySelector(".chat-list-time");

  if (lastEl) lastEl.textContent = msg.image_path && !msg.text ? "📷 Фото" : (msg.text || "");
  if (timeEl) timeEl.textContent = formatTime(msg.created_at);
}

// ════════════════════════════════════════════════════════════
//  Рейтинг-банер
// ════════════════════════════════════════════════════════════
function showRatingBanner() {
  if (!ratingBanner || ratingShown) return;
  ratingShown = true;
  ratingBanner.style.display = "flex";

  // Скидаємо зірки
  ratingBanner.querySelectorAll(".rating-star").forEach(s => s.classList.remove("active"));
}

window.submitRating = async function(stars) {
  if (!currentChatId) return;
  try {
    await apiFetch(`/api/chats/${currentChatId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: ME.id, rating: stars }),
    });
    ratingBanner.style.display = "none";
  } catch (e) {
    alert("Помилка: " + e.message);
  }
};

window.dismissRating = function() {
  ratingBanner.style.display = "none";
};

// Hover по зірках
document.querySelectorAll(".rating-star").forEach(star => {
  star.addEventListener("mouseover", () => {
    const val = Number(star.dataset.value);
    document.querySelectorAll(".rating-star").forEach(s => {
      s.classList.toggle("active", Number(s.dataset.value) <= val);
    });
  });
  star.addEventListener("mouseout", () => {
    document.querySelectorAll(".rating-star").forEach(s => s.classList.remove("active"));
  });
  star.addEventListener("click", () => submitRating(Number(star.dataset.value)));
});

// ════════════════════════════════════════════════════════════
//  Прикріплення фото
// ════════════════════════════════════════════════════════════
if (attachBtn && fileInput) {
  attachBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src            = e.target.result;
      previewWrap.style.display = "flex";
    };
    reader.readAsDataURL(file);
  });
}

if (previewRemove) {
  previewRemove.addEventListener("click", clearImagePreview);
}

function clearImagePreview() {
  if (fileInput)   fileInput.value      = "";
  if (previewWrap) previewWrap.style.display = "none";
  if (previewImg)  previewImg.src       = "";
}

// ════════════════════════════════════════════════════════════
//  Пошук по чатах (фронтенд)
// ════════════════════════════════════════════════════════════
if (chatSearch) {
  chatSearch.addEventListener("input", () => {
    const q = chatSearch.value.toLowerCase();
    document.querySelectorAll(".chat-list-item").forEach(item => {
      const name = item.querySelector(".chat-list-name")?.textContent.toLowerCase() || "";
      item.style.display = name.includes(q) ? "" : "none";
    });
  });
}

// ════════════════════════════════════════════════════════════
//  Enter для надсилання
// ════════════════════════════════════════════════════════════
if (msgInput) {
  msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
}

// ════════════════════════════════════════════════════════════
//  Мобільний — кнопка "назад"
// ════════════════════════════════════════════════════════════
window.closeChatMobile = function() {
  chatArea.classList.remove("mobile-open");
  stopPolling();
  currentChatId = null;
};

// ════════════════════════════════════════════════════════════
//  Допоміжні функції
// ════════════════════════════════════════════════════════════
async function apiFetch(url, options = {}) {
  const res  = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Помилка запиту");
  return data;
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = now - d;

  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }
  if (diff < 2 * 86400000) return "Вчора";

  const days = ["Нд","Пн","Вт","Ср","Чт","Пт","Сб"];
  if (diff < 7 * 86400000) return days[d.getDay()];

  return d.toLocaleDateString("uk-UA", { day:"numeric", month:"short" });
}

function formatMsgTime(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function formatDateLabel(dateStr) {
  const d   = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return "Сьогодні";
  if (diff < 2 * 86400000) return "Вчора";
  return d.toLocaleDateString("uk-UA", { day:"numeric", month:"long", year:"numeric" });
}

// ════════════════════════════════════════════════════════════
//  Старт
// ════════════════════════════════════════════════════════════
init();