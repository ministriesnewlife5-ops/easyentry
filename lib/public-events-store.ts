import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { EventRequest } from '@/lib/event-request-store';

export type PublicEventHighlight = {
  iconKey: 'star' | 'zap';
  title: string;
  description: string;
};

export type PublicEventThingToKnow = {
  iconKey:
    | 'volume2'
    | 'clock3'
    | 'ticket'
    | 'users'
    | 'map-pinned'
    | 'armchair'
    | 'baby'
    | 'ban'
    | 'accessibility'
    | 'droplets';
  label: string;
  value: string;
};

export type PublicEventArtist = {
  id: number;
  name: string;
  role: string;
  image: string;
  songs: Array<{
    title: string;
    duration: string;
    language?: string;
  }>;
};

export type PublicEvent = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  distance: string;
  gatesOpen: string;
  price: string;
  priceSubtext: string;
  image: string;
  images: string[];
  mediaFiles?: string[];
  description: string;
  fullDescription: string;
  category: string;
  entryAge: string;
  layout: string;
  seating: string;
  promoterName: string;
  promoterLabel: string;
  highlights: PublicEventHighlight[];
  thingsToKnow: PublicEventThingToKnow[];
  artists: PublicEventArtist[];
  publishedAt: number;
  sourceRequestId?: string;
};

export type PublicEventCard = {
  id: string;
  title: string;
  date: string;
  venue: string;
  price: string;
  imageColor: string;
  category: string;
  imageUrl: string;
  createdAt: number;
};

const PUBLISHED_EVENTS_KEY = 'easyentry.published-events';
const STORAGE_DIR = path.join(process.cwd(), '.easyentry-data');
const STORAGE_FILE = path.join(STORAGE_DIR, 'published-events.json');

let publishedEventsCache: PublicEvent[] | null = null;

function ensureServerStorageFile() {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }

  if (!existsSync(STORAGE_FILE)) {
    writeFileSync(STORAGE_FILE, '[]', 'utf8');
  }
}

function isValidPublicEvent(value: unknown): value is PublicEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<PublicEvent>;

  return (
    typeof event.id === 'string' &&
    typeof event.title === 'string' &&
    typeof event.subtitle === 'string' &&
    typeof event.date === 'string' &&
    typeof event.time === 'string' &&
    typeof event.venue === 'string' &&
    typeof event.distance === 'string' &&
    typeof event.gatesOpen === 'string' &&
    typeof event.price === 'string' &&
    typeof event.priceSubtext === 'string' &&
    typeof event.image === 'string' &&
    Array.isArray(event.images) &&
    (event.mediaFiles === undefined || Array.isArray(event.mediaFiles)) &&
    typeof event.description === 'string' &&
    typeof event.fullDescription === 'string' &&
    typeof event.category === 'string' &&
    typeof event.entryAge === 'string' &&
    typeof event.layout === 'string' &&
    typeof event.seating === 'string' &&
    typeof event.promoterName === 'string' &&
    typeof event.promoterLabel === 'string' &&
    Array.isArray(event.highlights) &&
    Array.isArray(event.thingsToKnow) &&
    Array.isArray(event.artists) &&
    typeof event.publishedAt === 'number'
  );
}

function readServerStorage(): PublicEvent[] {
  ensureServerStorageFile();

  try {
    const stored = readFileSync(STORAGE_FILE, 'utf8');
    const parsed = JSON.parse(stored) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidPublicEvent);
  } catch (error) {
    console.error('Error reading published events from file storage:', error);
    return [];
  }
}

function writeServerStorage(events: PublicEvent[]): void {
  ensureServerStorageFile();

  try {
    writeFileSync(STORAGE_FILE, JSON.stringify(events, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving published events to file storage:', error);
  }
}

function getStorage(): PublicEvent[] {
  if (typeof window === 'undefined') {
    if (publishedEventsCache === null) {
      publishedEventsCache = readServerStorage();
    }
    return publishedEventsCache;
  }

  try {
    const stored = window.localStorage.getItem(PUBLISHED_EVENTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading published events from localStorage:', e);
  }
  return [];
}

function setStorage(events: PublicEvent[]): void {
  if (typeof window === 'undefined') {
    publishedEventsCache = events;
    writeServerStorage(events);
    return;
  }

  try {
    window.localStorage.setItem(PUBLISHED_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Error saving published events to localStorage:', e);
  }
}

function cloneEvent(event: PublicEvent): PublicEvent {
  return {
    ...event,
    images: [...event.images],
    mediaFiles: event.mediaFiles ? [...event.mediaFiles] : [],
    highlights: event.highlights.map((item) => ({ ...item })),
    thingsToKnow: event.thingsToKnow.map((item) => ({ ...item })),
    artists: event.artists.map((artist) => ({
      ...artist,
      songs: artist.songs.map((song) => ({ ...song })),
    })),
  };
}

function getImageColor(category: string) {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes('techno')) {
    return 'bg-gradient-to-br from-violet-500 to-fuchsia-600';
  }

  if (normalized.includes('edm') || normalized.includes('electronic')) {
    return 'bg-gradient-to-br from-blue-500 to-cyan-500';
  }

  if (normalized.includes('house')) {
    return 'bg-gradient-to-br from-orange-500 to-amber-500';
  }

  if (normalized.includes('bollywood') || normalized.includes('commercial')) {
    return 'bg-gradient-to-br from-[#E5A823] to-[#EB4D4B]';
  }

  return 'bg-gradient-to-br from-emerald-500 to-teal-500';
}

function createApprovedEvent(request: EventRequest): PublicEvent {
  // Combine main image with mediaFiles for the images array
  const allImages = [request.eventData.image];
  if (request.eventData.mediaFiles && request.eventData.mediaFiles.length > 0) {
    allImages.push(...request.eventData.mediaFiles);
  }

  return {
    id: `hosted-${request.id}`,
    title: request.eventData.title,
    subtitle: request.eventData.subtitle,
    date: request.eventData.date,
    time: request.eventData.time,
    venue: request.eventData.venue,
    distance: 'Newly approved event',
    gatesOpen: request.eventData.gatesOpen,
    price: request.eventData.price,
    priceSubtext: 'onwards',
    image: request.eventData.image,
    images: allImages,
    mediaFiles: request.eventData.mediaFiles || [],
    description: request.eventData.description,
    fullDescription: request.eventData.fullDescription,
    category: request.eventData.category,
    entryAge: request.eventData.entryAge,
    layout: request.eventData.layout,
    seating: request.eventData.seating,
    promoterName: request.outletName,
    promoterLabel: 'Outlet Hosted Event',
    highlights: [
      {
        iconKey: 'star',
        title: `${request.outletName} presents`,
        description: request.eventData.subtitle,
      },
      {
        iconKey: 'zap',
        title: `${request.eventData.category} night`,
        description: request.eventData.description,
      },
    ],
    thingsToKnow: [
      { iconKey: 'clock3', label: 'Event schedule', value: request.eventData.time },
      { iconKey: 'ticket', label: 'Ticket needed for', value: `ages ${request.eventData.entryAge} and above` },
      { iconKey: 'users', label: 'Entry allowed for', value: request.eventData.entryAge },
      { iconKey: 'map-pinned', label: 'Layout', value: request.eventData.layout },
      { iconKey: 'armchair', label: 'Seating Arrangement', value: request.eventData.seating },
      { iconKey: 'droplets', label: 'Washrooms', value: 'available' },
    ],
    artists: [],
    publishedAt: Date.now(),
    sourceRequestId: request.id,
  };
}

export function getAllPublishedEvents(): PublicEvent[] {
  return getStorage()
    .slice()
    .sort((left: PublicEvent, right: PublicEvent) => right.publishedAt - left.publishedAt)
    .map(cloneEvent);
}

export function getPublishedEventById(id: string): PublicEvent | undefined {
  const events = getStorage();
  const event = events.find((item: PublicEvent) => item.id === id);
  return event ? cloneEvent(event) : undefined;
}

export function getPublishedEventCards(): PublicEventCard[] {
  return getAllPublishedEvents().map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    venue: event.venue,
    price: event.price,
    imageColor: getImageColor(event.category),
    category: event.category,
    imageUrl: event.image,
    createdAt: event.publishedAt,
  }));
}

export function publishEventFromRequest(request: EventRequest): PublicEvent {
  const events = getStorage();
  const nextEvent = createApprovedEvent(request);
  const existingIndex = events.findIndex((item: PublicEvent) => item.sourceRequestId === request.id);

  if (existingIndex >= 0) {
    events[existingIndex] = nextEvent;
  } else {
    events.unshift(nextEvent);
  }
  
  setStorage(events);
  return cloneEvent(nextEvent);
}

export function unpublishEventByRequestId(requestId: string): boolean {
  const events = getStorage();
  const existingIndex = events.findIndex((item: PublicEvent) => item.sourceRequestId === requestId);

  if (existingIndex < 0) {
    return false;
  }

  events.splice(existingIndex, 1);
  setStorage(events);
  return true;
}
