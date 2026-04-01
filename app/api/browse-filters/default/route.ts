import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('browse_filters')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching default browse filters:', error);
      return NextResponse.json({ error: 'Failed to fetch default filters' }, { status: 500 });
    }

    if (data) {
      return NextResponse.json({ filters: data });
    }

    const { data: fallback, error: fallbackError } = await supabase
      .from('browse_filters')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fallbackError && fallbackError.code !== 'PGRST116') {
      console.error('Error fetching fallback browse filters:', fallbackError);
      return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
    }

    return NextResponse.json({ filters: fallback || null });
  } catch (error) {
    console.error('Error in browse-filters/default GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
