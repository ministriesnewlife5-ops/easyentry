import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// GET /api/browse-filters - Get all active browse filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('browse_filters')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching browse filters:', error);
      return NextResponse.json({ error: 'Failed to fetch browse filters' }, { status: 500 });
    }

    return NextResponse.json({ filters: data || [] });
  } catch (error) {
    console.error('Error in browse-filters GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/browse-filters/default - Get default filters
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('browse_filters')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching default filters:', error);
      return NextResponse.json({ error: 'Failed to fetch default filters' }, { status: 500 });
    }

    return NextResponse.json({ filters: data });
  } catch (error) {
    console.error('Error in browse-filters default GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/browse-filters - Create new browse filters (admin only)
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
    const { name, main_filters, categories, location_filters, is_default } = body;

    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('browse_filters')
      .insert({
        name: name || 'Custom Filters',
        main_filters: main_filters || [],
        categories: categories || [],
        location_filters: location_filters || [],
        is_active: true,
        is_default: is_default || false,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating browse filters:', error);
      return NextResponse.json({ error: 'Failed to create browse filters' }, { status: 500 });
    }

    return NextResponse.json({ success: true, filters: data });
  } catch (error) {
    console.error('Error in browse-filters POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/browse-filters - Update browse filters (admin only)
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
      return NextResponse.json({ error: 'Filter ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('browse_filters')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating browse filters:', error);
      return NextResponse.json({ error: 'Failed to update browse filters' }, { status: 500 });
    }

    return NextResponse.json({ success: true, filters: data });
  } catch (error) {
    console.error('Error in browse-filters PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/browse-filters?id=xxx - Delete browse filters (admin only)
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
      return NextResponse.json({ error: 'Filter ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    const { error } = await supabase
      .from('browse_filters')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting browse filters:', error);
      return NextResponse.json({ error: 'Failed to delete browse filters' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in browse-filters DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
