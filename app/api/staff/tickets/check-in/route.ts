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
      console.error('Error fetching booking in check-in:', bookingErr);
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
        console.error('Error fetching event for organizer check (check-in):', eventErr);
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

    // Perform optimistic-lock update: set new checked_in_count only if current matches
    const newCheckedIn = checkedInCount + checkInCount;
    const newEntryStatus = newCheckedIn >= totalTickets ? 'used' : 'partial';

    const { data: updatedRows, error: updateErr } = await supabase
      .from('ticket_bookings')
      .update({
        checked_in_count: newCheckedIn,
        entry_status: newEntryStatus,
        first_checked_in_at: (booking as any).first_checked_in_at || new Date().toISOString(),
        last_checked_in_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('checked_in_count', checkedInCount)
      .select('id, checked_in_count, total_tickets, first_checked_in_at, last_checked_in_at, entry_status')
      .maybeSingle();

    if (updateErr) {
      console.error('Error updating booking checked_in_count (check-in):', updateErr);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

    if (!updatedRows) {
      // No row updated — likely concurrent update; ask client to retry
      return NextResponse.json({ error: 'conflict', message: 'Concurrent update detected, please retry' }, { status: 409 });
    }

    // Insert scan record referencing the updated booking
    try {
      const { error: insertErr } = await supabase.from('ticket_scans').insert([
        {
          booking_id: updatedRows.id,
          event_id: eventId,
          scanned_by: String(sessionUser.id),
          scanned_count: checkInCount,
          running_total: updatedRows.checked_in_count,
          scan_result: 'checked_in',
        },
      ]);

      if (insertErr) {
        console.error('Error inserting ticket_scans row (check-in):', insertErr);
        // Note: we do not roll back the booking update here; surface an error
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
      }
    } catch (e) {
      console.error('Unexpected error inserting ticket_scans (check-in):', e);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

    return NextResponse.json({
      result: 'ok',
      bookingId: updatedRows.id,
      checked_in_count: updatedRows.checked_in_count,
      total_tickets: updatedRows.total_tickets,
      first_checked_in_at: updatedRows.first_checked_in_at,
      last_checked_in_at: updatedRows.last_checked_in_at,
      entry_status: updatedRows.entry_status,
    });
  } catch (err) {
    console.error('Error in staff tickets check-in POST:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
