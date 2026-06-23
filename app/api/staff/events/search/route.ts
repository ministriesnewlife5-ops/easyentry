import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { normalizeRole, isAdminRole, isOrganizerRole } from '@/lib/roles';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = (url.searchParams.get('code') || '').trim().toUpperCase();
    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });

    const session = await getServerSession(authOptions as any);
    const sessionUser = (session as any)?.user;
    if (!sessionUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = normalizeRole(sessionUser?.role);
    if (!role || !(role === 'STAFF' || isAdminRole(role) || isOrganizerRole(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();

    // Find event by code
    const { data: events, error: eventsError } = await supabase
      .from('published_events')
      .select('*')
      .eq('event_code', code)
      .limit(1);

    if (eventsError) {
      console.error('Error fetching event by code:', eventsError.message);
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
    }

    const event = (events && events[0]) || null;
    if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // If organizer role, ensure ownership
    if (role === 'ORGANIZER') {
      const userId = String(sessionUser.id);
      if (String(event.organizer_id) !== userId) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    // Aggregate ticket stats
    const { data: bookings, error: bookingsError } = await supabase
      .from('ticket_bookings')
      .select('total_tickets, checked_in_count')
      .eq('event_id', event.id);

    if (bookingsError) {
      console.error('Error fetching bookings for event:', bookingsError.message);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    let totalTickets = 0;
    let totalCheckedIn = 0;
    for (const b of bookings || []) {
      totalTickets += Number((b as any).total_tickets || 0);
      totalCheckedIn += Number((b as any).checked_in_count || 0);
    }

    const stats = {
      total_tickets_sold: totalTickets,
      total_checked_in: totalCheckedIn,
      total_remaining: Math.max(0, totalTickets - totalCheckedIn),
    };

    return NextResponse.json({ event, stats });
  } catch (err) {
    console.error('Error in staff events search GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
