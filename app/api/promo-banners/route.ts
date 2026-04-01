import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// GET /api/promo-banners - Get all active promo banners
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('promo_banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching promo banners:', error);
      return NextResponse.json({ error: 'Failed to fetch promo banners' }, { status: 500 });
    }

    return NextResponse.json({ banners: data || [] });
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
    const { title, subtitle, cta_text, cta_link, gradient_from, gradient_to, display_order } = body;

    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('promo_banners')
      .insert({
        title,
        subtitle,
        cta_text: cta_text || 'Book Now',
        cta_link,
        gradient_from: gradient_from || '#E5A823',
        gradient_to: gradient_to || '#F5C542',
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
      .from('promo_banners')
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
      .from('promo_banners')
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
