import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// GET /api/promo-banners - Get all active promo banners
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position');
    
    let query = supabase
      .from('ads_banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (position) {
      query = query.eq('position', position);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching promo banners:', error);
      return NextResponse.json({ error: 'Failed to fetch promo banners' }, { status: 500 });
    }

    return NextResponse.json(
      { banners: data || [] },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error in promo-banners GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/promo-banners - Create a new promo banner (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, subtitle, cta_text, cta_link, image_url, position, display_order } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('ads_banners')
      .insert({
        title,
        subtitle: subtitle || null,
        cta_text: cta_text || 'Book Now',
        cta_link: cta_link || '#',
        image_url: image_url || null,
        position: position || 'home_top',
        display_order: display_order || 0,
        is_active: true,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating promo banner:', error);
      return NextResponse.json({ error: 'Failed to create promo banner' }, { status: 500 });
    }

    return NextResponse.json({ success: true, banner: data });
  } catch (error) {
    console.error('Error in promo-banners POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/promo-banners - Update a promo banner (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('ads_banners')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating promo banner:', error);
      return NextResponse.json({ error: 'Failed to update promo banner' }, { status: 500 });
    }

    return NextResponse.json({ success: true, banner: data });
  } catch (error) {
    console.error('Error in promo-banners PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/promo-banners?id=xxx - Delete a promo banner (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    const { error } = await supabase
      .from('ads_banners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting promo banner:', error);
      return NextResponse.json({ error: 'Failed to delete promo banner' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in promo-banners DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
