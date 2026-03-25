import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getEventRequestsByOutlet } from '@/lib/event-request-store';

// GET - Outlet: Get all event requests for the current outlet
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || token.role !== 'outlet') {
      return NextResponse.json({ error: 'Unauthorized - Outlet provider access required' }, { status: 403 });
    }

    const requests = getEventRequestsByOutlet(token.sub || '');
    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Failed to fetch event requests:', error);
    return NextResponse.json({ error: 'Failed to fetch event requests' }, { status: 500 });
  }
}
