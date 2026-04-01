import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('app_users')
      .select('id, email, name, role')
      .eq('role', 'artist')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching artists:', error);
      return NextResponse.json({ error: 'Failed to fetch artists' }, { status: 500 });
    }

    return NextResponse.json({ artists: data || [] });
  } catch (err) {
    console.error('GET /api/artists error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
