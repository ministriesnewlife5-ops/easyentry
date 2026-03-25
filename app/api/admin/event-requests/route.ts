import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { 
  createEventRequest, 
  getAllEventRequests,
  updateEventRequestStatus 
} from '@/lib/event-request-store';

// GET - Admin: Get all event requests
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const requests = getAllEventRequests();
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
    const newRequest = createEventRequest(
      token.sub || '',
      outletName,
      eventData
    );

    return NextResponse.json({ request: newRequest }, { status: 201 });
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

    const body = await request.json();
    const { requestId, status, rejectionReason } = body;

    if (!requestId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const updated = updateEventRequestStatus(
      requestId,
      status,
      token.name || 'Admin',
      rejectionReason
    );

    if (!updated) {
      return NextResponse.json({ error: 'Event request not found' }, { status: 404 });
    }

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error('Failed to update event request:', error);
    return NextResponse.json({ error: 'Failed to update event request' }, { status: 500 });
  }
}
