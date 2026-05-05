import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';

const CONVENIENCE_FEE_KEY = 'convenience_fee';
const DEFAULT_CONVENIENCE_FEE = 175;

function toFee(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_CONVENIENCE_FEE;
  }
  return Math.round(parsed);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Get convenience fee from app_settings table
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', CONVENIENCE_FEE_KEY)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching convenience fee:', error);
      return NextResponse.json({ fee: DEFAULT_CONVENIENCE_FEE });
    }

    const fee = data ? toFee(data.value) : DEFAULT_CONVENIENCE_FEE;

    return NextResponse.json({ fee });
  } catch (error) {
    console.error('Error in convenience fee API:', error);
    return NextResponse.json({ fee: DEFAULT_CONVENIENCE_FEE });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    const { fee } = await request.json();
    const normalizedFee = Number(fee);

    if (!Number.isFinite(normalizedFee) || normalizedFee < 0) {
      return NextResponse.json({ error: 'Invalid fee amount' }, { status: 400 });
    }

    // Upsert convenience fee in app_settings table
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: CONVENIENCE_FEE_KEY,
        value: Math.round(normalizedFee),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key'
      });

    if (error) {
      console.error('Error updating convenience fee:', error);
      return NextResponse.json({ error: 'Failed to update convenience fee' }, { status: 500 });
    }

    return NextResponse.json({ success: true, fee: Math.round(normalizedFee) });
  } catch (error) {
    console.error('Error in convenience fee API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}