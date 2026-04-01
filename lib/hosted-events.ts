export type HostedEventCard = {
  id: number;
  title: string;
  date: string;
  venue: string;
  price: string;
  imageColor: string;
  category: string;
  imageUrl: string;
  createdAt: number;
};

// Get hosted events from API (Supabase)
export async function getHostedEvents(): Promise<HostedEventCard[]> {
  try {
    const response = await fetch('/api/hosted-events');
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return (data.events || []).map((event: any) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      venue: event.venue,
      price: event.price,
      imageColor: event.image_color || 'bg-blue-900',
      category: event.category || 'General',
      imageUrl: event.image_url || '',
      createdAt: new Date(event.created_at).getTime(),
    }));
  } catch {
    return [];
  }
}

// Save hosted event via API (Supabase)
export async function saveHostedEvent(event: HostedEventCard): Promise<void> {
  try {
    await fetch('/api/hosted-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: event.id,
        title: event.title,
        date: event.date,
        venue: event.venue,
        price: event.price,
        category: event.category,
        image_url: event.imageUrl,
        image_color: event.imageColor,
      }),
    });
  } catch {
    // Silently fail
  }
}
