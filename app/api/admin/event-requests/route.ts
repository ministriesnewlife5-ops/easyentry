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
    
    if (!token || token.role !== 'admin') {
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

    const outletName = token.name || 'Unknown Outlet';
    const newRequest = await createEventRequest(
      token.sub || '',
      outletName,
      eventData
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
          venue: eventData.venue,
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

    if (!token || token.role !== 'admin') {
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
