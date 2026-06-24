import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';
import { normalizeRole, isAdminRole, isOrganizerRole } from '@/lib/roles';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const sessionUser = (session as any)?.user;
    if (!sessionUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = normalizeRole(sessionUser?.role);
    if (!role || !(role === 'STAFF' || isAdminRole(role) || isOrganizerRole(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const bookingId = typeof body?.bookingId === 'string' ? body.bookingId.trim() : '';
    const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : '';
    if (!bookingId || !eventId) return NextResponse.json({ error: 'Missing bookingId or eventId' }, { status: 400 });

    const supabase = getSupabaseServerClient();

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('ticket_bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError.message);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({ result: 'not_found' });
    }

    // Verify event match
    if (String(booking.event_id) !== String(eventId)) {
      return NextResponse.json({ result: 'wrong_event', message: 'This ticket belongs to a different event' });
    }

    // If organizer role, ensure ownership of the event
    if (role === 'ORGANIZER') {
      const { data: eventRow, error: eventErr } = await supabase
        .from('published_events')
        .select('id, organizer_id, title, date')
        .eq('id', booking.event_id)
        .maybeSingle();

      if (eventErr) {
        console.error('Error fetching event for organizer check:', eventErr.message);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
      }

      if (!eventRow || String(eventRow.organizer_id) !== String(sessionUser.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Cancelled
    if ((booking as any).entry_status === 'cancelled') {
      return NextResponse.json({ result: 'cancelled' });
    }

    const totalTickets = Number((booking as any).total_tickets || 0);
    const checkedInCount = Number((booking as any).checked_in_count || 0);
    const firstCheckedInAt = (booking as any).first_checked_in_at || null;

    if (checkedInCount >= totalTickets) {
      return NextResponse.json({
        result: 'already_used',
        checked_in_count: checkedInCount,
        total_tickets: totalTickets,
        first_checked_in_at: firstCheckedInAt || null,
      });
    }

    // Fetch purchaser and event details for response
    const [{ data: purchaser }, { data: eventRow }] = await Promise.all([
      supabase.from('app_users').select('id, name, email').eq('id', booking.user_id).maybeSingle(),
      supabase.from('published_events').select('id, title, date').eq('id', booking.event_id).maybeSingle(),
    ]);

    const purchaserName = purchaser ? (purchaser.name || purchaser.email || 'Customer') : 'Customer';

    const paymentMode = (booking as any).payment_mode === 'pay_at_venue' ? 'pay_at_venue' : 'online';
    const venuePaymentStatus = (booking as any).venue_payment_status || null;
    const remainingAmount = Number((booking as any).remaining_amount || 0);

    return NextResponse.json({
      result: 'valid',
      bookingId: booking.id,
      purchaserName,
      totalTickets,
      alreadyCheckedIn: checkedInCount,
      remaining: Math.max(0, totalTickets - checkedInCount),
      paymentMode,
      venuePaymentStatus,
      remainingAmount,
      eventTitle: eventRow ? eventRow.title : (booking as any).event_title || null,
      eventDate: eventRow ? eventRow.date : (booking as any).event_date || null,
    });
  } catch (err) {
    console.error('Error in staff tickets verify POST:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
