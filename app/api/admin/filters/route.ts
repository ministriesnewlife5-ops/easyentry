import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase';

const SETTINGS_KEY = 'browse_filters';

// Default filter data with State → City → Areas structure
const defaultFiltersData = {
  mainFilters: [
    { name: 'DATE', icon: 'Calendar' },
    { name: 'PRICE', icon: 'Tag' },
    { name: 'ARTIST', icon: 'Mic', href: '/artist' },
    { name: 'INFLUENCER', icon: 'Star', href: '/promoters' },
    { name: 'VENUES', icon: 'Building2', href: '/venues' },
  ],
  categories: [
    { name: 'Gigs', icon: 'Mic', subFilters: ['Alternative', 'Afropop', 'Alt-rock', 'Britpop', 'Celtic', 'Chiptune'] },
    { name: 'Party', icon: 'PartyPopper', subFilters: ['House', 'Techno', 'Trance', 'Drum & Bass', 'Dubstep', 'EDM'] },
    { name: 'DJ', icon: 'Disc', subFilters: ['Hip Hop', 'R&B', 'Reggaeton', 'Latin', 'Jazz', 'Blues'] },
    { name: 'Comedy', icon: 'Smile', subFilters: ['Stand-up', 'Improv', 'Sketch', 'Dark Comedy', 'Satire'] },
    { name: 'Theatre', icon: 'Drama', subFilters: ['Drama', 'Musical', 'Opera', 'Ballet', 'Contemporary'] },
    { name: 'Art', icon: 'Palette', subFilters: ['Painting', 'Sculpture', 'Photography', 'Digital Art'] },
  ],
  // NEW: State → City → Areas hierarchy (BookMyShow style)
  locationFilters: [
    {
      state: 'Tamil Nadu',
      cities: [
        {
          name: 'Chennai',
          icon: 'MapPin',
          areas: [
            'Adyar', 'Anna Nagar', 'Besant Nagar', 'Chrompet', 'Egmore',
            'Guindy', 'Kilpauk', 'Kodambakkam', 'Mylapore', 'Nungambakkam',
            'OMR', 'Parrys', 'Perambur', 'Royapettah', 'Saidapet',
            'T Nagar', 'Tambaram', 'Teynampet', 'Thiruvanmiyur', 'Velachery',
          ]
        },
        {
          name: 'Coimbatore',
          icon: 'MapPin',
          areas: ['RS Puram', 'Gandhipuram', 'Saibaba Colony', 'Peelamedu', 'Singanallur']
        },
      ]
    },
    {
      state: 'Maharashtra',
      cities: [
        {
          name: 'Mumbai',
          icon: 'MapPin',
          areas: ['Bandra', 'Andheri', 'Juhu', 'Colaba', 'Dadar', 'Powai', 'Versova', 'Worli']
        },
        {
          name: 'Pune',
          icon: 'MapPin',
          areas: ['Koregaon Park', 'Kothrud', 'Aundh', 'Baner', 'Hadapsar', 'Viman Nagar']
        },
      ]
    },
  ]
};

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Try to fetch from app_settings table
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();

    if (error || !data) {
      // Return defaults if not yet stored
      return NextResponse.json({ filters: defaultFiltersData });
    }

    return NextResponse.json({ filters: data.value });
  } catch (err) {
    console.error('GET /api/admin/filters error:', err);
    return NextResponse.json({ filters: defaultFiltersData });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filters } = body;

    if (!filters) {
      return NextResponse.json({ error: 'Missing filters data' }, { status: 400 });
    }

    if (!filters.categories || !Array.isArray(filters.categories)) {
      return NextResponse.json({ error: 'Invalid filters structure' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // First, try to update if exists, otherwise insert
    const { data, error: upsertError } = await supabase
      .from('app_settings')
      .upsert(
        { key: SETTINGS_KEY, value: filters, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      .select();

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to save filters: ' + upsertError.message }, { status: 500 });
    }

    // Verify the data was actually saved by fetching it back
    const { data: verifyData, error: verifyError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();

    if (verifyError || !verifyData) {
      console.error('Failed to verify save:', verifyError);
      return NextResponse.json({ error: 'Failed to verify filters were saved' }, { status: 500 });
    }

    // Verify that categories array has been properly updated
    const savedFilters = verifyData.value;
    if (!savedFilters.categories || savedFilters.categories.length !== filters.categories.length) {
      console.warn('Warning: Saved categories count does not match sent categories count', {
        sent: filters.categories.length,
        saved: savedFilters.categories?.length || 0
      });
    }

    // Revalidate related paths to clear cache
    revalidatePath('/browse');
    revalidatePath('/api/admin/filters');
    revalidatePath('/api/browse-filters/default');

    return NextResponse.json({ success: true, filters: savedFilters });
  } catch (err) {
    console.error('POST /api/admin/filters error:', err);
    return NextResponse.json({ error: 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown'), status: 500 }, { status: 500 });
  }
}
