import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminRole } from '@/lib/roles';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function PATCH(request: NextRequest, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminRole(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // params may be a Promise in some Next.js types; support both
    const resolvedParams = context?.params && typeof context.params.then === 'function' ? await context.params : context?.params;
    const id = resolvedParams?.id;
    const body = await request.json();
    const convenienceFee = Number(body?.convenienceFee ?? 0);
    const conveyanceFeeGstPercent = Number(body?.conveyanceFeeGstPercent ?? 0);

    const supabase = getSupabaseServerClient();
    const { data: existingEvent, error: selectError } = await supabase
      .from('published_events')
      .select('social_links')
      .eq('id', id)
      .maybeSingle();

    if (selectError) {
      console.error('Failed to load existing event social links:', selectError.message);
      return NextResponse.json({ error: 'Failed to update conveyance fee' }, { status: 500 });
    }

    const existingLinks = existingEvent?.social_links as Record<string, unknown> | null;
    const newSocialLinks = {
      ...(typeof existingLinks === 'object' && existingLinks ? existingLinks : {}),
      convenienceFeeGstPercent: Number.isFinite(conveyanceFeeGstPercent) ? conveyanceFeeGstPercent : 0,
    };

    const { data, error } = await supabase
      .from('published_events')
      .update({
        convenience_fee: Number.isFinite(convenienceFee) ? convenienceFee : 0,
        social_links: newSocialLinks,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update convenience fee:', error.message);
      return NextResponse.json({ error: 'Failed to update convenience fee' }, { status: 500 });
    }

    return NextResponse.json({ event: data });
  } catch (err) {
    console.error('Error in convenience-fee PATCH:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
