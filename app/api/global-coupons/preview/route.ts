import { getSupabaseServerClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

type TicketCategory = {
  id: string;
  name?: string;
  artistShare?: number;
  influencerShare?: number;
  artist_share?: number;
  influencer_share?: number;
};

type PublishedEventRow = {
  id: string;
  title?: string;
};

type GlobalCouponRow = {
  code: string;
  source_type: 'artist' | 'promoter';
  source_id: string;
  is_active: boolean;
  usage_count: number;
  max_uses: number | null;
  starts_at: string | null;
  ends_at: string | null;
};

interface PreviewRequest {
  code: string;
  eventId: string;
  tickets: Array<{
    ticketCategoryId: string;
    ticketCategoryName?: string;
    quantity: number;
    price: number;
  }>;
}

interface CouponPreviewResponse {
  valid: boolean;
  code: string;
  message: string;
  discount?: {
    percent: number;
    amount: number;
    breakdown: Array<{
      ticketCategoryId: string;
      quantity: number;
      unitPrice: number;
      sharePercent: number;
      discountAmount: number;
    }>;
  };
}

type CouponQuickValidationResponse = {
  valid: boolean;
  code?: string;
  usageRemaining?: number | null;
  message: string;
};

/**
 * POST /api/global-coupons/preview
 * 
 * Preview what discount will be applied for a given coupon code, event, and cart
 * 
 * Request body:
 * {
 *   "code": "ARTIST123",
 *   "eventId": "event-uuid",
 *   "tickets": [
 *     { "ticketCategoryId": "cat-1", "quantity": 2, "price": 500 },
 *     { "ticketCategoryId": "cat-2", "quantity": 1, "price": 1000 }
 *   ]
 * }
 * 
 * Response:
 * {
 *   "valid": true,
 *   "code": "ARTIST123",
 *   "message": "Coupon applied successfully",
 *   "discount": {
 *     "percent": 15,
 *     "amount": 225,
 *     "breakdown": [...]
 *   }
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<CouponPreviewResponse>> {
  try {
    const supabase = getSupabaseServerClient();
    const body: PreviewRequest = await request.json();
    const { code, eventId, tickets } = body;
    const normalizedEventId = String(eventId || '').trim();

    if (!code || !normalizedEventId || !tickets || tickets.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          code,
          message: 'Missing required fields: code, eventId, and tickets'
        },
        { status: 400 }
      );
    }

    // Fetch event core row (published event id)
    const { data: eventById, error: eventByIdError } = await supabase
      .from('published_events')
      .select('id, title')
      .eq('id', normalizedEventId)
      .maybeSingle();

    // Fallback: frontend may pass event request id; resolve via published_events.request_id
    const { data: eventByRequestId, error: eventByRequestIdError } = !eventById
      ? await supabase
          .from('published_events')
          .select('id, title')
          .eq('request_id', normalizedEventId)
          .maybeSingle()
      : { data: null, error: null };

    const event = eventById || eventByRequestId;
    const eventError = eventByIdError || eventByRequestIdError;

    if (eventError || !event) {
      return NextResponse.json(
        {
          valid: false,
          code,
          message: 'Event not found'
        },
        { status: 404 }
      );
    }

    // Normalize code and lookup coupon (case-insensitive). Use maybeSingle
    // to avoid errors if duplicate rows exist; we'll treat not-found the same.
    const lookupCode = String(code || '').trim();
    const { data: coupon, error: couponError } = await supabase
      .from('global_coupons')
      .select('*')
      .ilike('code', lookupCode)
      .eq('is_active', true)
      .maybeSingle();

    if (couponError || !coupon) {
      console.warn('global-coupons/preview: coupon lookup failed', { code: lookupCode, couponError });
      return NextResponse.json(
        {
          valid: false,
          code: lookupCode,
          message: 'Coupon code not found or inactive'
        },
        { status: 404 }
      );
    }

    const typedCoupon = coupon as GlobalCouponRow;
    const typedEvent = event as PublishedEventRow;
    const resolvedEventId = String(typedEvent.id || '');

    // Fetch normalized ticket categories from dedicated table (authoritative source)
    const { data: ticketCategoryRows, error: ticketCategoryError } = await supabase
      .from('ticket_categories')
      .select('id, name, artist_share, influencer_share')
      .eq('event_id', resolvedEventId);

    if (ticketCategoryError) {
      return NextResponse.json(
        {
          valid: false,
          code,
          message: 'Failed to read event ticket categories'
        },
        { status: 500 }
      );
    }

    // Check if coupon has reached max uses
    if (typedCoupon.max_uses !== null && typedCoupon.usage_count >= typedCoupon.max_uses) {
      return NextResponse.json(
        {
          valid: false,
          code,
          message: 'Coupon usage limit reached'
        },
        { status: 400 }
      );
    }

    // Check active window
    if (typedCoupon.starts_at && new Date(typedCoupon.starts_at) > new Date()) {
      return NextResponse.json(
        {
          valid: false,
          code,
          message: 'Coupon is not active yet'
        },
        { status: 400 }
      );
    }

    if (typedCoupon.ends_at && new Date(typedCoupon.ends_at) < new Date()) {
      return NextResponse.json(
        {
          valid: false,
          code,
          message: 'Coupon has expired'
        },
        { status: 400 }
      );
    }

    // Calculate event-based discount from ticket categories
    const tableCategories = Array.isArray(ticketCategoryRows)
      ? (ticketCategoryRows as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id || ''),
          name: typeof row.name === 'string' ? row.name : undefined,
          artist_share: Number(row.artist_share || 0),
          influencer_share: Number(row.influencer_share || 0),
        }))
      : [];

    const ticketCategories: TicketCategory[] = tableCategories;

    let totalDiscount = 0;
    const breakdown: NonNullable<CouponPreviewResponse['discount']>['breakdown'] = [];

    for (const ticket of tickets) {
      const category = ticketCategories.find((tc) => {
        const byId = String(tc.id || '') === String(ticket.ticketCategoryId || '');
        const byName =
          Boolean(ticket.ticketCategoryName) &&
          typeof tc.name === 'string' &&
          tc.name.trim().toLowerCase() === String(ticket.ticketCategoryName).trim().toLowerCase();
        return byId || byName;
      });

      if (!category) {
        return NextResponse.json(
          {
            valid: false,
            code,
            message: `Ticket category ${ticket.ticketCategoryId} not found`
          },
          { status: 400 }
        );
      }

      // Determine share percentage based on event creator type
      const sharePercent = typedCoupon.source_type === 'artist'
        ? Number(category.artist_share ?? category.artistShare ?? 0)
        : Number(category.influencer_share ?? category.influencerShare ?? 0);

      const lineTotal = ticket.quantity * ticket.price;
      const lineDiscount = lineTotal * (sharePercent / 100);

      totalDiscount += lineDiscount;

      breakdown.push({
        ticketCategoryId: ticket.ticketCategoryId,
        quantity: ticket.quantity,
        unitPrice: ticket.price,
        sharePercent,
        discountAmount: lineDiscount
      });
    }

    // Calculate overall discount percentage
    const cartTotal = tickets.reduce((sum, t) => sum + (t.quantity * t.price), 0);
    const discountPercent = cartTotal > 0 ? (totalDiscount / cartTotal) * 100 : 0;

    if (totalDiscount <= 0) {
      return NextResponse.json(
        {
          valid: false,
          code: typedCoupon.code,
          message: 'Coupon not applicable to selected tickets for this event'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      message: 'Coupon preview calculated successfully',
      discount: {
        percent: Math.round(discountPercent * 100) / 100,
        amount: Math.round(totalDiscount * 100) / 100,
        breakdown
      }
    });

  } catch (error) {
    console.error('Error in coupon preview:', error);
    return NextResponse.json(
      {
        valid: false,
        code: '',
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/global-coupons/preview?code=ARTIST123
 * 
 * Quick validation of coupon without event context
 */
export async function GET(request: NextRequest): Promise<NextResponse<CouponQuickValidationResponse>> {
  try {
    const supabase = getSupabaseServerClient();
    const code = String(request.nextUrl.searchParams.get('code') || '').trim();

    if (!code) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Code parameter required'
        },
        { status: 400 }
      );
    }

    const { data: coupon, error } = await supabase
      .from('global_coupons')
      .select('code, is_active, usage_count, max_uses, starts_at, ends_at')
      .ilike('code', code)
      .maybeSingle();

    if (error || !coupon) {
      console.warn('global-coupons/preview GET: coupon lookup failed', { code, error });
      return NextResponse.json({
        valid: false,
        code,
        message: 'Coupon not found'
      });
    }

    if (!coupon.is_active) {
      return NextResponse.json({
        valid: false,
        code,
        message: 'Coupon is inactive'
      });
    }

    if (coupon.max_uses !== null && coupon.usage_count >= coupon.max_uses) {
      return NextResponse.json({
        valid: false,
        code,
        message: 'Coupon usage limit reached'
      });
    }

    if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
      return NextResponse.json({
        valid: false,
        code,
        message: 'Coupon is not active yet'
      });
    }

    if (coupon.ends_at && new Date(coupon.ends_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        code,
        message: 'Coupon has expired'
      });
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      usageRemaining: coupon.max_uses - coupon.usage_count,
      message: 'Coupon is valid'
    });

  } catch (error) {
    console.error('Error in coupon preview GET:', error);
    return NextResponse.json(
      { valid: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
