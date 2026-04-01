import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { id, action, type } = body;

    if (!id || !action || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    if (type === 'user') {
      if (action === 'archive') {
        const { error } = await supabase
          .from('app_users')
          .update({ is_archived: true, archived_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          console.error('Error archiving user:', error);
          return NextResponse.json({ error: 'Failed to archive user' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'User archived successfully' });
      } else if (action === 'unarchive') {
        const { error } = await supabase
          .from('app_users')
          .update({ is_archived: false, archived_at: null })
          .eq('id', id);

        if (error) {
          console.error('Error unarchiving user:', error);
          return NextResponse.json({ error: 'Failed to unarchive user' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'User unarchived successfully' });
      } else if (action === 'delete') {
        const { error } = await supabase
          .from('app_users')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting user:', error);
          return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
      }
    } else if (type === 'event') {
      if (action === 'archive') {
        const { error } = await supabase
          .from('published_events')
          .update({ is_archived: true, archived_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          console.error('Error archiving event:', error);
          return NextResponse.json({ error: 'Failed to archive event' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Event archived successfully' });
      } else if (action === 'unarchive') {
        const { error } = await supabase
          .from('published_events')
          .update({ is_archived: false, archived_at: null })
          .eq('id', id);

        if (error) {
          console.error('Error unarchiving event:', error);
          return NextResponse.json({ error: 'Failed to unarchive event' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Event unarchived successfully' });
      } else if (action === 'delete') {
        // First delete related ticket categories
        const { error: ticketError } = await supabase
          .from('ticket_categories')
          .delete()
          .eq('event_id', id);

        if (ticketError) {
          console.error('Error deleting ticket categories:', ticketError);
        }

        const { error } = await supabase
          .from('published_events')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting event:', error);
          return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Event deleted successfully' });
      }
    }

    return NextResponse.json({ error: 'Invalid action or type' }, { status: 400 });
  } catch (err) {
    console.error('Archive/delete API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
