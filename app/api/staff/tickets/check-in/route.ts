import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';
import { normalizeRole, isAdminRole, isOrganizerRole } from '@/lib/roles';

function sanitize(input: string) {
  return input.replace(/'/g, "''");
}

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
    const checkInCount = Number(body?.checkInCount || 0);

    if (!bookingId || !eventId || !checkInCount || checkInCount <= 0) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Fetch booking
    const { data: booking, error: bookingErr } = await supabase
      .from('ticket_bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingErr) {
      console.error('Error fetching booking in check-in:', bookingErr.message);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

    if (!booking) return NextResponse.json({ result: 'not_found' });

    // Verify event match
    if (String(booking.event_id) !== String(eventId)) {
      return NextResponse.json({ result: 'wrong_event', message: 'This ticket belongs to a different event' });
    }

    // Organizer ownership check
    if (role === 'ORGANIZER') {
      const { data: eventRow, error: eventErr } = await supabase
        .from('published_events')
        .select('id, organizer_id')
        .eq('id', booking.event_id)
        .maybeSingle();

      if (eventErr) {
        console.error('Error fetching event for organizer check (check-in):', eventErr.message);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
      }

      if (!eventRow || String(eventRow.organizer_id) !== String(sessionUser.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const totalTickets = Number((booking as any).total_tickets || 0);
    const checkedInCount = Number((booking as any).checked_in_count || 0);

    // Payment required check
    if ((booking as any).payment_mode === 'pay_at_venue' && (booking as any).venue_payment_status !== 'paid') {
      return NextResponse.json({ result: 'payment_required', message: 'Mark payment as received before check-in' });
    }

    if (checkedInCount >= totalTickets) {
      return NextResponse.json({ result: 'already_used', checked_in_count: checkedInCount, total_tickets: totalTickets, first_checked_in_at: (booking as any).first_checked_in_at || null });
    }

    if (checkedInCount + checkInCount > totalTickets) {
      return NextResponse.json({ error: 'invalid_count', message: 'Check-in count exceeds remaining tickets' }, { status: 400 });
    }

    // Attempt an atomic update using optimistic locking (match previous checked_in_count)
    const safeBookingId = sanitize(bookingId);
    const safeEventId = sanitize(eventId);
    const safeScannedBy = sanitize(String(sessionUser.id));

    const sql = `BEGIN;
      UPDATE ticket_bookings
      SET checked_in_count = checked_in_count + ${checkInCount},
          entry_status = CASE WHEN checked_in_count + ${checkInCount} >= total_tickets THEN 'used' ELSE 'partial' END,
          first_checked_in_at = COALESCE(first_checked_in_at, now()),
          last_checked_in_at = now()
      WHERE id = '${safeBookingId}' AND checked_in_count = ${checkedInCount}
      RETURNING id, checked_in_count, total_tickets, first_checked_in_at, last_checked_in_at, entry_status;

      INSERT INTO ticket_scans (booking_id, event_id, scanned_by, scanned_count, running_total, scan_result)
      SELECT id, '${safeEventId}', '${safeScannedBy}', ${checkInCount}, checked_in_count, 'checked_in'
      FROM ticket_bookings
      WHERE id = '${safeBookingId}';
    COMMIT;`;

    const { data: execResult, error: execError } = await supabase.rpc('exec', { sql });

    if (execError) {
      console.error('Error executing check-in transaction:', execError.message);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

    // execResult may be an array of results; try to find the update RETURNING row
    let updatedBooking: any = null;
    if (Array.isArray(execResult) && execResult.length > 0) {
      for (const item of execResult) {
        if (item && item.checked_in_count !== undefined) {
          updatedBooking = item;
          break;
        }
      }
    }

    if (!updatedBooking) {
      // Could be a race (checked_in_count changed), tell caller to retry
      return NextResponse.json({ error: 'conflict', message: 'Concurrent update detected, please retry' }, { status: 409 });
    }

    return NextResponse.json({
      result: 'ok',
      bookingId: updatedBooking.id,
      checked_in_count: updatedBooking.checked_in_count,
      total_tickets: updatedBooking.total_tickets,
      first_checked_in_at: updatedBooking.first_checked_in_at,
      last_checked_in_at: updatedBooking.last_checked_in_at,
      entry_status: updatedBooking.entry_status,
    });
  } catch (err) {
    console.error('Error in staff tickets check-in POST:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
