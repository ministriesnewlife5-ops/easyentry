import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';

type EligibleRole = 'artist' | 'promoter';

function normalizeCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function toSourceType(role: string): EligibleRole | null {
  if (role === 'artist' || role === 'promoter') {
    return role;
  }
  return null;
}

function toMoney(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

// GET: Fetch all global coupons for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sourceType = toSourceType(session.user.role);
    if (!sourceType) {
      return NextResponse.json({ error: 'Only artists and promoters can manage global coupons' }, { status: 403 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseServerClient();

    // Fetch global coupons created by this user
    const { data: coupons, error: couponError } = await supabase
      .from('global_coupons')
      .select('*')
      .eq('source_id', userId)
      .eq('source_type', sourceType)
      .order('created_at', { ascending: false });

    if (couponError) {
      throw new Error(`Failed to fetch global coupons: ${couponError.message}`);
    }

    // Fetch earnings from bookings using these coupons
    const { data: bookingsData, error: bookingError } = await supabase
      .from('ticket_bookings')
      .select('id, coupon_code, event_title, booked_at, ticket_categories, amount_paid')
      .eq('status', 'confirmed')
      .eq('coupon_source_id', userId)
      .eq('coupon_source_type', sourceType)
      .order('booked_at', { ascending: false });

    if (bookingError) {
      throw new Error(`Failed to read booking earnings: ${bookingError.message}`);
    }

    const bookings = (bookingsData as Array<Record<string, unknown>> | null) || [];

    // Calculate earnings for each coupon
    let totalShareAmount = 0;
    let totalBookedAmount = 0;
    let totalBookings = 0;

    const couponEarnings = new Map<string, {
      code: string;
      bookings: number;
      shareAmount: number;
      bookedAmount: number;
    }>();

    for (const booking of bookings) {
      const code = normalizeCode(booking.coupon_code);
      const ticketCategories = Array.isArray(booking.ticket_categories)
        ? (booking.ticket_categories as Array<Record<string, unknown>>)
        : [];

      // Calculate artist/promoter share from ticket categories
      const shareAmount = ticketCategories.reduce((sum, ticket) => {
        const qty = Math.max(0, Number(ticket.quantity || 0));
        const price = Math.max(0, Number(ticket.price || 0));
        const sharePercent =
          sourceType === 'artist'
            ? Math.max(0, Number(ticket.artistShare || 0))
            : Math.max(0, Number(ticket.influencerShare || 0));

        if (!Number.isFinite(qty) || !Number.isFinite(price) || !Number.isFinite(sharePercent)) {
          return sum;
        }

        return sum + qty * price * (sharePercent / 100);
      }, 0);

      const bookedAmount = toMoney(booking.amount_paid);

      totalShareAmount += shareAmount;
      totalBookedAmount += bookedAmount;
      totalBookings += 1;

      if (code) {
        const current = couponEarnings.get(code) || {
          code,
          bookings: 0,
          shareAmount: 0,
          bookedAmount: 0,
        };
        current.bookings += 1;
        current.shareAmount += shareAmount;
        current.bookedAmount += bookedAmount;
        couponEarnings.set(code, current);
      }
    }

    return NextResponse.json({
      sourceType,
      coupons: coupons || [],
      earnings: {
        totalShareAmount,
        totalBookedAmount,
        totalBookings,
        byCode: Array.from(couponEarnings.values()).sort((a, b) => b.shareAmount - a.shareAmount),
      },
    });
  } catch (error) {
    console.error('Failed to fetch global coupons:', error);
    return NextResponse.json({ error: 'Failed to fetch global coupons' }, { status: 500 });
  }
}

// POST: Create a new global coupon
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sourceType = toSourceType(session.user.role);
    if (!sourceType) {
      return NextResponse.json({ error: 'Only artists and promoters can create global coupons' }, { status: 403 });
    }

    const body = await request.json();
    const code = normalizeCode(body.code || body.promoCode);
    const startsAt = typeof body.startsAt === 'string' ? body.startsAt : null;
    const endsAt = typeof body.endsAt === 'string' ? body.endsAt : null;
    const maxUses = Number.isFinite(Number(body.maxUses)) ? Number(body.maxUses) : null;

    // Validation
    if (!code || !/^[A-Z0-9_-]{3,24}$/.test(code)) {
      return NextResponse.json(
        { error: 'Coupon code must be 3-24 characters (A-Z, 0-9, _ or -)' },
        { status: 400 }
      );
    }

    if (startsAt && endsAt) {
      const start = new Date(startsAt).getTime();
      const end = new Date(endsAt).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }
      if (start >= end) {
        return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
      }
    }

    if (maxUses !== null && maxUses <= 0) {
      return NextResponse.json({ error: 'Max uses must be greater than 0' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Check if coupon code already exists globally
    const { data: existing, error: checkError } = await supabase
      .from('global_coupons')
      .select('id')
      .eq('code', code)
      .eq('source_type', sourceType)
      .eq('source_id', session.user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing coupon: ${checkError.message}`);
    }

    if (existing) {
      return NextResponse.json({ error: 'This global coupon code already exists' }, { status: 400 });
    }

    // Create new global coupon
    const { data: newCoupon, error: insertError } = await supabase
      .from('global_coupons')
      .insert({
        code,
        // Event-level discount is derived at checkout from ticket category settings.
        // Keep this as 0 for compatibility with existing schema.
        discount_percent: 0,
        source_type: sourceType,
        source_id: session.user.id,
        source_name: session.user.name || undefined,
        is_active: true,
        starts_at: startsAt,
        ends_at: endsAt,
        max_uses: maxUses,
        usage_count: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create coupon: ${insertError.message}`);
    }

    return NextResponse.json({ success: true, coupon: newCoupon });
  } catch (error) {
    console.error('Failed to create global coupon:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create global coupon' },
      { status: 500 }
    );
  }
}
