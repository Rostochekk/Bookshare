const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=280&fit=crop";

export function withDefaultCover(book) {
  return { ...book, cover: book.cover || DEFAULT_COVER };
}

export function withDefaultCovers(books) {
  return books.map(withDefaultCover);
}
