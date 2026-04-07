import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

function parseSocialMedia(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

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

    const social = parseSocialMedia(profile?.social_media);
    const videos = Array.isArray(social.videos) ? social.videos : [];
    const photoGallery = Array.isArray(social.photoGallery) ? social.photoGallery : [];
    const genres = Array.isArray(social.genres)
      ? social.genres.filter((item): item is string => typeof item === 'string')
      : [];
    const languages = Array.isArray(social.languages)
      ? social.languages.filter((item): item is string => typeof item === 'string')
      : [];

    return NextResponse.json({
      artist: {
        id: user.id,
        role: user.role,
        email: user.email,
        name: profile?.stage_name || user.name || user.email,
        realName: user.name || '',
        genre: profile?.genre || genres.join(', '),
        genres,
        languages,
        experienceYears: profile?.experience_years || null,
        portfolioUrl: profile?.portfolio_url || '',
        bio: profile?.bio || '',
        socialMedia: social,
        profileImage: typeof social.profileImage === 'string' ? social.profileImage : '',
        coverImage: typeof social.coverImage === 'string' ? social.coverImage : '',
        videos,
        photoGallery,
        awards: Array.isArray(social.awards) ? social.awards : [],
        eventTypes: Array.isArray(social.preferences)
          ? (social.preferences as Array<Record<string, unknown>>)
              .filter((item) => Boolean(item?.selected))
              .map((item) => String(item?.name || '').trim())
              .filter(Boolean)
          : [],
        location: typeof social.location === 'string' ? social.location : '',
        hourlyRate: typeof social.hourlyRate === 'string' ? social.hourlyRate : '',
        availability: typeof social.availability === 'string' ? social.availability : 'Available',
        travelWillingness: typeof social.travelWillingness === 'string' ? social.travelWillingness : 'Within City',
        phone: profile?.phone || '',
      },
    });
  } catch (error) {
    console.error('GET /api/artists/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
