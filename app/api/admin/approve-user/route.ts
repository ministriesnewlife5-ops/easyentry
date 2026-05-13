import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';
import { isAdminRole, normalizeRole } from '@/lib/roles';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const userId = typeof body.id === 'string' ? body.id.trim() : '';

    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: existingUser, error: fetchError } = await supabase
      .from('app_users')
      .select('id, role, is_verified')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['ARTIST', 'PROMOTER', 'ORGANIZER'].includes(String(normalizeRole(existingUser.role) || ''))) {
      return NextResponse.json({ error: 'This account type cannot be approved here' }, { status: 400 });
    }

    if (existingUser.is_verified) {
      return NextResponse.json({ success: true, message: 'User already approved' });
    }

    const { error: updateError } = await supabase
      .from('app_users')
      .update({ is_verified: true })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User approved successfully' });
  } catch (error) {
    console.error('Approve user API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
