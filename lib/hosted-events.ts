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

const STORAGE_KEY = 'easyentry.hosted-events';

export function getHostedEvents(): HostedEventCard[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as HostedEventCard[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item && typeof item.id === 'number');
  } catch {
    return [];
  }
}

export function saveHostedEvent(event: HostedEventCard) {
  if (typeof window === 'undefined') {
    return;
  }
  const current = getHostedEvents();
  const next = [event, ...current];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
