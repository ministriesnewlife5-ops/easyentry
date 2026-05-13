import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createEventRequest, updateEventRequestStatus } from '@/lib/event-request-store';
import { publishEventFromRequest } from '@/lib/public-events-store';
import { isAdminRole } from '@/lib/roles';

const BROWSE_FILTERS_SETTINGS_KEY = 'browse_filters';

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePrice(value: unknown): string {
  const cleaned = String(value ?? '').replace(/[^\d.]/g, '');
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return '₹0';
  return `₹${numeric}`;
}

function normalizeGoogleMapsLink(value: unknown, venue: string): string | undefined {
  const raw = normalizeText(value);
  if (raw) {
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`;
  }

  if (!venue) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
}

type HostEventTicketCategory = {
  id?: string;
  name?: string;
  price?: number | string;
  quantity?: number | string;
  availableFrom?: string;
  availableUntil?: string;
};

type HostEventCouponRule = {
  code: string;
  discountPercent: number;
  sourceType: 'outlet' | 'artist' | 'promoter' | 'influencer';
  sourceId?: string;
  sourceName?: string;
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
};

function normalizeCouponRules(value: unknown): { rules: HostEventCouponRule[]; error?: string } {
  if (!Array.isArray(value)) {
    return { rules: [] };
  }

  const normalized: HostEventCouponRule[] = [];

  for (const rawRule of value as Array<Record<string, unknown>>) {
    const code = normalizeText(rawRule.code).toUpperCase();
    const discountPercent = Number(rawRule.discountPercent || 0);
    const sourceType = normalizeText(rawRule.sourceType);
    const startsAt = normalizeText(rawRule.startsAt);
    const endsAt = normalizeText(rawRule.endsAt);
    const maxUses = rawRule.maxUses == null ? undefined : Number(rawRule.maxUses);

    if (!code) {
      return { rules: [], error: 'Each coupon rule must have a coupon code.' };
    }

    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      return { rules: [], error: `Coupon ${code} must have discount percent between 1 and 100.` };
    }

    if (!['outlet', 'artist', 'promoter', 'influencer'].includes(sourceType)) {
      return { rules: [], error: `Coupon ${code} has an invalid source type.` };
    }

    if (startsAt && Number.isNaN(new Date(startsAt).getTime())) {
      return { rules: [], error: `Coupon ${code} has an invalid start time.` };
    }

    if (endsAt && Number.isNaN(new Date(endsAt).getTime())) {
      return { rules: [], error: `Coupon ${code} has an invalid end time.` };
    }

    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return { rules: [], error: `Coupon ${code} end time must be after start time.` };
    }

    if (maxUses != null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
      return { rules: [], error: `Coupon ${code} max uses must be a positive integer.` };
    }

    normalized.push({
      code,
      discountPercent,
      sourceType: sourceType as HostEventCouponRule['sourceType'],
      sourceId: normalizeText(rawRule.sourceId) || undefined,
      sourceName: normalizeText(rawRule.sourceName) || undefined,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      maxUses,
    });
  }

  return { rules: normalized };
}

async function upsertBrowseCategoryFromEvent(categoryRaw?: string, subcategoryRaw?: string) {
  const category = normalizeText(categoryRaw);
  const subcategory = normalizeText(subcategoryRaw);
  if (!category) return;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', BROWSE_FILTERS_SETTINGS_KEY)
    .single();

  const settingsValue = (data?.value as Record<string, unknown>) || {};
  const categories = Array.isArray(settingsValue.categories)
    ? [...(settingsValue.categories as Array<Record<string, unknown>>)]
    : [];

  const categoryIndex = categories.findIndex((item) => {
    const name = typeof item?.name === 'string' ? item.name.trim().toLowerCase() : '';
    return name === category.toLowerCase();
  });

  if (categoryIndex >= 0) {
    const existing = categories[categoryIndex];
    const existingSubFilters = Array.isArray(existing.subFilters)
      ? (existing.subFilters as unknown[])
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

    if (subcategory && !existingSubFilters.some((value) => value.toLowerCase() === subcategory.toLowerCase())) {
      existingSubFilters.push(subcategory);
    }

    categories[categoryIndex] = {
      ...existing,
      name: typeof existing.name === 'string' && existing.name.trim() ? existing.name : category,
      icon: typeof existing.icon === 'string' && existing.icon.trim() ? existing.icon : 'Tag',
      subFilters: existingSubFilters,
    };
  } else {
    categories.push({
      name: category,
      icon: 'Tag',
      subFilters: subcategory ? [subcategory] : [],
    });
  }

  const nextValue = {
    mainFilters: Array.isArray(settingsValue.mainFilters) ? settingsValue.mainFilters : [],
    categories,
    locationFilters: Array.isArray(settingsValue.locationFilters) ? settingsValue.locationFilters : [],
  };

  await supabase
    .from('app_settings')
    .upsert(
      {
        key: BROWSE_FILTERS_SETTINGS_KEY,
        value: nextValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
}

// POST /api/admin/host-event - Admin creates and publishes event directly
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { eventData } = body;

    if (!eventData) {
      return NextResponse.json({ error: 'Event data is required' }, { status: 400 });
    }

    const title = normalizeText(eventData.title);
    const date = normalizeText(eventData.date);
    const venue = normalizeText(eventData.venue);

    if (!title || !date || !venue) {
      return NextResponse.json({ error: 'Missing required event fields: title, date, and venue are required.' }, { status: 400 });
    }

    const category = normalizeText(eventData.category) || 'General';
    const subcategory = normalizeText(eventData.subcategory) || undefined;
    const startTime = normalizeText(eventData.startTime || eventData.time);
    const endTime = normalizeText(eventData.endTime);
    const time = normalizeText(eventData.time) || (startTime && endTime ? `${startTime} - ${endTime}` : startTime);
    const hostCompanyType = normalizeText(eventData.hostCompanyType) as 'outlet' | 'promoter';
    const hostCompanyId = normalizeText(eventData.hostCompanyId);
    const hostCompanyOwnerId = normalizeText(eventData.hostCompanyOwnerId);
    const hostCompanyName = normalizeText(eventData.hostCompanyName) || 'Easy Entry';
    const { rules: couponRules, error: couponError } = normalizeCouponRules(eventData.couponRules);

    if (couponError) {
      return NextResponse.json({ error: couponError }, { status: 400 });
    }

    const outletUserId =
      hostCompanyType === 'outlet'
        ? hostCompanyOwnerId || (typeof session.user.id === 'string' ? session.user.id : '')
        : hostCompanyId || (typeof session.user.id === 'string' ? session.user.id : '');

    const ticketCategories = Array.isArray(eventData.ticketCategories)
      ? (eventData.ticketCategories as HostEventTicketCategory[])
          .filter((cat) => normalizeText(cat?.name) && Number(cat?.price) >= 0)
          .map((cat) => ({
            id: normalizeText(cat.id) || crypto.randomUUID(),
            name: normalizeText(cat.name).toUpperCase(),
            price: Number(cat.price) || 0,
            quantity: Number(cat.quantity) || 0,
            availableFrom: normalizeText(cat.availableFrom) || undefined,
            availableUntil: normalizeText(cat.availableUntil) || undefined,
          }))
      : [];

    if (ticketCategories.length === 0) {
      console.error('Admin event creation: No valid ticket categories provided', {
        providedCategories: eventData.ticketCategories,
      });
      return NextResponse.json({ error: 'At least one ticket category is required' }, { status: 400 });
    }

    const totalTickets = ticketCategories.reduce((sum: number, cat) => sum + (cat.quantity || 0), 0);
    const minPrice = Math.min(...ticketCategories.map((cat) => cat.price || 0));
    const googleMapsLink = normalizeGoogleMapsLink(eventData.googleMapsLink, venue);

    console.log('Admin event creation - Processing event:', {
      title,
      date,
      venue,
      ticketCategoriesCount: ticketCategories.length,
      couponRulesCount: couponRules.length,
      outletUserId,
      hostCompanyName,
    });

    const createdRequest = await createEventRequest(
      outletUserId,
      hostCompanyName,
      {
        title,
        subtitle: normalizeText(eventData.subtitle) || normalizeText(eventData.description),
        date,
        time,
        venue,
        category,
        subcategory,
        price: normalizePrice(eventData.price ?? minPrice),
        image: normalizeText(eventData.image),
        mediaFiles: Array.isArray(eventData.mediaFiles)
          ? eventData.mediaFiles.filter((item: unknown): item is string => typeof item === 'string')
          : [],
        numberOfTickets: String(Number(eventData.numberOfTickets) || totalTickets),
        rules: Array.isArray(eventData.rules)
          ? eventData.rules
              .filter((item: unknown): item is string => typeof item === 'string')
              .map((value: string) => value.trim())
              .filter(Boolean)
          : [],
        ticketCategories,
        description: normalizeText(eventData.description),
        fullDescription: normalizeText(eventData.fullDescription) || normalizeText(eventData.description),
        googleMapsLink,
        gatesOpen: normalizeText(eventData.gatesOpen) || startTime,
        entryAge: normalizeText(eventData.entryAge) || '18+',
        layout: normalizeText(eventData.layout) || 'Standing',
        seating: normalizeText(eventData.seating) || 'General Admission',
        couponRules: couponRules.length > 0 ? couponRules : undefined,
      }
    );

    console.log('Admin event creation - Event request created:', { requestId: createdRequest.id });

    const approvedRequest = await updateEventRequestStatus(createdRequest.id, 'approved', session.user.id as string);
    if (!approvedRequest) {
      console.error('Admin event creation - Failed to approve request:', { requestId: createdRequest.id });
      return NextResponse.json({ error: 'Failed to approve admin event request' }, { status: 500 });
    }

    console.log('Admin event creation - Request approved, publishing event...');

    const event = await publishEventFromRequest(approvedRequest);

    console.log('Admin event creation - Event published successfully:', { eventId: event.id });

    await upsertBrowseCategoryFromEvent(category, subcategory);

    return NextResponse.json({ 
      success: true, 
      event,
      requestId: createdRequest.id,
      message: 'Event created and published successfully' 
    });
  } catch (error) {
    const err = error as {
      message?: string;
      statusCode?: number;
      code?: string;
    };
    
    console.error('Error in host-event POST:', {
      message: err?.message,
      code: err?.code,
      stack: error instanceof Error ? error.stack : 'unknown',
      fullError: error,
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: err?.message || 'Unknown error occurred',
      }, 
      { status: 500 }
    );
  }
}
