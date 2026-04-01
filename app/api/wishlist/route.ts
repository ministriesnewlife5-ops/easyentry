import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// GET /api/wishlist - Get user's wishlist
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('user_wishlists')
      .select('*')
      .eq('user_id', session.user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching wishlist:', error);
      return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
    }

    return NextResponse.json({ wishlist: data || [] });
  } catch (error) {
    console.error('Error in wishlist GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/wishlist - Add event to wishlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event_id, event_title, event_date, event_venue, event_price, event_image } = body;

    if (!event_id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('user_wishlists')
      .upsert({
        user_id: session.user.id,
        event_id,
        event_title,
        event_date,
        event_venue,
        event_price,
        event_image,
        added_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,event_id',
        ignoreDuplicates: true,
      })
      .select();

    if (error) {
      console.error('Error adding to wishlist:', error);
      return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data?.[0] });
  } catch (error) {
    console.error('Error in wishlist POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/wishlist?event_id=xxx - Remove event from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get('event_id');

    if (!event_id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    const { error } = await supabase
      .from('user_wishlists')
      .delete()
      .eq('user_id', session.user.id)
      .eq('event_id', event_id);

    if (error) {
      console.error('Error removing from wishlist:', error);
      return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in wishlist DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/wishlist/check?event_id=xxx - Check if event is in wishlist
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get('event_id');

    if (!event_id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('user_wishlists')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('event_id', event_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error checking wishlist:', error);
      return NextResponse.json({ error: 'Failed to check wishlist' }, { status: 500 });
    }

    return NextResponse.json({ isInWishlist: !!data });
  } catch (error) {
    console.error('Error in wishlist PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
