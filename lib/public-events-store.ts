/// <reference types="node" />
import { supabase, type PublishedEvent } from './supabase';
import type { EventRequest } from './event-request-store';

type PublicEventTicketCategory = {
  id: string;
  name: string;
  tagline?: string;
  price: number;
  originalPrice?: number;
  quantity?: number;
  availableFrom?: string;
  availableUntil?: string;
  discount?: number;
  platformFee?: number;
  paymentGatewayFee?: number;
  gstPercent?: number;
  artistShare?: number;
  influencerShare?: number;
};

type PublicEventTaggedArtist = {
  id: string;
  name: string;
  email?: string;
  profileUrl: string;
  imageUrl?: string;
};

export type PublicEventCouponRule = {
  code: string;
  discountPercent: number;
  sourceType: 'outlet' | 'artist' | 'promoter' | 'influencer';
  sourceId?: string;
  sourceName?: string;
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
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
  couponRules?: PublicEventCouponRule[];
  locationState?: string;
  locationDistrict?: string;
  locationArea?: string;
  googleMapsLink?: string;
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
  subcategory?: string;
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
  locationState?: string;
  locationDistrict?: string;
  locationArea?: string;
  price: string;
  imageColor: string;
  category: string;
  subcategory?: string;
  imageUrl: string;
  createdAt: number;
};

// Map PublicEvent to database schema
function mapEventToDb(event: Partial<PublicEvent> & { sourceRequestId?: string }): Record<string, unknown> {
  const allMediaRaw = Array.from(
    new Set([...(event.images || []), ...(event.mediaFiles || [])].filter(Boolean))
  );
  const { images: allImages, videos: allVideos } = splitMediaFiles(allMediaRaw);
  const allMedia = [...allImages, ...allVideos];
  const preferredImage =
    event.image && !isVideoUrl(event.image)
      ? event.image
      : allImages[0] || null;
  const parsedTicketPrice = Number(String(event.price || '').replace(/[^\d.]/g, ''));
  const socialLinks: Record<string, unknown> = {};

  if (event.googleMapsLink) socialLinks.googleMapsLink = event.googleMapsLink;
  if (event.venue) socialLinks.venue = event.venue;
  if (event.distance) socialLinks.distance = event.distance;
  if (event.gatesOpen) socialLinks.gatesOpen = event.gatesOpen;
  if (event.entryAge) socialLinks.entryAge = event.entryAge;
  if (event.layout) socialLinks.layout = event.layout;
  if (event.seating) socialLinks.seating = event.seating;
  if (event.promoterName) socialLinks.promoterName = event.promoterName;
  if (event.promoterLabel) socialLinks.promoterLabel = event.promoterLabel;
  if (event.subtitle) socialLinks.subtitle = event.subtitle;
  if (Array.isArray(event.couponRules) && event.couponRules.length > 0) {
    socialLinks.couponRules = event.couponRules;
  }
  if (event.locationState) socialLinks.locationState = event.locationState;
  if (event.locationDistrict) socialLinks.locationDistrict = event.locationDistrict;
  if (event.locationArea) socialLinks.locationArea = event.locationArea;

  return {
    title: event.title || 'Untitled Event',
    date: event.date || new Date().toISOString().split('T')[0],
    // Store canonical start time into `time` (DB existing TIME column) when possible.
    // Also store `start_time`, `end_time` (new columns) and `event_time_label` for display when the input is a range.
    time: (() => {
      const raw = typeof event.time === 'string' ? event.time.trim() : '';
      if (!raw) return null;
      const parts = raw.includes('-') ? raw.split('-').map((s) => s.trim()) : [raw];
      // prefer first segment as the canonical time value
      return parts[0] || null;
    })(),
    start_time: (() => {
      const raw = typeof event.time === 'string' ? event.time.trim() : '';
      if (!raw) return null;
      const parts = raw.includes('-') ? raw.split('-').map((s) => s.trim()) : [raw];
      return parts[0] || null;
    })(),
    end_time: (() => {
      const raw = typeof event.time === 'string' ? event.time.trim() : '';
      if (!raw) return null;
      const parts = raw.includes('-') ? raw.split('-').map((s) => s.trim()) : [raw];
      return parts[1] || null;
    })(),
    event_time_label: typeof event.time === 'string' && event.time ? event.time : null,
    description: event.description || event.fullDescription || null,
    venue_id: null,
    organizer_id: null,
    event_type: event.category || null,
    category: event.category || null,
    image_url: preferredImage,
    gallery_images: allMedia,
    ticket_price: Number.isFinite(parsedTicketPrice) ? parsedTicketPrice : null,
    ticket_url: null,
    max_attendance: null,
    tags: event.subcategory ? [event.subcategory] : null,
    is_featured: false,
    is_public: true,
    status: 'upcoming',
    social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
    request_id: event.sourceRequestId || null,
  };
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v|avi)(\?|#|$)/i.test(url);
}

function splitMediaFiles(media: string[]): { images: string[]; videos: string[] } {
  const images: string[] = [];
  const videos: string[] = [];

  for (const item of media) {
    if (!item) continue;
    if (isVideoUrl(item)) {
      videos.push(item);
    } else {
      images.push(item);
    }
  }

  return { images, videos };
}

// Map database record to PublicEvent
function mapDbToEvent(
  record: Record<string, unknown>,
  ticketCategoriesOverride?: PublicEventTicketCategory[],
  taggedArtistsOverride?: PublicEventTaggedArtist[]
): PublicEvent {
  const gallery = (record.gallery_images as string[]) || [];
  const { images: imageGallery, videos } = splitMediaFiles(gallery);
  const rawImageUrl = (record.image_url as string) || '';
  const imageUrl = (rawImageUrl && !isVideoUrl(rawImageUrl) ? rawImageUrl : '') || imageGallery[0] || '';
  const images = imageGallery.length > 0 ? imageGallery : imageUrl ? [imageUrl] : [];
  const ticketCategoriesFromRecord = Array.isArray(record.ticket_categories)
    ? (record.ticket_categories as PublicEventTicketCategory[])
    : [];
  const ticketCategories = ticketCategoriesOverride ?? ticketCategoriesFromRecord;
  const taggedArtists = taggedArtistsOverride ?? [];
  const tags = Array.isArray(record.tags)
    ? (record.tags as unknown[]).filter((tag): tag is string => typeof tag === 'string')
    : [];
  const subcategory = tags[0] || undefined;
  const socialLinks = (record.social_links as Record<string, unknown> | null) || null;
  const googleMapsLink =
    socialLinks && typeof socialLinks.googleMapsLink === 'string'
      ? socialLinks.googleMapsLink
      : undefined;
  const locationState = socialLinks && typeof socialLinks.locationState === 'string' ? socialLinks.locationState : undefined;
  const locationDistrict = socialLinks && typeof socialLinks.locationDistrict === 'string' ? socialLinks.locationDistrict : undefined;
  const locationArea = socialLinks && typeof socialLinks.locationArea === 'string' ? socialLinks.locationArea : undefined;
  const couponRules = socialLinks && Array.isArray((socialLinks as Record<string, unknown>).couponRules)
    ? ((socialLinks as Record<string, unknown>).couponRules as Array<Record<string, unknown>>)
        .map((rule) => ({
          code: typeof rule.code === 'string' ? rule.code.trim().toUpperCase() : '',
          discountPercent: Number(rule.discountPercent || 0),
          sourceType: (typeof rule.sourceType === 'string' ? rule.sourceType : 'outlet') as PublicEventCouponRule['sourceType'],
          sourceId: typeof rule.sourceId === 'string' ? rule.sourceId : undefined,
          sourceName: typeof rule.sourceName === 'string' ? rule.sourceName : undefined,
          startsAt: typeof rule.startsAt === 'string' ? rule.startsAt : undefined,
          endsAt: typeof rule.endsAt === 'string' ? rule.endsAt : undefined,
          maxUses: Number.isFinite(Number(rule.maxUses)) ? Number(rule.maxUses) : undefined,
        }))
        .filter((rule) => Boolean(rule.code) && rule.discountPercent > 0 && rule.discountPercent <= 100)
    : undefined;
  const venue = socialLinks && typeof socialLinks.venue === 'string' ? socialLinks.venue : '';
  const distance = socialLinks && typeof socialLinks.distance === 'string' ? socialLinks.distance : 'Newly published event';
  const gatesOpen = socialLinks && typeof socialLinks.gatesOpen === 'string' ? socialLinks.gatesOpen : '';
  const entryAge = socialLinks && typeof socialLinks.entryAge === 'string' ? socialLinks.entryAge : '';
  const layout = socialLinks && typeof socialLinks.layout === 'string' ? socialLinks.layout : '';
  const seating = socialLinks && typeof socialLinks.seating === 'string' ? socialLinks.seating : '';
  const promoterName = socialLinks && typeof socialLinks.promoterName === 'string' ? socialLinks.promoterName : '';
  const promoterLabel =
    socialLinks && typeof socialLinks.promoterLabel === 'string' ? socialLinks.promoterLabel : 'Published Event';
  const subtitle = socialLinks && typeof socialLinks.subtitle === 'string'
    ? socialLinks.subtitle
    : (record.description as string)?.substring(0, 100) || '';

  return {
    id: record.id as string,
    title: (record.title as string) || '',
    subtitle,
    date: (record.date as string) || '',
    // Build display time: prefer explicit label, then start-end, then single time
    time: (() => {
      const label = (record.event_time_label as string) || '';
      if (label) return label;
      const start = record.start_time as string | null;
      const end = record.end_time as string | null;
      if (start && end) return `${start} - ${end}`;
      return (record.time as string) || '';
    })(),
    venue,
    couponRules,
    locationState,
    locationDistrict,
    locationArea,
    googleMapsLink,
    distance,
    gatesOpen,
    price: (record.ticket_price as number)?.toString() || '0',
    priceSubtext: 'onwards',
    image: imageUrl,
    images,
    mediaFiles: videos,
    description: (record.description as string) || '',
    fullDescription: (record.description as string) || '',
    category: (record.category as string) || (record.event_type as string) || '',
    subcategory,
    entryAge,
    layout,
    seating,
    promoterName,
    promoterLabel,
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
    .select('id, name, tagline, price, original_price, quantity, available_from, available_until, discount, platform_fee, payment_gateway_fee, gst_percent, artist_share, influencer_share')
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
    tagline: typeof row.tagline === 'string' ? row.tagline : undefined,
    price: Number(row.price || 0),
    originalPrice: row.original_price == null ? undefined : Number(row.original_price),
    quantity: row.quantity == null ? undefined : Number(row.quantity),
    availableFrom: typeof row.available_from === 'string' ? row.available_from : undefined,
    availableUntil: typeof row.available_until === 'string' ? row.available_until : undefined,
    discount: row.discount == null ? undefined : Number(row.discount),
    platformFee: row.platform_fee == null ? undefined : Number(row.platform_fee),
    paymentGatewayFee: row.payment_gateway_fee == null ? undefined : Number(row.payment_gateway_fee),
    gstPercent: row.gst_percent == null ? undefined : Number(row.gst_percent),
    artistShare: row.artist_share == null ? undefined : Number(row.artist_share),
    influencerShare: row.influencer_share == null ? undefined : Number(row.influencer_share),
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
    tagline: typeof cat.tagline === 'string' ? cat.tagline : undefined,
    price: Number(cat.price || 0),
    originalPrice: cat.originalPrice == null ? undefined : Number(cat.originalPrice),
    quantity: cat.quantity == null ? undefined : Number(cat.quantity),
    availableFrom: cat.availableFrom,
    availableUntil: cat.availableUntil,
    discount: cat.discount == null ? undefined : Number(cat.discount),
    platformFee: cat.platformFee == null ? undefined : Number(cat.platformFee),
    artistShare: cat.artistShare == null ? undefined : Number(cat.artistShare),
    influencerShare: cat.influencerShare == null ? undefined : Number(cat.influencerShare),
    gstPercent: cat.gstPercent == null ? undefined : Number(cat.gstPercent),
  }));
}

function mergeTicketCategoriesWithSource(
  dbCategories: PublicEventTicketCategory[],
  sourceCategories: PublicEventTicketCategory[]
): PublicEventTicketCategory[] {
  if (dbCategories.length === 0) {
    return sourceCategories;
  }

  if (sourceCategories.length === 0) {
    return dbCategories;
  }

  const byId = new Map(
    sourceCategories
      .filter((cat) => cat.id)
      .map((cat) => [cat.id, cat])
  );
  const byNameAndPrice = new Map(
    sourceCategories.map((cat) => [
      `${cat.name.trim().toLowerCase()}::${Number(cat.price || 0)}`,
      cat,
    ])
  );

  return dbCategories.map((cat) => {
    const sourceById = cat.id ? byId.get(cat.id) : undefined;
    const sourceByNameAndPrice = byNameAndPrice.get(
      `${cat.name.trim().toLowerCase()}::${Number(cat.price || 0)}`
    );
    const source = sourceById ?? sourceByNameAndPrice;

    if (!source) {
      return cat;
    }

    return {
      ...source,
      ...cat,
      tagline: cat.tagline ?? source.tagline,
    };
  });
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

  const { data: artistProfilesData } = await supabase
    .from('artist_profiles')
    .select('user_id, social_media')
    .in('user_id', ids);

  const profileImageByUserId = new Map<string, string>();
  for (const profile of (artistProfilesData as Array<Record<string, unknown>> | null) || []) {
    const userId = String(profile.user_id || '');
    const socialMediaRaw = profile.social_media;
    if (!userId || typeof socialMediaRaw !== 'string') continue;

    try {
      const social = JSON.parse(socialMediaRaw) as Record<string, unknown>;
      const profileImage = typeof social.profileImage === 'string' ? social.profileImage.trim() : '';
      if (profileImage) {
        profileImageByUserId.set(userId, profileImage);
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const usersById = new Map(
    ((artistsData as Array<Record<string, unknown>> | null) || []).map((user) => [
      String(user.id),
      {
        name: typeof user.name === 'string' ? user.name : '',
        email: typeof user.email === 'string' ? user.email : undefined,
        imageUrl: profileImageByUserId.get(String(user.id)),
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
      imageUrl: user?.imageUrl,
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

function getEventEndTimestamp(dateValue: string, timeValue?: string): number {
  if (!dateValue) return Number.POSITIVE_INFINITY;

  const normalizedTime = (timeValue || '').trim();
  const endTime = normalizedTime.includes('-')
    ? normalizedTime.split('-').pop()?.trim() || ''
    : normalizedTime;

  if (endTime) {
    const parsedWithTime = new Date(`${dateValue}T${endTime}`);
    if (!Number.isNaN(parsedWithTime.getTime())) {
      return parsedWithTime.getTime();
    }
  }

  const parsedEndOfDay = new Date(`${dateValue}T23:59:59`);
  if (!Number.isNaN(parsedEndOfDay.getTime())) {
    return parsedEndOfDay.getTime();
  }

  const fallback = new Date(dateValue);
  return Number.isNaN(fallback.getTime()) ? Number.POSITIVE_INFINITY : fallback.getTime();
}

async function purgeEndedPublishedEvents(): Promise<number> {
  const { data, error } = await supabase
    .from('published_events')
    .select('id, date, time')
    .eq('is_public', true);

  if (error || !data) {
    if (error) {
      console.error('Failed to scan published events for expiry:', error.message);
    }
    return 0;
  }

  const now = Date.now();
  const endedEventIds = (data as Array<Record<string, unknown>>)
    .filter((record) => {
      const dateValue = typeof record.date === 'string' ? record.date : '';
      const timeValue = typeof record.time === 'string' ? record.time : undefined;
      return getEventEndTimestamp(dateValue, timeValue) < now;
    })
    .map((record) => String(record.id || ''))
    .filter(Boolean);

  if (endedEventIds.length === 0) {
    return 0;
  }

  const { error: deleteError } = await supabase
    .from('published_events')
    .delete()
    .in('id', endedEventIds);

  if (deleteError) {
    console.error('Failed to delete ended published events:', deleteError.message);
    return 0;
  }

  return endedEventIds.length;
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
    couponRules: request.eventData.couponRules,
    locationState: request.eventData.locationState,
    locationDistrict: request.eventData.locationDistrict,
    locationArea: request.eventData.locationArea,
    googleMapsLink: request.eventData.googleMapsLink,
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
    subcategory: request.eventData.subcategory,
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
  await purgeEndedPublishedEvents();

  const { data, error } = await supabase
    .from('published_events')
    .select('*')
    .eq('is_public', true)
    .order('published_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get published events: ${error.message}`);
  }

  return (data as Record<string, unknown>[])?.map((record) => mapDbToEvent(record)) || [];
}

/**
 * Get published event by ID
 */
export async function getPublishedEventById(id: string): Promise<PublicEvent | undefined> {
  await purgeEndedPublishedEvents();

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
  let sourceRequestTicketCategories: PublicEventTicketCategory[] = [];

  if (requestId) {
    sourceRequestTicketCategories = await getTicketCategoriesFromSourceRequest(requestId);

    if (ticketCategories.length === 0) {
      ticketCategories = sourceRequestTicketCategories;
    } else {
      ticketCategories = mergeTicketCategoriesWithSource(ticketCategories, sourceRequestTicketCategories);
    }
  }

  if (requestId) {
    taggedArtists = await getTaggedArtistsFromSourceRequest(requestId);
  }

  return mapDbToEvent(data as Record<string, unknown>, ticketCategories, taggedArtists);
}

/**
 * Get published event cards (for listings)
 */
export async function getPublishedEventCards(): Promise<PublicEventCard[]> {
  await purgeEndedPublishedEvents();

  const events = await getAllPublishedEvents();
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    venue: event.venue,
    locationState: event.locationState,
    locationDistrict: event.locationDistrict,
    locationArea: event.locationArea,
    price: event.price,
    imageColor: getImageColor(event.category),
    category: event.category,
    subcategory: event.subcategory,
    imageUrl: event.image,
    createdAt: event.publishedAt,
  }));
}

/**
 * Publish an event from an approved request
 */
export async function publishEventFromRequest(request: EventRequest): Promise<PublicEvent> {
  const eventData = createApprovedEvent(request);
  const dbData = mapEventToDb({ ...eventData, sourceRequestId: request.id });

  try {
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
      if (error) {
        console.error('Failed to insert published event:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          dbData: dbData,
        });
        throw new Error(`Failed to create published event: ${error.message}`);
      }
      result = data;
    }

    const publishedEventId = (result as Record<string, unknown>).id as string;

    const { error: deleteTicketsError } = await supabase
      .from('ticket_categories')
      .delete()
      .eq('event_id', publishedEventId);

    if (deleteTicketsError) {
      console.error('Failed to delete existing ticket categories:', deleteTicketsError.message);
      throw new Error(`Failed to refresh ticket categories: ${deleteTicketsError.message}`);
    }

    const categories = request.eventData.ticketCategories || [];
    if (categories.length > 0) {
      const ticketInsertData = categories.map((cat) => ({
        event_id: publishedEventId,
        name: cat.name,
        tagline: cat.tagline ?? null,
        price: cat.price,
        original_price: cat.originalPrice ?? null,
        quantity: cat.quantity ?? null,
        available_from: cat.availableFrom ?? null,
        available_until: cat.availableUntil ?? null,
        discount: cat.discount ?? null,
        platform_fee: cat.platformFee ?? null,
        payment_gateway_fee: cat.paymentGatewayFee ?? null,
        gst_percent: cat.gstPercent ?? null,
        artist_share: cat.artistShare ?? null,
        influencer_share: cat.influencerShare ?? null,
        created_at: new Date().toISOString(),
      }));

      console.log('Inserting ticket categories:', {
        eventId: publishedEventId,
        categoriesCount: ticketInsertData.length,
        categories: ticketInsertData,
      });

      const { error: insertTicketsError } = await supabase
        .from('ticket_categories')
        .insert(ticketInsertData);

      if (insertTicketsError) {
        console.error('Failed to insert ticket categories:', {
          error: insertTicketsError.message,
          code: insertTicketsError.code,
          details: insertTicketsError.details,
          hint: insertTicketsError.hint,
        });
        throw new Error(`Failed to store ticket categories: ${insertTicketsError.message}`);
      }
    }

    const ticketCategories = await getTicketCategoriesByEventId(publishedEventId);
    const publishedEvent = mapDbToEvent(result as Record<string, unknown>, ticketCategories);
    
    console.log('Event published successfully:', {
      eventId: publishedEventId,
      title: publishedEvent.title,
      ticketCategoriesCount: ticketCategories.length,
    });

    return publishedEvent;
  } catch (error) {
    console.error('Error in publishEventFromRequest:', {
      error: error instanceof Error ? error.message : String(error),
      requestId: request.id,
      eventTitle: request.eventData.title,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
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
  const dbData = mapEventToDb(event);

  const { data, error } = await supabase
    .from('published_events')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create published event: ${error.message}`);
  }

  return mapDbToEvent(data as Record<string, unknown>);
}

/**
 * Update a published event
 */
export async function updatePublishedEvent(
  id: string,
  updates: Partial<PublicEvent>
): Promise<PublicEvent | undefined> {
  const existing = await getPublishedEventById(id);
  if (!existing) {
    return undefined;
  }

  const merged: PublicEvent = {
    ...existing,
    ...updates,
    sourceRequestId: updates.sourceRequestId ?? existing.sourceRequestId,
  };

  const dbData = mapEventToDb({
    ...merged,
    sourceRequestId: merged.sourceRequestId,
  });

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

  if (Array.isArray(merged.ticketCategories)) {
    const { error: deleteTicketsError } = await supabase
      .from('ticket_categories')
      .delete()
      .eq('event_id', id);

    if (deleteTicketsError) {
      throw new Error(`Failed to refresh ticket categories: ${deleteTicketsError.message}`);
    }

    if (merged.ticketCategories.length > 0) {
      const ticketInsertData = merged.ticketCategories.map((cat) => ({
        event_id: id,
        name: cat.name,
        tagline: cat.tagline ?? null,
        price: cat.price,
        original_price: cat.originalPrice ?? null,
        quantity: cat.quantity ?? null,
        available_from: cat.availableFrom ?? null,
        available_until: cat.availableUntil ?? null,
        discount: cat.discount ?? null,
        platform_fee: cat.platformFee ?? null,
        payment_gateway_fee: cat.paymentGatewayFee ?? null,
        artist_share: cat.artistShare ?? null,
        influencer_share: cat.influencerShare ?? null,
        created_at: new Date().toISOString(),
      }));

      const { error: insertTicketsError } = await supabase
        .from('ticket_categories')
        .insert(ticketInsertData);

      if (insertTicketsError) {
        throw new Error(`Failed to store ticket categories: ${insertTicketsError.message}`);
      }
    }
  }

  return mapDbToEvent(data as Record<string, unknown>);
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
  await purgeEndedPublishedEvents();

  const { data, error } = await supabase
    .from('published_events')
    .select('*')
    .eq('status', status)
    .eq('is_public', true)
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Failed to get events by status: ${error.message}`);
  }

  return (data as Record<string, unknown>[])?.map((record) => mapDbToEvent(record)) || [];
}

/**
 * Get featured events
 */
export async function getFeaturedEvents(): Promise<PublicEvent[]> {
  await purgeEndedPublishedEvents();

  const { data, error } = await supabase
    .from('published_events')
    .select('*')
    .eq('is_featured', true)
    .eq('is_public', true)
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Failed to get featured events: ${error.message}`);
  }

  return (data as Record<string, unknown>[])?.map((record) => mapDbToEvent(record)) || [];
}
