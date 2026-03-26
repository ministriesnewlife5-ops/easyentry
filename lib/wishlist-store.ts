// Wishlist storage utility - stores liked events in localStorage

const WISHLIST_KEY = 'easyentry.wishlist';

export interface WishlistEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  price: string;
  imageUrl?: string;
  category: string;
  addedAt: number;
}

export function getWishlist(): WishlistEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(WISHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToWishlist(event: Omit<WishlistEvent, 'addedAt'>): void {
  if (typeof window === 'undefined') return;
  const wishlist = getWishlist();
  const exists = wishlist.find(item => item.id === event.id);
  
  if (!exists) {
    const newItem: WishlistEvent = { ...event, addedAt: Date.now() };
    localStorage.setItem(WISHLIST_KEY, JSON.stringify([...wishlist, newItem]));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('wishlist-updated', { detail: { count: wishlist.length + 1 } }));
  }
}

export function removeFromWishlist(eventId: string): void {
  if (typeof window === 'undefined') return;
  const wishlist = getWishlist();
  const filtered = wishlist.filter(item => item.id !== eventId);
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(filtered));
  // Dispatch custom event to notify other components
  window.dispatchEvent(new CustomEvent('wishlist-updated', { detail: { count: filtered.length } }));
}

export function isInWishlist(eventId: string): boolean {
  if (typeof window === 'undefined') return false;
  const wishlist = getWishlist();
  return wishlist.some(item => item.id === eventId);
}

export function toggleWishlist(event: Omit<WishlistEvent, 'addedAt'>): boolean {
  const isLiked = isInWishlist(event.id);
  if (isLiked) {
    removeFromWishlist(event.id);
    return false;
  } else {
    addToWishlist(event);
    return true;
  }
}
