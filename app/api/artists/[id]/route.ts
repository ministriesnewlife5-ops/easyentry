import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('id, name, email, role')
      .eq('id', id)
      .eq('role', 'artist')
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('artist_profiles')
      .select('stage_name, genre, experience_years, portfolio_url, bio, social_media, phone')
      .eq('user_id', id)
      .single();

    return NextResponse.json({
      artist: {
        id: user.id,
        role: user.role,
        email: user.email,
        name: profile?.stage_name || user.name || user.email,
        realName: user.name || '',
        genre: profile?.genre || '',
        experienceYears: profile?.experience_years || null,
        portfolioUrl: profile?.portfolio_url || '',
        bio: profile?.bio || '',
        socialMedia: profile?.social_media || '',
        phone: profile?.phone || '',
      },
    });
  } catch (error) {
    console.error('GET /api/artists/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
