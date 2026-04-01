// Wishlist storage utility - now uses Supabase instead of localStorage

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

// Get wishlist from API
export async function getWishlist(): Promise<WishlistEvent[]> {
  try {
    const response = await fetch('/api/wishlist');
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return (data.wishlist || []).map((item: any) => ({
      id: item.event_id,
      title: item.event_title,
      date: item.event_date,
      venue: item.event_venue,
      price: item.event_price,
      imageUrl: item.event_image,
      category: 'General',
      addedAt: new Date(item.added_at).getTime(),
    }));
  } catch {
    return [];
  }
}

// Check if event is in wishlist
export async function isInWishlist(eventId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/wishlist?event_id=${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
    });
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.isInWishlist;
  } catch {
    return false;
  }
}

// Add event to wishlist
export async function addToWishlist(event: Omit<WishlistEvent, 'addedAt'>): Promise<void> {
  try {
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: event.id,
        event_title: event.title,
        event_date: event.date,
        event_venue: event.venue,
        event_price: event.price,
        event_image: event.imageUrl,
      }),
    });
    // Dispatch custom event to notify other components
    const wishlist = await getWishlist();
    window.dispatchEvent(new CustomEvent('wishlist-updated', { detail: { count: wishlist.length + 1 } }));
  } catch {
    // Silently fail
  }
}

// Remove event from wishlist
export async function removeFromWishlist(eventId: string): Promise<void> {
  try {
    await fetch(`/api/wishlist?event_id=${eventId}`, {
      method: 'DELETE',
    });
    // Dispatch custom event to notify other components
    const wishlist = await getWishlist();
    window.dispatchEvent(new CustomEvent('wishlist-updated', { detail: { count: wishlist.length } }));
  } catch {
    // Silently fail
  }
}

// Toggle wishlist status
export async function toggleWishlist(event: Omit<WishlistEvent, 'addedAt'>): Promise<boolean> {
  const isLiked = await isInWishlist(event.id);
  if (isLiked) {
    await removeFromWishlist(event.id);
    return false;
  } else {
    await addToWishlist(event);
    return true;
  }
}
