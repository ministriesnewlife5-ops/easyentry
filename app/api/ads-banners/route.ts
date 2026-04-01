import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// GET /api/ads-banners - Get all active ads banners
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position');

    const supabase = getSupabaseServerClient();
    
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
      console.error('Error fetching ads banners:', error);
      return NextResponse.json({ error: 'Failed to fetch ads banners' }, { status: 500 });
    }

    return NextResponse.json({ banners: data || [] });
  } catch (error) {
    console.error('Error in ads-banners GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ads-banners - Create a new ads banner (admin only)
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
    const { title, subtitle, cta_text, cta_link, position, image_url, display_order } = body;

    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('ads_banners')
      .insert({
        title,
        subtitle,
        cta_text,
        cta_link,
        position: position || 'home_top',
        image_url,
        display_order: display_order || 0,
        is_active: true,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ads banner:', error);
      return NextResponse.json({ error: 'Failed to create ads banner' }, { status: 500 });
    }

    return NextResponse.json({ success: true, banner: data });
  } catch (error) {
    console.error('Error in ads-banners POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/ads-banners - Update an ads banner (admin only)
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
      console.error('Error updating ads banner:', error);
      return NextResponse.json({ error: 'Failed to update ads banner' }, { status: 500 });
    }

    return NextResponse.json({ success: true, banner: data });
  } catch (error) {
    console.error('Error in ads-banners PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ads-banners?id=xxx - Delete an ads banner (admin only)
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
      console.error('Error deleting ads banner:', error);
      return NextResponse.json({ error: 'Failed to delete ads banner' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in ads-banners DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
