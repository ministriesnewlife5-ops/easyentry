/// <reference types="node" />
import { supabase, type PublishedEvent } from './supabase';
import type { EventRequest } from './event-request-store';

type PublicEventTicketCategory = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  availableFrom?: string;
  availableUntil?: string;
};

type PublicEventTaggedArtist = {
  id: string;
  name: string;
  email?: string;
  profileUrl: string;
};

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
  ticketCategories?: PublicEventTicketCategory[];
  taggedArtists?: PublicEventTaggedArtist[];
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

// Map legacy PublicEvent to database schema
function mapLegacyToDb(event: Partial<PublicEvent> & { sourceRequestId?: string }): Record<string, unknown> {
  return {
    title: event.title || 'Untitled Event',
    date: event.date || new Date().toISOString().split('T')[0],
    time: event.time || null,
    description: event.description || event.fullDescription || null,
    venue_id: null,
    organizer_id: null,
    event_type: event.category || null,
    category: event.category || null,
    image_url: event.image || null,
    gallery_images: event.images || event.mediaFiles || null,
    ticket_price: event.price ? parseFloat(event.price) : null,
    ticket_url: null,
    max_attendance: null,
    tags: null,
    is_featured: false,
    is_public: true,
    status: 'upcoming',
    social_links: null,
    request_id: event.sourceRequestId || null,
  };
}

// Map database record to legacy PublicEvent
function mapDbToLegacy(
  record: Record<string, unknown>,
  ticketCategoriesOverride?: PublicEventTicketCategory[],
  taggedArtistsOverride?: PublicEventTaggedArtist[]
): PublicEvent {
  const gallery = (record.gallery_images as string[]) || [];
  const imageUrl = (record.image_url as string) || gallery[0] || '';
  const ticketCategoriesFromRecord = Array.isArray(record.ticket_categories)
    ? (record.ticket_categories as PublicEventTicketCategory[])
    : [];
  const ticketCategories = ticketCategoriesOverride ?? ticketCategoriesFromRecord;
  const taggedArtists = taggedArtistsOverride ?? [];

  return {
    id: record.id as string,
    title: (record.title as string) || '',
    subtitle: (record.description as string)?.substring(0, 100) || '',
    date: (record.date as string) || '',
    time: (record.time as string) || '',
    venue: '',
    distance: 'Newly published event',
    gatesOpen: '',
    price: (record.ticket_price as number)?.toString() || '0',
    priceSubtext: 'onwards',
    image: imageUrl,
    images: gallery,
    mediaFiles: gallery,
    description: (record.description as string) || '',
    fullDescription: (record.description as string) || '',
    category: (record.category as string) || (record.event_type as string) || '',
    entryAge: '',
    layout: '',
    seating: '',
    promoterName: '',
    promoterLabel: 'Published Event',
    highlights: [],
    thingsToKnow: [],
    artists: [],
    publishedAt: new Date(record.published_at as string).getTime(),
    sourceRequestId: (record.request_id as string) || undefined,
    ticketCategories,
    taggedArtists,
  };
}

async function getTicketCategoriesByEventId(eventId: string): Promise<PublicEventTicketCategory[]> {
  const { data, error } = await supabase
    .from('ticket_categories')
    .select('id, name, price, quantity, available_from, available_until')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    if (error) {
      console.error(`Failed to fetch ticket categories for event ${eventId}:`, error.message);
    }
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id || ''),
    name: String(row.name || 'General Admission'),
    price: Number(row.price || 0),
    quantity: row.quantity == null ? undefined : Number(row.quantity),
    availableFrom: typeof row.available_from === 'string' ? row.available_from : undefined,
    availableUntil: typeof row.available_until === 'string' ? row.available_until : undefined,
  }));
}

async function getTicketCategoriesFromSourceRequest(requestId: string): Promise<PublicEventTicketCategory[]> {
  const { data, error } = await supabase
    .from('event_requests')
    .select('event_data, ticket_categories')
    .eq('id', requestId)
    .single();

  if (error || !data) {
    return [];
  }

  const row = data as Record<string, unknown>;
  const eventData = row.event_data as Record<string, unknown> | null;
  const fromEventData = Array.isArray(eventData?.ticketCategories)
    ? (eventData?.ticketCategories as PublicEventTicketCategory[])
    : [];
  const fromColumn = Array.isArray(row.ticket_categories)
    ? (row.ticket_categories as PublicEventTicketCategory[])
    : [];

  const raw = fromEventData.length > 0 ? fromEventData : fromColumn;
  return raw.map((cat) => ({
    id: String(cat.id || ''),
    name: String(cat.name || 'General Admission'),
    price: Number(cat.price || 0),
    quantity: cat.quantity == null ? undefined : Number(cat.quantity),
    availableFrom: cat.availableFrom,
    availableUntil: cat.availableUntil,
  }));
}

async function getTaggedArtistsFromSourceRequest(requestId: string): Promise<PublicEventTaggedArtist[]> {
  const { data, error } = await supabase
    .from('event_requests')
    .select('event_data')
    .eq('id', requestId)
    .single();

  if (error || !data) {
    return [];
  }

  const row = data as Record<string, unknown>;
  const eventData = row.event_data as Record<string, unknown> | null;
  const rawTaggedArtists = Array.isArray(eventData?.taggedArtists)
    ? (eventData?.taggedArtists as Array<Record<string, unknown>>)
    : [];

  if (rawTaggedArtists.length === 0) {
    return [];
  }

  const normalized = rawTaggedArtists
    .map((artist) => ({
      id: String(artist.id || '').trim(),
      name: typeof artist.name === 'string' ? artist.name.trim() : '',
      email: typeof artist.email === 'string' ? artist.email : undefined,
    }))
    .filter((artist) => Boolean(artist.id));

  if (normalized.length === 0) {
    return [];
  }

  const ids = Array.from(new Set(normalized.map((artist) => artist.id)));
  const { data: artistsData } = await supabase
    .from('app_users')
    .select('id, name, email')
    .in('id', ids);

  const usersById = new Map(
    ((artistsData as Array<Record<string, unknown>> | null) || []).map((user) => [
      String(user.id),
      {
        name: typeof user.name === 'string' ? user.name : '',
        email: typeof user.email === 'string' ? user.email : undefined,
      },
    ])
  );

  return normalized.map((artist) => {
    const user = usersById.get(artist.id);
    const displayName = artist.name || user?.name || artist.email || user?.email || 'Artist';

    return {
      id: artist.id,
      name: displayName,
      email: artist.email || user?.email,
      profileUrl: `/artist/${artist.id}`,
    };
  });
}

function getImageColor(category: string): string {
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

function createApprovedEvent(request: EventRequest): Partial<PublicEvent> {
  const allImages = [request.eventData.image];
  if (request.eventData.mediaFiles && request.eventData.mediaFiles.length > 0) {
    allImages.push(...request.eventData.mediaFiles);
  }

  return {
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
      { iconKey: 'star', title: `${request.outletName} presents`, description: request.eventData.subtitle },
      { iconKey: 'zap', title: `${request.eventData.category} night`, description: request.eventData.description },
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
    ticketCategories: request.eventData.ticketCategories,
  };
}

/**
 * Get all published events
 */
export async function getAllPublishedEvents(): Promise<PublicEvent[]> {
  const { data, error } = await supabase
    .from('published_events')
    .select('*')
    .eq('is_public', true)
    .order('published_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get published events: ${error.message}`);
  }

  return (data as Record<string, unknown>[])?.map((record) => mapDbToLegacy(record)) || [];
}

/**
 * Get published event by ID
 */
export async function getPublishedEventById(id: string): Promise<PublicEvent | undefined> {
  const { data, error } = await supabase
    .from('published_events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return undefined;
    }
    throw new Error(`Failed to get published event: ${error.message}`);
  }

  let ticketCategories = await getTicketCategoriesByEventId(id);
  let taggedArtists: PublicEventTaggedArtist[] = [];
  const requestId = (data as Record<string, unknown>).request_id as string | null;

  if (ticketCategories.length === 0) {
    if (requestId) {
      ticketCategories = await getTicketCategoriesFromSourceRequest(requestId);
    }
  }

  if (requestId) {
    taggedArtists = await getTaggedArtistsFromSourceRequest(requestId);
  }

  return mapDbToLegacy(data as Record<string, unknown>, ticketCategories, taggedArtists);
}

/**
 * Get published event cards (for listings)
 */
export async function getPublishedEventCards(): Promise<PublicEventCard[]> {
  const events = await getAllPublishedEvents();
  return events.map((event) => ({
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

/**
 * Publish an event from an approved request
 */
export async function publishEventFromRequest(request: EventRequest): Promise<PublicEvent> {
  const eventData = createApprovedEvent(request);
  const dbData = mapLegacyToDb({ ...eventData, sourceRequestId: request.id });

  // Check if already published
  const { data: existing } = await supabase
    .from('published_events')
    .select('id')
    .eq('request_id', request.id)
    .single();

  let result;
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('published_events')
      .update(dbData)
      .eq('request_id', request.id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update published event: ${error.message}`);
    result = data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('published_events')
      .insert(dbData)
      .select()
      .single();
    if (error) throw new Error(`Failed to create published event: ${error.message}`);
    result = data;
  }

  const publishedEventId = (result as Record<string, unknown>).id as string;

  const { error: deleteTicketsError } = await supabase
    .from('ticket_categories')
    .delete()
    .eq('event_id', publishedEventId);

  if (deleteTicketsError) {
    throw new Error(`Failed to refresh ticket categories: ${deleteTicketsError.message}`);
  }

  const categories = request.eventData.ticketCategories || [];
  if (categories.length > 0) {
    const { error: insertTicketsError } = await supabase
      .from('ticket_categories')
      .insert(
        categories.map((cat) => ({
          event_id: publishedEventId,
          name: cat.name,
          price: cat.price,
          quantity: cat.quantity ?? null,
          available_from: cat.availableFrom ?? null,
          available_until: cat.availableUntil ?? null,
          created_at: new Date().toISOString(),
        }))
      );

    if (insertTicketsError) {
      throw new Error(`Failed to store ticket categories: ${insertTicketsError.message}`);
    }
  }

  const ticketCategories = await getTicketCategoriesByEventId(publishedEventId);
  return mapDbToLegacy(result as Record<string, unknown>, ticketCategories);
}

/**
 * Unpublish event by request ID
 */
export async function unpublishEventByRequestId(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('published_events')
    .delete()
    .eq('request_id', requestId);

  if (error) {
    console.error('Failed to unpublish event:', error.message);
    return false;
  }

  return true;
}

/**
 * Create a new published event (direct creation)
 */
export async function createPublishedEvent(event: Partial<PublicEvent>): Promise<PublicEvent> {
  const dbData = mapLegacyToDb(event);

  const { data, error } = await supabase
    .from('published_events')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create published event: ${error.message}`);
  }

  return mapDbToLegacy(data as Record<string, unknown>);
}

/**
 * Update a published event
 */
export async function updatePublishedEvent(
  id: string,
  updates: Partial<PublicEvent>
): Promise<PublicEvent | undefined> {
  const dbData: Record<string, unknown> = {};

  if (updates.title !== undefined) dbData.title = updates.title;
  if (updates.date !== undefined) dbData.date = updates.date;
  if (updates.time !== undefined) dbData.time = updates.time;
  if (updates.description !== undefined) dbData.description = updates.description;
  if (updates.image !== undefined) dbData.image_url = updates.image;
  if (updates.images !== undefined) dbData.gallery_images = updates.images;
  if (updates.category !== undefined) {
    dbData.category = updates.category;
    dbData.event_type = updates.category;
  }
  if (updates.price !== undefined) dbData.ticket_price = parseFloat(updates.price) || null;

  const { data, error } = await supabase
    .from('published_events')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return undefined;
    }
    throw new Error(`Failed to update published event: ${error.message}`);
  }

  return mapDbToLegacy(data as Record<string, unknown>);
}

/**
 * Delete a published event
 */
export async function deletePublishedEvent(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('published_events')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete published event:', error.message);
    return false;
  }

  return true;
}

/**
 * Get events by status
 */
export async function getPublishedEventsByStatus(status: string): Promise<PublicEvent[]> {
  const { data, error } = await supabase
    .from('published_events')
    .select('*')
    .eq('status', status)
    .eq('is_public', true)
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Failed to get events by status: ${error.message}`);
  }

  return (data as Record<string, unknown>[])?.map((record) => mapDbToLegacy(record)) || [];
}

/**
 * Get featured events
 */
export async function getFeaturedEvents(): Promise<PublicEvent[]> {
  const { data, error } = await supabase
    .from('published_events')
    .select('*')
    .eq('is_featured', true)
    .eq('is_public', true)
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Failed to get featured events: ${error.message}`);
  }

  return (data as Record<string, unknown>[])?.map((record) => mapDbToLegacy(record)) || [];
}
