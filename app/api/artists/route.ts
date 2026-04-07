import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

function parseSocialMedia(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

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

    const userIds = ((data as Array<Record<string, unknown>> | null) || []).map((artist) => String(artist.id || ''));

    const { data: profiles } = userIds.length
      ? await supabase
          .from('artist_profiles')
          .select('user_id, social_media, stage_name, genre')
          .in('user_id', userIds)
      : { data: [] as Array<Record<string, unknown>> };

    const profileByUserId = new Map(
      ((profiles as Array<Record<string, unknown>> | null) || []).map((profile) => [String(profile.user_id), profile])
    );

    const artists = ((data as Array<Record<string, unknown>> | null) || []).map((user) => {
      const profile = profileByUserId.get(String(user.id));
      const social = parseSocialMedia(profile?.social_media);

      return {
        id: user.id,
        email: user.email,
        name: profile?.stage_name || user.name,
        role: user.role,
        imageUrl: typeof social.profileImage === 'string' ? social.profileImage : null,
        genre: typeof profile?.genre === 'string' ? profile.genre : null,
      };
    });

    return NextResponse.json({ artists });
  } catch (err) {
    console.error('GET /api/artists error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
