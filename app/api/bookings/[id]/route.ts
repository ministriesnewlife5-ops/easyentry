import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('ticket_bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching booking by id:', error.message);
      return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ booking: data });
  } catch (err) {
    console.error('Error in bookings/[id] GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
