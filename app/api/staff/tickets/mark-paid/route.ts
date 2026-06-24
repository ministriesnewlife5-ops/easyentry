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
    if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });

    const supabase = getSupabaseServerClient();

    const { data: booking, error: fetchErr } = await supabase
      .from('ticket_bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr) {
      console.error('Error fetching booking in mark-paid:', fetchErr.message);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

    if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Only allow mark-paid for pay_at_venue bookings
    if ((booking as any).payment_mode !== 'pay_at_venue') {
      return NextResponse.json({ error: 'invalid_operation', message: 'Booking is not pay_at_venue' }, { status: 400 });
    }

    // If organizer, ensure ownership
    if (role === 'ORGANIZER') {
      const { data: eventRow, error: eventErr } = await supabase
        .from('published_events')
        .select('id, organizer_id')
        .eq('id', booking.event_id)
        .maybeSingle();

      if (eventErr) {
        console.error('Error fetching event for organizer check (mark-paid):', eventErr.message);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
      }

      if (!eventRow || String(eventRow.organizer_id) !== String(sessionUser.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('ticket_bookings')
      .update({ venue_payment_status: 'paid', remaining_amount: 0 })
      .eq('id', bookingId)
      .select('*')
      .maybeSingle();

    if (updateErr) {
      console.error('Error updating booking in mark-paid:', updateErr.message);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

    return NextResponse.json({ result: 'ok', booking: updated });
  } catch (err) {
    console.error('Error in staff tickets mark-paid POST:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
