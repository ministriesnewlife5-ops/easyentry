import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';

function normalizeEnvValue(value?: string) {
  return value?.trim().replace(/^['\"]|['\"]$/g, '');
}

function getRazorpayClient() {
  const keyId = normalizeEnvValue(process.env.RAZORPAY_KEY_ID);
  const keySecret = normalizeEnvValue(process.env.RAZORPAY_KEY_SECRET);

  if (!keyId || !keySecret) {
    throw new Error('Missing Razorpay credentials in environment');
  }

  return {
    client: new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    }),
    keyId,
  };
}

function normalizeCode(value?: string) {
  return value?.trim().toUpperCase() || '';
}

type CouponSourceType = 'outlet' | 'artist' | 'promoter' | 'influencer';

type CouponRule = {
  code: string;
  discountPercent: number;
  sourceType: CouponSourceType;
  sourceId?: string;
  sourceName?: string;
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
};

function parseCouponRules(socialLinks: Record<string, unknown> | null): CouponRule[] {
  if (!socialLinks) return [];

  const fromRules = Array.isArray(socialLinks.couponRules)
    ? (socialLinks.couponRules as Array<Record<string, unknown>>)
        .map((rule) => ({
          code: normalizeCode(typeof rule.code === 'string' ? rule.code : undefined),
          discountPercent: Number(rule.discountPercent || 0),
          sourceType: (typeof rule.sourceType === 'string' ? rule.sourceType : 'outlet') as CouponSourceType,
          sourceId: typeof rule.sourceId === 'string' ? rule.sourceId : undefined,
          sourceName: typeof rule.sourceName === 'string' ? rule.sourceName : undefined,
          startsAt: typeof rule.startsAt === 'string' ? rule.startsAt : undefined,
          endsAt: typeof rule.endsAt === 'string' ? rule.endsAt : undefined,
          maxUses: Number.isFinite(Number(rule.maxUses)) ? Number(rule.maxUses) : undefined,
        }))
        .filter((rule) => Boolean(rule.code) && rule.discountPercent > 0 && rule.discountPercent <= 100)
    : [];

  return fromRules;
}

function getCouponStatus(rule: CouponRule): { valid: boolean; reason?: string } {
  const now = Date.now();
  if (rule.startsAt) {
    const startsAt = new Date(rule.startsAt).getTime();
    if (Number.isFinite(startsAt) && now < startsAt) {
      return { valid: false, reason: 'Coupon is not active yet' };
    }
  }

  if (rule.endsAt) {
    const endsAt = new Date(rule.endsAt).getTime();
    if (Number.isFinite(endsAt) && now > endsAt) {
      return { valid: false, reason: 'Coupon has expired' };
    }
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      eventId, 
      eventTitle, 
      ticketCategories,
      couponCode,
      currency = 'INR' 
    } = body;

    if (!eventId || !ticketCategories || ticketCategories.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data: eventData, error: eventError } = await supabase
      .from('published_events')
      .select('title, social_links')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const socialLinks = (eventData.social_links as Record<string, unknown> | null) || null;
    const couponRules = parseCouponRules(socialLinks);

    const requestedCouponCode = normalizeCode(couponCode);
    const matchedRule = requestedCouponCode
      ? couponRules.find((rule) => rule.code === requestedCouponCode)
      : undefined;

    if (requestedCouponCode && !matchedRule) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
    }

    if (matchedRule) {
      const status = getCouponStatus(matchedRule);
      if (!status.valid) {
        return NextResponse.json({ error: status.reason || 'Coupon is not valid right now' }, { status: 400 });
      }
    }

    let usedCount = 0;
    if (matchedRule?.maxUses) {
      const { count, error: countError } = await supabase
        .from('ticket_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('coupon_code', matchedRule.code);

      if (!countError) {
        usedCount = Number(count || 0);
      }

      if (usedCount >= matchedRule.maxUses) {
        return NextResponse.json({ error: 'Coupon usage limit has been reached' }, { status: 400 });
      }
    }

    const discountPercent = matchedRule ? matchedRule.discountPercent : 0;

    const subtotal = ticketCategories.reduce((sum: number, item: { quantity?: number; price?: number }) => {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
    }, 0);
    const totalTickets = ticketCategories.reduce((sum: number, item: { quantity?: number }) => sum + (Number(item.quantity) || 0), 0);
    const convenienceFees = totalTickets > 0 ? totalTickets * 175 : 0;
    const discountAmount = Math.min(subtotal * (discountPercent / 100), subtotal);
    const finalAmount = Math.max(subtotal - discountAmount + convenienceFees, 0);

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const { client: razorpay, keyId } = getRazorpayClient();

    // Create Razorpay order
    const orderOptions: {
      amount: number;
      currency: string;
      receipt: string;
      notes: Record<string, string>;
    } = {
      amount: Math.round(finalAmount * 100), // Razorpay expects amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        eventId: String(eventId),
        eventTitle: String(eventTitle || ''),
        userId: String(session.user.email || ''),
        userEmail: String(session.user.email || ''),
        userName: String(session.user.name || ''),
        ticketCategories: JSON.stringify(ticketCategories),
        couponCode: matchedRule?.code || '',
        couponPercent: String(discountPercent),
        discountAmount: String(discountAmount),
        couponSourceType: matchedRule?.sourceType || '',
        couponSourceId: matchedRule?.sourceId || '',
        couponSourceName: matchedRule?.sourceName || '',
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      discountAmount: Math.round(discountAmount * 100),
      couponCode: matchedRule?.code || '',
      couponAudit: matchedRule ? {
        code: matchedRule.code,
        discountPercent,
        discountAmount: Math.round(discountAmount * 100),
        sourceType: matchedRule.sourceType,
        sourceId: matchedRule.sourceId || null,
        sourceName: matchedRule.sourceName || null,
        startsAt: matchedRule.startsAt || null,
        endsAt: matchedRule.endsAt || null,
        maxUses: matchedRule.maxUses ?? null,
        usedCount,
        remainingUses: matchedRule.maxUses ? Math.max(matchedRule.maxUses - usedCount - 1, 0) : null,
      } : null,
    });

  } catch (error: unknown) {
    const err = error as {
      message?: string;
      statusCode?: number;
      error?: unknown;
    };

    console.error('Razorpay order creation failed:', {
      message: err.message,
      statusCode: err.statusCode,
      error: err.error,
      razorpayKeyIdPrefix: normalizeEnvValue(process.env.RAZORPAY_KEY_ID)?.slice(0, 10),
    });

    if (err.message === 'Missing Razorpay credentials in environment') {
      return NextResponse.json(
        { error: 'Payment gateway is not configured on server' },
        { status: 500 }
      );
    }

    if (err.statusCode === 401) {
      return NextResponse.json(
        {
          error: 'Payment gateway authentication failed. Please contact support.',
          errorCode: 'RAZORPAY_AUTH_FAILED',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
