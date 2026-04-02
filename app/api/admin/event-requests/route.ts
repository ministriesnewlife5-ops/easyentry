import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  createEventRequest,
  getAllEventRequests,
  updateEventRequestStatus,
} from '@/lib/event-request-store';
import { sendEventRequestNotificationEmail } from '@/lib/mailer';
import { publishEventFromRequest, unpublishEventByRequestId } from '@/lib/public-events-store';

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
