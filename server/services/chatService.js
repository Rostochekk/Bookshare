export const RATING_THRESHOLD = 10;

export function buildAvatarUrl(name, storedAvatar, size = 48) {
  if (storedAvatar) return storedAvatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "?")}&background=00a870&color=fff&size=${size}`;
}

export function formatChatForUser(chat, userId) {
  const isBuyer     = String(chat.buyer_id) === String(userId);
  const otherName   = isBuyer ? chat.owner_name   : chat.buyer_name;
  const otherAvatar = isBuyer ? chat.owner_avatar  : chat.buyer_avatar;
  const otherId     = isBuyer ? chat.owner_id      : chat.buyer_id;

  return {
    id:           chat.id,
    book_id:      chat.book_id,
    book_title:   chat.book_title,
    book_author:  chat.book_author,
    book_cover:   chat.book_cover,
    other_id:     otherId,
    other_name:   otherName,
    other_avatar: buildAvatarUrl(otherName, otherAvatar),
    last_text:    chat.last_text || (chat.last_image ? "📷 Фото" : ""),
    last_time:    chat.last_time,
    unread_count: chat.unread_count || 0,
  };
}

export function shouldShowRating(totalCount, existingRating) {
  return totalCount >= RATING_THRESHOLD && !existingRating;
}
