import { NextRequest, NextResponse } from 'next/server';
import { getPublishedEventById } from '@/lib/public-events-store';
import { updatePublishedEvent } from '@/lib/public-events-store';
import { getEventRequestById, updateEventRequest } from '@/lib/event-request-store';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminRole } from '@/lib/roles';

type EventCouponRule = {
  code: string;
  discountPercent: number;
  sourceType: 'outlet' | 'artist' | 'promoter' | 'influencer';
  sourceId?: string;
  sourceName?: string;
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
};

type EventTicketCategory = {
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

type EventTaggedArtist = {
  id: string;
  name: string;
  email?: string;
  profileUrl: string;
  imageUrl?: string;
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCouponRules(value: unknown): { rules?: EventCouponRule[]; error?: string } {
  if (value == null) return {};
  if (!Array.isArray(value)) return { error: 'couponRules must be an array.' };

  const rules: EventCouponRule[] = [];

  for (const rawRule of value as Array<Record<string, unknown>>) {
    const code = normalizeText(rawRule.code).toUpperCase();
    const discountPercent = Number(rawRule.discountPercent || 0);
    const sourceType = normalizeText(rawRule.sourceType);
    const startsAt = normalizeText(rawRule.startsAt);
    const endsAt = normalizeText(rawRule.endsAt);
    const maxUses = rawRule.maxUses == null ? undefined : Number(rawRule.maxUses);

    if (!code) return { error: 'Each coupon rule must have a coupon code.' };
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      return { error: `Coupon ${code} must have discount percent between 1 and 100.` };
    }
    if (!['outlet', 'artist', 'promoter', 'influencer'].includes(sourceType)) {
      return { error: `Coupon ${code} has an invalid source type.` };
    }
    if (startsAt && Number.isNaN(new Date(startsAt).getTime())) {
      return { error: `Coupon ${code} has an invalid start time.` };
    }
    if (endsAt && Number.isNaN(new Date(endsAt).getTime())) {
      return { error: `Coupon ${code} has an invalid end time.` };
    }
    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return { error: `Coupon ${code} end time must be after start time.` };
    }
    if (maxUses != null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
      return { error: `Coupon ${code} max uses must be a positive integer.` };
    }

    rules.push({
      code,
      discountPercent,
      sourceType: sourceType as EventCouponRule['sourceType'],
      sourceId: normalizeText(rawRule.sourceId) || undefined,
      sourceName: normalizeText(rawRule.sourceName) || undefined,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      maxUses,
    });
  }

  return { rules };
}

function parseTextArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized;
}

function parseTaggedArtists(value: unknown): EventTaggedArtist[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const artists = (value as Array<Record<string, unknown>>)
    .map((artist) => {
      const id = normalizeText(artist.id);
      const profileUrlRaw = normalizeText(artist.profileUrl);

      return {
        id,
        name: normalizeText(artist.name),
        email: normalizeText(artist.email) || undefined,
        profileUrl: profileUrlRaw || (id ? `/artist/${id}` : ''),
        imageUrl: normalizeText(artist.imageUrl) || undefined,
      };
    })
    .filter((artist) => Boolean(artist.id));

  return artists;
}

function parseTicketCategories(value: unknown): { categories?: EventTicketCategory[]; error?: string } {
  if (value == null) return {};
  if (!Array.isArray(value)) {
    return { error: 'ticketCategories must be an array.' };
  }

  try {
    const categories = (value as Array<Record<string, unknown>>).map((category, index) => {
    const name = normalizeText(category.name);
    const price = Number(category.price || 0);
    const quantity = category.quantity == null ? undefined : Number(category.quantity);
    const availableFrom = normalizeText(category.availableFrom) || undefined;
    const availableUntil = normalizeText(category.availableUntil) || undefined;

    if (!name) {
      throw new Error(`Ticket category at index ${index} must have a valid name.`);
    }

    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Ticket category ${name} must have a valid non-negative price.`);
    }

    if (quantity != null && (!Number.isFinite(quantity) || quantity < 0)) {
      throw new Error(`Ticket category ${name} must have a valid non-negative quantity.`);
    }

    return {
      id: normalizeText(category.id) || `ticket-${index + 1}`,
      name,
      tagline: normalizeText(category.tagline) || undefined,
      price,
      originalPrice:
        category.originalPrice == null || category.originalPrice === ''
          ? undefined
          : Number(category.originalPrice),
      quantity,
      availableFrom,
      availableUntil,
      discount:
        category.discount == null || category.discount === ''
          ? undefined
          : Number(category.discount),
      platformFee:
        category.platformFee == null || category.platformFee === ''
          ? undefined
          : Number(category.platformFee),
      paymentGatewayFee:
        category.paymentGatewayFee == null || category.paymentGatewayFee === ''
          ? undefined
          : Number(category.paymentGatewayFee),
      gstPercent:
        category.gstPercent == null || category.gstPercent === ''
          ? undefined
          : Number(category.gstPercent),
      artistShare:
        category.artistShare == null || category.artistShare === ''
          ? undefined
          : Number(category.artistShare),
      influencerShare:
        category.influencerShare == null || category.influencerShare === ''
          ? undefined
          : Number(category.influencerShare),
    };
    });

    return { categories };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Invalid ticketCategories payload.',
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await getPublishedEventById(id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existingEvent = await getPublishedEventById(id);

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const isAdmin = isAdminRole(session.user.role);

    if (!isAdmin) {
      if (!existingEvent.sourceRequestId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const sourceRequest = await getEventRequestById(existingEvent.sourceRequestId);
      if (!sourceRequest || sourceRequest.outletUserId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const parsedCouponRules = parseCouponRules(body.couponRules);
    if (parsedCouponRules.error) {
      return NextResponse.json({ error: parsedCouponRules.error }, { status: 400 });
    }

    const parsedTicketCategories = parseTicketCategories(body.ticketCategories);
    if (parsedTicketCategories.error) {
      return NextResponse.json({ error: parsedTicketCategories.error }, { status: 400 });
    }

    const startTime = typeof body.startTime === 'string' ? body.startTime : undefined;
    const endTime = typeof body.endTime === 'string' ? body.endTime : undefined;
    const timeFromBody = typeof body.time === 'string' ? body.time : undefined;
    const resolvedTime = startTime || timeFromBody;

    const parsedRules = parseTextArray(body.rules);
    const parsedMediaFiles = parseTextArray(body.mediaFiles);
    const parsedTaggedArtists = parseTaggedArtists(body.taggedArtists);

    const resolvedDescription =
      typeof body.description === 'string'
        ? body.description
        : typeof body.fullDescription === 'string'
          ? body.fullDescription
          : undefined;

    const resolvedImage =
      typeof body.image === 'string'
        ? body.image
        : parsedMediaFiles && parsedMediaFiles.length > 0
          ? parsedMediaFiles[0]
          : undefined;

    const updates = {
      title: typeof body.title === 'string' ? body.title : undefined,
      subtitle: typeof body.subtitle === 'string' ? body.subtitle : undefined,
      date: typeof body.date === 'string' ? body.date : undefined,
      time: resolvedTime,
      venue: typeof body.venue === 'string' ? body.venue : undefined,
      locationState: typeof body.locationState === 'string' ? body.locationState : undefined,
      locationDistrict: typeof body.locationDistrict === 'string' ? body.locationDistrict : undefined,
      locationArea: typeof body.locationArea === 'string' ? body.locationArea : undefined,
      googleMapsLink: typeof body.googleMapsLink === 'string' ? body.googleMapsLink : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      subcategory: typeof body.subcategory === 'string' ? body.subcategory : undefined,
      price: typeof body.price === 'string' ? body.price : undefined,
      description: resolvedDescription,
      fullDescription: resolvedDescription,
      image: resolvedImage,
      mediaFiles: parsedMediaFiles,
      rules: parsedRules,
      taggedArtists: parsedTaggedArtists,
      ticketCategories: parsedTicketCategories.categories,
      gatesOpen: typeof body.gatesOpen === 'string' ? body.gatesOpen : startTime,
      entryAge: typeof body.entryAge === 'string' ? body.entryAge : undefined,
      layout: typeof body.layout === 'string' ? body.layout : undefined,
      seating: typeof body.seating === 'string' ? body.seating : undefined,
      promoterName: typeof body.organizer === 'string' ? body.organizer : undefined,
      couponRules: parsedCouponRules.rules,
    };

    const updated = await updatePublishedEvent(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    if (updated.sourceRequestId) {
      try {
        const sourceRequest = await getEventRequestById(updated.sourceRequestId);
        if (sourceRequest) {
          await updateEventRequest(sourceRequest.id, {
            eventData: {
              ...sourceRequest.eventData,
              title: updates.title ?? sourceRequest.eventData.title,
              subtitle: updates.subtitle ?? sourceRequest.eventData.subtitle,
              date: updates.date ?? sourceRequest.eventData.date,
              time: startTime ?? updates.time ?? sourceRequest.eventData.time,
              endTime: endTime ?? sourceRequest.eventData.endTime,
              venue: updates.venue ?? sourceRequest.eventData.venue,
              locationState: updates.locationState ?? sourceRequest.eventData.locationState,
              locationDistrict: updates.locationDistrict ?? sourceRequest.eventData.locationDistrict,
              locationArea: updates.locationArea ?? sourceRequest.eventData.locationArea,
              googleMapsLink: updates.googleMapsLink ?? sourceRequest.eventData.googleMapsLink,
              category: updates.category ?? sourceRequest.eventData.category,
              subcategory: updates.subcategory ?? sourceRequest.eventData.subcategory,
              price: updates.price ?? sourceRequest.eventData.price,
              description: updates.description ?? sourceRequest.eventData.description,
              fullDescription: updates.description ?? sourceRequest.eventData.fullDescription,
              image: updates.image ?? sourceRequest.eventData.image,
              mediaFiles: updates.mediaFiles ?? sourceRequest.eventData.mediaFiles,
              rules: updates.rules ?? sourceRequest.eventData.rules,
              taggedArtists: updates.taggedArtists ?? sourceRequest.eventData.taggedArtists,
              ticketCategories: updates.ticketCategories ?? sourceRequest.eventData.ticketCategories,
              gatesOpen: updates.gatesOpen ?? sourceRequest.eventData.gatesOpen,
              entryAge: updates.entryAge ?? sourceRequest.eventData.entryAge,
              layout: updates.layout ?? sourceRequest.eventData.layout,
              seating: updates.seating ?? sourceRequest.eventData.seating,
              couponRules: updates.couponRules ?? sourceRequest.eventData.couponRules,
            },
          });
        }
      } catch (syncError) {
        console.error('Failed to sync source event request after published event update:', syncError);
      }
    }

    return NextResponse.json({ success: true, event: updated });
  } catch (error) {
    console.error('Failed to update event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update event' },
      { status: 500 }
    );
  }
}
