import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type EventRequestStatus = 'pending' | 'approved' | 'rejected';

export type EventRequest = {
  id: string;
  outletUserId: string;
  outletName: string;
  eventData: {
    title: string;
    subtitle: string;
    date: string;
    time: string;
    venue: string;
    category: string;
    price: string;
    image: string;
    mediaFiles?: string[];
    numberOfTickets?: string;
    rules?: string[];
    ticketCategories?: Array<{ id: string; name: string; price: number; availableFrom?: string; availableUntil?: string }>;
    description: string;
    fullDescription: string;
    gatesOpen: string;
    entryAge: string;
    layout: string;
    seating: string;
  };
  status: EventRequestStatus;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
};

const STORAGE_KEY = 'easyentry.event-requests';
const STORAGE_DIR = path.join(process.cwd(), '.easyentry-data');
const STORAGE_FILE = path.join(STORAGE_DIR, 'event-requests.json');

let eventRequestsCache: EventRequest[] | null = null;

function ensureServerStorageFile() {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }

  if (!existsSync(STORAGE_FILE)) {
    writeFileSync(STORAGE_FILE, '[]', 'utf8');
  }
}

function isValidEventRequest(value: unknown): value is EventRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const request = value as Partial<EventRequest>;
  const eventData = request.eventData as EventRequest['eventData'] | undefined;

  return (
    typeof request.id === 'string' &&
    typeof request.outletUserId === 'string' &&
    typeof request.outletName === 'string' &&
    typeof request.status === 'string' &&
    typeof request.submittedAt === 'number' &&
    Boolean(eventData) &&
    typeof eventData?.title === 'string' &&
    typeof eventData?.subtitle === 'string' &&
    typeof eventData?.date === 'string' &&
    typeof eventData?.time === 'string' &&
    typeof eventData?.venue === 'string' &&
    typeof eventData?.category === 'string' &&
    typeof eventData?.price === 'string' &&
    typeof eventData?.image === 'string' &&
    (eventData?.mediaFiles === undefined || Array.isArray(eventData?.mediaFiles)) &&
    (eventData?.numberOfTickets === undefined || typeof eventData?.numberOfTickets === 'string') &&
    typeof eventData?.description === 'string' &&
    typeof eventData?.fullDescription === 'string' &&
    typeof eventData?.gatesOpen === 'string' &&
    typeof eventData?.entryAge === 'string' &&
    typeof eventData?.layout === 'string' &&
    typeof eventData?.seating === 'string'
  );
}

function readServerStorage(): EventRequest[] {
  ensureServerStorageFile();

  try {
    const stored = readFileSync(STORAGE_FILE, 'utf8');
    const parsed = JSON.parse(stored) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidEventRequest);
  } catch (error) {
    console.error('Error reading event requests from file storage:', error);
    return [];
  }
}

function writeServerStorage(requests: EventRequest[]): void {
  ensureServerStorageFile();

  try {
    writeFileSync(STORAGE_FILE, JSON.stringify(requests, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving event requests to file storage:', error);
  }
}

function getStorage(): EventRequest[] {
  if (typeof window === 'undefined') {
    if (eventRequestsCache === null) {
      eventRequestsCache = readServerStorage();
    }
    return eventRequestsCache;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading event requests from localStorage:', e);
  }
  return [];
}

function setStorage(requests: EventRequest[]): void {
  if (typeof window === 'undefined') {
    eventRequestsCache = requests;
    writeServerStorage(requests);
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.error('Error saving event requests to localStorage:', e);
  }
}

export function getAllEventRequests(): EventRequest[] {
  return [...getStorage()];
}

export function getEventRequestsByOutlet(outletUserId: string): EventRequest[] {
  return getStorage().filter(r => r.outletUserId === outletUserId);
}

export function getEventRequestById(id: string): EventRequest | undefined {
  return getStorage().find(r => r.id === id);
}

export function createEventRequest(
  outletUserId: string,
  outletName: string,
  eventData: EventRequest['eventData']
): EventRequest {
  const requests = getStorage();
  const newRequest: EventRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    outletUserId,
    outletName,
    eventData,
    status: 'pending',
    submittedAt: Date.now(),
  };
  requests.push(newRequest);
  setStorage(requests);
  return newRequest;
}

export function updateEventRequestStatus(
  id: string,
  status: EventRequestStatus,
  reviewedBy: string,
  rejectionReason?: string
): EventRequest | undefined {
  const requests = getStorage();
  const request = requests.find(r => r.id === id);
  if (!request) return undefined;
  
  request.status = status;
  request.reviewedAt = Date.now();
  request.reviewedBy = reviewedBy;
  if (rejectionReason) {
    request.rejectionReason = rejectionReason;
  }
  setStorage(requests);
  return request;
}

export function deleteEventRequest(id: string): boolean {
  const requests = getStorage();
  const initialLength = requests.length;
  const filtered = requests.filter(r => r.id !== id);
  setStorage(filtered);
  return filtered.length < initialLength;
}
