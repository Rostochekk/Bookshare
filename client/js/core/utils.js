// ── Toast ──────────────────────────────────────────────────
export function showToast(message, type = "success") {
  document.querySelector(".bs-toast")?.remove();

  const toast = document.createElement("div");
  toast.className = `bs-toast bs-toast--${type}`;
  toast.innerHTML = `
    <span class="bs-toast__icon">
      ${type === "success"
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      }
    </span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("bs-toast--visible"));
  setTimeout(() => {
    toast.classList.remove("bs-toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Confirm modal ──────────────────────────────────────────
export function showConfirm({ title, message, confirmText = "Видалити", onConfirm }) {
  document.querySelector(".bs-modal-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "bs-modal-overlay";
  overlay.innerHTML = `
    <div class="bs-modal">
      <div class="bs-modal__icon bs-modal__icon--danger">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </div>
      <h3 class="bs-modal__title">${title}</h3>
      <p class="bs-modal__message">${message}</p>
      <div class="bs-modal__actions">
        <button class="bs-modal__cancel">Скасувати</button>
        <button class="bs-modal__confirm">${confirmText}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("bs-modal-overlay--visible"));

  const close = () => {
    overlay.classList.remove("bs-modal-overlay--visible");
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector(".bs-modal__cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector(".bs-modal__confirm").addEventListener("click", () => {
    close();
    onConfirm();
  });
}

// ── Plural ─────────────────────────────────────────────────
export function pluralBooks(n) {
  if (n % 10 === 1 && n % 100 !== 11) return "книга";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "книги";
  return "книг";
}

// ── Date formatting ─────────────────────────────────────────
export function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("uk-UA", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function formatTime(dateStr) {
  if (!dateStr) return "";
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = now - d;

  if (diff < 86400000 && d.getDate() === now.getDate())
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diff < 2 * 86400000) return "Вчора";

  const days = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  if (diff < 7 * 86400000) return days[d.getDay()];
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

export function formatMsgTime(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDateLabel(dateStr) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return "Сьогодні";
  if (diff < 2 * 86400000) return "Вчора";
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
}

// ── HTML escaping ──────────────────────────────────────────
export function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
