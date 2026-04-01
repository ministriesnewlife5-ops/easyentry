import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// GET /api/hosted-events - Get user's hosted events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('hosted_events')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching hosted events:', error);
      return NextResponse.json({ error: 'Failed to fetch hosted events' }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (error) {
    console.error('Error in hosted-events GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/hosted-events - Save a hosted event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event_id, title, date, venue, price, category, image_url, image_color } = body;

    if (!event_id || !title) {
      return NextResponse.json({ error: 'Event ID and title are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('hosted_events')
      .insert({
        user_id: session.user.id,
        event_id: String(event_id),
        title,
        date,
        venue,
        price,
        category,
        image_url,
        image_color,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving hosted event:', error);
      return NextResponse.json({ error: 'Failed to save hosted event' }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: data });
  } catch (error) {
    console.error('Error in hosted-events POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/hosted-events?event_id=xxx - Remove a hosted event
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
      .from('hosted_events')
      .delete()
      .eq('user_id', session.user.id)
      .eq('event_id', event_id);

    if (error) {
      console.error('Error deleting hosted event:', error);
      return NextResponse.json({ error: 'Failed to delete hosted event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in hosted-events DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
