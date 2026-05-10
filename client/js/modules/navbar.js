import { auth } from "../core/router.js";

export function initNavbar() {
  const profileIcon = document.querySelector(".profile-icon");
  if (!profileIcon) return;

  const dropdown = document.createElement("div");
  dropdown.className = "nav-dropdown";

  const user = auth.getUser();

  if (user) {
    dropdown.innerHTML = `
      <div class="nav-dropdown-user">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <span>${user.name}</span>
      </div>
      <div class="nav-dropdown-divider"></div>
      <a href="profile.html" class="nav-dropdown-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        Мій профіль
      </a>
      <a href="add-book.html" class="nav-dropdown-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        Додати книгу
      </a>
      <a href="chat.html" class="nav-dropdown-item nav-chats-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Мої чати
        <span class="nav-unread-badge" id="navUnreadBadge" style="display:none"></span>
      </a>
      <div class="nav-dropdown-divider"></div>
      <button class="nav-dropdown-item nav-dropdown-logout" id="logoutBtn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Вийти
      </button>
    `;
  } else {
    dropdown.innerHTML = `
      <a href="login.html" class="nav-dropdown-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        Увійти
      </a>
      <a href="reg.html" class="nav-dropdown-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
        Зареєструватись
      </a>
    `;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "nav-profile-wrap";
  profileIcon.parentNode.insertBefore(wrapper, profileIcon);
  wrapper.appendChild(profileIcon);
  wrapper.appendChild(dropdown);

  profileIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => dropdown.classList.remove("open"));
  dropdown.addEventListener("click", (e) => e.stopPropagation());

  const logoutBtn = dropdown.querySelector("#logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => auth.logout());
  }

  // ── Бейдж непрочитаних повідомлень ──────────────────────
  if (user) {
   loadUnreadCount(user.id);
   setInterval(() => loadUnreadCount(user.id), 3000); // кожні 10 секунд
  }
}

async function loadUnreadCount(userId) {
  try {
    const res = await fetch(`/api/chats?user_id=${userId}`);
    if (!res.ok) return;
    const chats = await res.json();
    const total = chats.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    updateUnreadBadge(total);
  } catch {}
}

function updateUnreadBadge(count) {
  // Бейдж у dropdown
  const dropdownBadge = document.getElementById("navUnreadBadge");
  if (dropdownBadge) {
    if (count > 0) {
      dropdownBadge.textContent = count > 99 ? "99+" : count;
      dropdownBadge.style.display = "inline-flex";
    } else {
      dropdownBadge.style.display = "none";
    }
  }

  // Бейдж на кнопці профілю (червона крапка)
  const profileIcon = document.querySelector(".profile-icon");
  if (profileIcon) {
    let dot = profileIcon.querySelector(".nav-profile-dot");
    if (count > 0) {
      if (!dot) {
        dot = document.createElement("span");
        dot.className = "nav-profile-dot";
        profileIcon.appendChild(dot);
      }
    } else {
      dot?.remove();
    }
  }
}