import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  createEventRequest,
  getAllEventRequests,
  updateEventRequestStatus,
} from '@/lib/event-request-store';
import { sendEventRequestNotificationEmail } from '@/lib/mailer';
import { publishEventFromRequest, unpublishEventByRequestId } from '@/lib/public-events-store';
import { getSupabaseServerClient } from '@/lib/supabase';

const BROWSE_FILTERS_SETTINGS_KEY = 'browse_filters';

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseDateTime(dateValue?: string, timeValue?: string): Date | null {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T${timeValue || '00:00'}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function validateEventDateTimes(eventData: Record<string, unknown>): string {
  const start = parseDateTime(
    typeof eventData.date === 'string' ? eventData.date : undefined,
    typeof eventData.time === 'string' ? eventData.time : undefined
  );

  if (!start) {
    return 'Please provide a valid event date and start time.';
  }

  if (start.getTime() <= Date.now()) {
    return 'Event date and start time must be in the future.';
  }

  const endTime = typeof eventData.endTime === 'string' ? eventData.endTime : '';
  if (endTime) {
    const end = parseDateTime(
      typeof eventData.date === 'string' ? eventData.date : undefined,
      endTime
    );
    if (!end) return 'Please provide a valid end time.';
    if (end.getTime() <= Date.now()) return 'End date and end time must be in the future.';
    if (end < start) return 'End time must be after the start time.';
  }

  const ticketCategories = Array.isArray(eventData.ticketCategories)
    ? (eventData.ticketCategories as Array<Record<string, unknown>>)
    : [];

  for (const category of ticketCategories) {
    const hasFromDate = typeof category.availableFromDate === 'string' && category.availableFromDate.trim();
    const hasFromTime = typeof category.availableFromTime === 'string' && category.availableFromTime.trim();
    const hasUntilDate = typeof category.availableUntilDate === 'string' && category.availableUntilDate.trim();
    const hasUntilTime = typeof category.availableUntilTime === 'string' && category.availableUntilTime.trim();

    if ((hasFromDate || hasFromTime) && (!hasFromDate || !hasFromTime)) {
      return `Ticket category ${String(category.name || 'Unnamed')} requires both available-from date and time.`;
    }

    if ((hasUntilDate || hasUntilTime) && (!hasUntilDate || !hasUntilTime)) {
      return `Ticket category ${String(category.name || 'Unnamed')} requires both available-until date and time.`;
    }

    if (hasFromDate && hasFromTime && hasUntilDate && hasUntilTime) {
      const from = parseDateTime(category.availableFromDate as string, category.availableFromTime as string);
      const until = parseDateTime(category.availableUntilDate as string, category.availableUntilTime as string);

      if (!from || !until) {
        return `Ticket category ${String(category.name || 'Unnamed')} has an invalid availability window.`;
      }

      if (from.getTime() <= Date.now()) {
        return `Ticket category ${String(category.name || 'Unnamed')} availability start must be in the future.`;
      }

      if (until.getTime() <= Date.now()) {
        return `Ticket category ${String(category.name || 'Unnamed')} availability end must be in the future.`;
      }

      if (until < from) {
        return `Ticket category ${String(category.name || 'Unnamed')} must end after it starts.`;
      }
    }
  }

  return '';
}

function validateCouponRules(eventData: Record<string, unknown>): string {
  if (!Array.isArray(eventData.couponRules)) {
    return '';
  }

  for (const rawRule of eventData.couponRules as Array<Record<string, unknown>>) {
    const code = normalizeText(rawRule.code).toUpperCase();
    const percent = Number(rawRule.discountPercent || 0);
    const sourceType = normalizeText(rawRule.sourceType);
    const startsAt = normalizeText(rawRule.startsAt);
    const endsAt = normalizeText(rawRule.endsAt);
    const maxUses = rawRule.maxUses == null ? undefined : Number(rawRule.maxUses);

    if (!code) {
      return 'Each coupon rule must have a coupon code.';
    }

    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return `Coupon ${code} must have discount percent between 1 and 100.`;
    }

    if (sourceType && !['outlet', 'artist', 'promoter', 'influencer'].includes(sourceType)) {
      return `Coupon ${code} has an invalid source type.`;
    }

    if (startsAt && Number.isNaN(new Date(startsAt).getTime())) {
      return `Coupon ${code} has an invalid start time.`;
    }

    if (endsAt && Number.isNaN(new Date(endsAt).getTime())) {
      return `Coupon ${code} has an invalid end time.`;
    }

    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return `Coupon ${code} end time must be after start time.`;
    }

    if (maxUses != null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
      return `Coupon ${code} max uses must be a positive integer.`;
    }
  }

  return '';
}

async function upsertBrowseCategoryFromEvent(categoryRaw?: string, subcategoryRaw?: string) {
  const category = typeof categoryRaw === 'string' ? categoryRaw.trim() : '';
  const subcategory = typeof subcategoryRaw === 'string' ? subcategoryRaw.trim() : '';

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
      ? (existing.subFilters as unknown[]).filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
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

// GET - Admin: Get all event requests
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || (token.role !== 'admin' && token.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const reviewerId = token.sub;

    if (!reviewerId) {
      return NextResponse.json({ error: 'Admin user ID is missing from the session' }, { status: 400 });
    }

    const requests = await getAllEventRequests();
    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Failed to fetch event requests:', error);
    return NextResponse.json({ error: 'Failed to fetch event requests' }, { status: 500 });
  }
}

// POST - Outlet: Create a new event request
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== 'outlet') {
      return NextResponse.json({ error: 'Unauthorized - Outlet provider access required' }, { status: 403 });
    }

    const body = await request.json();
    const { eventData } = body;

    if (!eventData || !eventData.title || !eventData.date || !eventData.venue) {
      return NextResponse.json({ error: 'Missing required event data' }, { status: 400 });
    }

    const couponError = validateCouponRules(eventData as Record<string, unknown>);
    if (couponError) {
      return NextResponse.json({ error: couponError }, { status: 400 });
    }

    const dateTimeError = validateEventDateTimes(eventData);
    if (dateTimeError) {
      return NextResponse.json({ error: dateTimeError }, { status: 400 });
    }

    const outletName = token.name || 'Unknown Outlet';
    const newRequest = await createEventRequest(
      token.sub || '',
      outletName,
      eventData,
      typeof token.email === 'string' ? token.email : undefined
    );

    await upsertBrowseCategoryFromEvent(eventData.category, eventData.subcategory);

    let adminNotificationSent = false;

    try {
      await sendEventRequestNotificationEmail({
        adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'admin@easyentry.com',
        requestId: newRequest.id,
        outletName,
        outletEmail: String(token.email || 'Not available'),
        submittedAt: newRequest.submittedAt,
        eventData: {
          title: eventData.title,
          subtitle: eventData.subtitle,
          date: eventData.date,
          time: eventData.time,
          endTime: eventData.endTime,
          venue: eventData.venue,
          couponRules: eventData.couponRules,
          locationState: eventData.locationState,
          locationDistrict: eventData.locationDistrict,
          locationArea: eventData.locationArea,
          category: eventData.category,
          price: eventData.price,
          description: eventData.description,
          numberOfTickets: eventData.numberOfTickets,
          ticketCategories: eventData.ticketCategories,
        },
      });
      adminNotificationSent = true;
    } catch (emailError) {
      console.error('Failed to send admin event request email:', emailError);
    }

    return NextResponse.json({ request: newRequest, adminNotificationSent }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event request:', error);
    return NextResponse.json({ error: 'Failed to create event request' }, { status: 500 });
  }
}

// PUT - Admin: Update request status (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || (token.role !== 'admin' && token.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const reviewerId = token.sub;

    if (!reviewerId) {
      return NextResponse.json({ error: 'Admin user ID is missing from the session' }, { status: 400 });
    }

    const body = await request.json();
    const { requestId, status, rejectionReason } = body;

    if (!requestId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const updated = await updateEventRequestStatus(
      requestId,
      status,
      reviewerId,
      rejectionReason
    );

    if (!updated) {
      return NextResponse.json({ error: 'Event request not found' }, { status: 404 });
    }

    if (status === 'approved') {
      await publishEventFromRequest(updated);
    } else {
      await unpublishEventByRequestId(requestId);
    }

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error('Failed to update event request:', error);
    return NextResponse.json({ error: 'Failed to update event request' }, { status: 500 });
  }
}
