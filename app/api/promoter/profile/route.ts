import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSupabaseServerClient } from '@/lib/supabase';

type PromoterSocialPayload = {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  location?: string;
  email?: string;
  profileImage?: string | null;
  coverImage?: string | null;
  galleryImages?: Array<{ id: string; url: string; name: string }>;
  videos?: Array<{ id: string; url: string; thumbnail: string; title: string }>;
};

function parseSocial(raw: string | null): PromoterSocialPayload {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PromoterSocialPayload;
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (token.role !== 'promoter' && token.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();

    const { data: profile, error } = await supabase
      .from('promoter_profiles')
      .select('*')
      .eq('user_id', token.sub)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const { data: user } = await supabase
      .from('app_users')
      .select('name, email')
      .eq('id', token.sub)
      .single();

    if (!profile) {
      return NextResponse.json({
        profile: {
          name: user?.name || '',
          companyName: '',
          email: user?.email || '',
          phone: '',
          location: '',
          bio: '',
          experienceYears: '',
          website: '',
          instagram: '',
          twitter: '',
          facebook: '',
          profileImage: null,
          coverImage: null,
          galleryImages: [],
          videos: [],
        },
      });
    }

    const social = parseSocial(profile.social_media as string | null);

    return NextResponse.json({
      profile: {
        name: user?.name || '',
        companyName: profile.company_name || '',
        email: social.email || user?.email || '',
        phone: profile.phone || '',
        location: social.location || '',
        bio: profile.bio || '',
        experienceYears: profile.experience_years ? String(profile.experience_years) : '',
        website: profile.website || '',
        instagram: social.instagram || '',
        twitter: social.twitter || '',
        facebook: social.facebook || '',
        profileImage: social.profileImage || null,
        coverImage: social.coverImage || null,
        galleryImages: Array.isArray(social.galleryImages) ? social.galleryImages : [],
        videos: Array.isArray(social.videos) ? social.videos : [],
      },
    });
  } catch (error) {
    console.error('GET /api/promoter/profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (token.role !== 'promoter' && token.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = getSupabaseServerClient();

    const socialPayload: PromoterSocialPayload = {
      instagram: body.instagram || '',
      twitter: body.twitter || '',
      facebook: body.facebook || '',
      location: body.location || '',
      email: body.email || '',
      profileImage: body.profileImage || null,
      coverImage: body.coverImage || null,
      galleryImages: Array.isArray(body.galleryImages) ? body.galleryImages : [],
      videos: Array.isArray(body.videos) ? body.videos : [],
    };

    const upsertPayload = {
      user_id: token.sub,
      company_name: body.companyName || '',
      website: body.website || null,
      experience_years: body.experienceYears ? parseInt(String(body.experienceYears), 10) : null,
      notable_events: null,
      bio: body.bio || null,
      social_media: JSON.stringify(socialPayload),
      phone: body.phone || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('promoter_profiles')
      .upsert(upsertPayload, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to save promoter profile:', error);
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    if (body.name) {
      await supabase
        .from('app_users')
        .update({ name: body.name, updated_at: new Date().toISOString() })
        .eq('id', token.sub);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/promoter/profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
