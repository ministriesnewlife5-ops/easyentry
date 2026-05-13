import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSupabaseServerClient } from '@/lib/supabase';
import { isAdminRole, normalizeRole } from '@/lib/roles';

type ArtistSocialPayload = {
  realName?: string;
  email?: string;
  location?: string;
  hourlyRate?: string;
  languages?: string[];
  genres?: string[];
  availability?: string;
  travelWillingness?: string;
  category?: string;
  otherCategory?: string;
  profileImage?: string | null;
  coverImage?: string | null;
  videos?: Array<{ id: string; url: string; thumbnail: string; title: string }>;
  photoGallery?: string[];
  awards?: Array<{ id: string; title: string; year: string; description: string }>;
  preferences?: Array<{ id: string; name: string; selected: boolean }>;
};

function parseSocial(raw: string | null): ArtistSocialPayload {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ArtistSocialPayload;
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

    if (normalizeRole(token.role) !== 'ARTIST' && !isAdminRole(token.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();

    const { data: profile, error } = await supabase
      .from('artist_profiles')
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
          stageName: '',
          realName: user?.name || '',
          email: user?.email || '',
          phone: '',
          location: '',
          bio: '',
          experience: '',
          hourlyRate: '',
          languages: [],
          genres: [],
          availability: 'Available',
          travelWillingness: 'Within City',
          category: '',
          otherCategory: '',
          profileImage: null,
          coverImage: null,
          videos: [],
          photoGallery: [],
          awards: [],
          preferences: [],
        },
      });
    }

    const social = parseSocial(profile.social_media as string | null);

    return NextResponse.json({
      profile: {
        stageName: profile.stage_name || '',
        realName: social.realName || user?.name || '',
        email: social.email || user?.email || '',
        phone: profile.phone || '',
        location: social.location || '',
        bio: profile.bio || '',
        experience: profile.experience_years ? String(profile.experience_years) : '',
        hourlyRate: social.hourlyRate || '',
        languages: Array.isArray(social.languages) ? social.languages : [],
        genres: Array.isArray(social.genres) ? social.genres : [],
        availability: social.availability || 'Available',
        travelWillingness: social.travelWillingness || 'Within City',
        category: social.category || '',
        otherCategory: social.otherCategory || '',
        profileImage: social.profileImage || null,
        coverImage: social.coverImage || null,
        videos: Array.isArray(social.videos) ? social.videos : [],
        photoGallery: Array.isArray(social.photoGallery) ? social.photoGallery : [],
        awards: Array.isArray(social.awards) ? social.awards : [],
        preferences: Array.isArray(social.preferences) ? social.preferences : [],
      },
    });
  } catch (error) {
    console.error('GET /api/artist/profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (normalizeRole(token.role) !== 'ARTIST' && !isAdminRole(token.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = getSupabaseServerClient();

    const socialPayload: ArtistSocialPayload = {
      realName: body.realName || '',
      email: body.email || '',
      location: body.location || '',
      hourlyRate: body.hourlyRate || '',
      languages: Array.isArray(body.languages) ? body.languages : [],
      genres: Array.isArray(body.genres) ? body.genres : [],
      availability: body.availability || 'Available',
      travelWillingness: body.travelWillingness || 'Within City',
      category: body.category || '',
      otherCategory: body.otherCategory || '',
      profileImage: body.profileImage || null,
      coverImage: body.coverImage || null,
      videos: Array.isArray(body.videos) ? body.videos : [],
      photoGallery: Array.isArray(body.photoGallery) ? body.photoGallery : [],
      awards: Array.isArray(body.awards) ? body.awards : [],
      preferences: Array.isArray(body.preferences) ? body.preferences : [],
    };

    const upsertPayload = {
      user_id: token.sub,
      stage_name: body.stageName || body.realName || 'Artist',
      genre: Array.isArray(body.genres) && body.genres.length > 0 ? body.genres.join(', ') : null,
      experience_years: body.experience ? parseInt(String(body.experience), 10) : null,
      portfolio_url: null,
      bio: body.bio || null,
      social_media: JSON.stringify(socialPayload),
      phone: body.phone || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('artist_profiles')
      .upsert(upsertPayload, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to save artist profile:', error);
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    if (body.realName || body.stageName) {
      await supabase
        .from('app_users')
        .update({ name: body.realName || body.stageName, updated_at: new Date().toISOString() })
        .eq('id', token.sub);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/artist/profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
