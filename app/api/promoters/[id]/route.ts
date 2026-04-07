import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

type PromoterSocial = {
  profileImage?: string | null;
  coverImage?: string | null;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  location?: string;
};

function parseSocial(raw: unknown): PromoterSocial {
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    return JSON.parse(raw) as PromoterSocial;
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
      return NextResponse.json({ error: 'Promoter ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('id, name, email, role')
      .eq('id', id)
      .eq('role', 'promoter')
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Promoter not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('promoter_profiles')
      .select('company_name, website, experience_years, notable_events, bio, social_media, phone')
      .eq('user_id', id)
      .single();

    const { count: promotedEventsCount } = await supabase
      .from('event_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    const social = parseSocial(profile?.social_media);
    const notableEvents = typeof profile?.notable_events === 'string'
      ? profile.notable_events.split(',').map((item: string) => item.trim()).filter(Boolean)
      : [];

    return NextResponse.json({
      promoter: {
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        role: user.role,
        companyName: profile?.company_name || '',
        website: profile?.website || '',
        experienceYears: profile?.experience_years || null,
        eventsPromoted: promotedEventsCount || 0,
        bio: profile?.bio || '',
        phone: profile?.phone || '',
        location: typeof social.location === 'string' ? social.location : '',
        profileImage: typeof social.profileImage === 'string' ? social.profileImage : '',
        coverImage: typeof social.coverImage === 'string' ? social.coverImage : '',
        socialLinks: {
          instagram: typeof social.instagram === 'string' ? social.instagram : '',
          twitter: typeof social.twitter === 'string' ? social.twitter : '',
          facebook: typeof social.facebook === 'string' ? social.facebook : '',
        },
        eventTypes: notableEvents,
      },
    });
  } catch (error) {
    console.error('GET /api/promoters/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
