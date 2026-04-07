import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

type PromoterSocial = {
  profileImage?: string | null;
  coverImage?: string | null;
  instagram?: string;
  twitter?: string;
  facebook?: string;
};

function parseSocial(raw: unknown): PromoterSocial {
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    return JSON.parse(raw) as PromoterSocial;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    const { data: users, error: usersError } = await supabase
      .from('app_users')
      .select('id, name, email, role')
      .eq('role', 'promoter')
      .order('name', { ascending: true });

    if (usersError) {
      console.error('Error fetching promoters:', usersError);
      return NextResponse.json({ error: 'Failed to fetch promoters' }, { status: 500 });
    }

    const userIds = ((users as Array<Record<string, unknown>> | null) || []).map((user) => String(user.id));

    const { data: profiles } = userIds.length
      ? await supabase
          .from('promoter_profiles')
          .select('user_id, company_name, experience_years, bio, social_media, website')
          .in('user_id', userIds)
      : { data: [] as Array<Record<string, unknown>> };

    const { data: promoterEvents } = userIds.length
      ? await supabase
          .from('event_requests')
          .select('user_id, status')
          .in('user_id', userIds)
      : { data: [] as Array<Record<string, unknown>> };

    const profileByUserId = new Map(
      ((profiles as Array<Record<string, unknown>> | null) || []).map((profile) => [String(profile.user_id), profile])
    );

    const eventsCountByUserId = new Map<string, number>();
    for (const row of (promoterEvents as Array<Record<string, unknown>> | null) || []) {
      const userId = String(row.user_id || '');
      if (!userId) continue;
      const current = eventsCountByUserId.get(userId) || 0;
      eventsCountByUserId.set(userId, current + 1);
    }

    const promoters = ((users as Array<Record<string, unknown>> | null) || []).map((user) => {
      const profile = profileByUserId.get(String(user.id));
      const social = parseSocial(profile?.social_media);

      return {
        id: user.id,
        name: profile?.company_name ? String(user.name || user.email || 'Promoter') : String(user.name || user.email || 'Promoter'),
        email: user.email,
        role: user.role,
        companyName: profile?.company_name ? String(profile.company_name) : '',
        experienceYears: profile?.experience_years ?? null,
        bio: profile?.bio ? String(profile.bio) : '',
        website: profile?.website ? String(profile.website) : '',
        eventsPromoted: eventsCountByUserId.get(String(user.id)) || 0,
        imageUrl: typeof social.profileImage === 'string' ? social.profileImage : null,
        coverImage: typeof social.coverImage === 'string' ? social.coverImage : null,
      };
    });

    return NextResponse.json({ promoters });
  } catch (error) {
    console.error('GET /api/promoters error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
