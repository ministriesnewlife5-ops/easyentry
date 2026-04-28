import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get convenience fee from settings table
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'convenience_fee')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching convenience fee:', error);
      return NextResponse.json({ error: 'Failed to fetch convenience fee' }, { status: 500 });
    }

    const fee = data?.value ? parseInt(data.value) : 175; // Default to 175 if not set

    return NextResponse.json({ fee });
  } catch (error) {
    console.error('Error in convenience fee API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fee } = await request.json();

    if (typeof fee !== 'number' || fee < 0) {
      return NextResponse.json({ error: 'Invalid fee amount' }, { status: 400 });
    }

    // Upsert convenience fee in settings table
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'convenience_fee',
        value: fee.toString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key'
      });

    if (error) {
      console.error('Error updating convenience fee:', error);
      return NextResponse.json({ error: 'Failed to update convenience fee' }, { status: 500 });
    }

    return NextResponse.json({ success: true, fee });
  } catch (error) {
    console.error('Error in convenience fee API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}