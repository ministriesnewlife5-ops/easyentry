import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('ticket_bookings')
      .select('*')
      .eq('user_id', session.user.id)
      .order('booked_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json({ bookings: data || [] });
  } catch (error) {
    console.error('Error in bookings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
