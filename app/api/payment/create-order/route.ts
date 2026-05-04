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

type GlobalCouponRule = {
  id: string;
  code: string;
  sourceType: 'artist' | 'promoter';
  sourceId?: string;
  sourceName?: string;
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
};

type CheckoutTicketCategory = {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
  artistShare?: number;
  influencerShare?: number;
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function computeEventBasedDiscount(
  ticketCategories: CheckoutTicketCategory[],
  sourceType: 'artist' | 'promoter' | 'influencer'
): { discountAmount: number; effectiveDiscountPercent: number } {
  const subtotal = ticketCategories.reduce((sum, item) => {
    const qty = Math.max(0, toFiniteNumber(item.quantity));
    const price = Math.max(0, toFiniteNumber(item.price));
    return sum + qty * price;
  }, 0);

  if (subtotal <= 0) {
    return { discountAmount: 0, effectiveDiscountPercent: 0 };
  }

  const discountAmount = ticketCategories.reduce((sum, item) => {
    const qty = Math.max(0, toFiniteNumber(item.quantity));
    const price = Math.max(0, toFiniteNumber(item.price));
    const lineSubtotal = qty * price;
    const linePercent =
      sourceType === 'artist'
        ? clampPercent(toFiniteNumber(item.artistShare))
        : clampPercent(toFiniteNumber(item.influencerShare));

    return sum + lineSubtotal * (linePercent / 100);
  }, 0);

  const safeDiscount = Math.min(discountAmount, subtotal);
  return {
    discountAmount: safeDiscount,
    effectiveDiscountPercent: (safeDiscount / subtotal) * 100,
  };
}

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
      .select('title, social_links, ticket_categories, ticket_price')
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

    let matchedGlobalRule: GlobalCouponRule | undefined;

    if (requestedCouponCode && !matchedRule) {
      const { data: globalCoupon, error: globalCouponError } = await supabase
        .from('global_coupons')
        .select('id, code, source_type, source_id, source_name, starts_at, ends_at, max_uses, is_active')
        .eq('code', requestedCouponCode)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (globalCouponError) {
        return NextResponse.json({ error: 'Failed to validate coupon code' }, { status: 500 });
      }

      if (!globalCoupon) {
        return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
      }

      matchedGlobalRule = {
        id: String(globalCoupon.id),
        code: normalizeCode(globalCoupon.code),
        sourceType: String(globalCoupon.source_type) === 'artist' ? 'artist' : 'promoter',
        sourceId: typeof globalCoupon.source_id === 'string' ? globalCoupon.source_id : undefined,
        sourceName: typeof globalCoupon.source_name === 'string' ? globalCoupon.source_name : undefined,
        startsAt: typeof globalCoupon.starts_at === 'string' ? globalCoupon.starts_at : undefined,
        endsAt: typeof globalCoupon.ends_at === 'string' ? globalCoupon.ends_at : undefined,
        maxUses: Number.isFinite(Number(globalCoupon.max_uses)) ? Number(globalCoupon.max_uses) : undefined,
      };
    }

    if (matchedRule) {
      const status = getCouponStatus(matchedRule);
      if (!status.valid) {
        return NextResponse.json({ error: status.reason || 'Coupon is not valid right now' }, { status: 400 });
      }
    }

    if (matchedGlobalRule) {
      const status = getCouponStatus({
        code: matchedGlobalRule.code,
        discountPercent: 0,
        sourceType: matchedGlobalRule.sourceType,
        sourceId: matchedGlobalRule.sourceId,
        sourceName: matchedGlobalRule.sourceName,
        startsAt: matchedGlobalRule.startsAt,
        endsAt: matchedGlobalRule.endsAt,
        maxUses: matchedGlobalRule.maxUses,
      });

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

    if (matchedGlobalRule?.maxUses) {
      const { count, error: countError } = await supabase
        .from('ticket_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_code', matchedGlobalRule.code)
        .eq('coupon_source_type', matchedGlobalRule.sourceType)
        .eq('coupon_source_id', matchedGlobalRule.sourceId || '');

      if (!countError) {
        usedCount = Number(count || 0);
      }

      if (usedCount >= matchedGlobalRule.maxUses) {
        return NextResponse.json({ error: 'Coupon usage limit has been reached' }, { status: 400 });
      }
    }

    const eventTicketCategories = Array.isArray(eventData.ticket_categories)
      ? (eventData.ticket_categories as Array<Record<string, unknown>>)
      : [];

    const normalizedCategories: CheckoutTicketCategory[] = (ticketCategories as CheckoutTicketCategory[]).map((item) => {
      const itemId = String(item.id || '');
      const itemName = String(item.name || '').trim().toLowerCase();
      const matchedEventCategory = eventTicketCategories.find((cat) => {
        const catId = String(cat.id || '');
        const catName = String(cat.name || '').trim().toLowerCase();
        return (itemId && catId && itemId === catId) || (itemName && catName && itemName === catName);
      });

      return {
        id: itemId,
        name: String(item.name || matchedEventCategory?.name || ''),
        quantity: Math.max(0, toFiniteNumber(item.quantity)),
        price: Math.max(0, toFiniteNumber(matchedEventCategory?.price ?? item.price ?? eventData.ticket_price)),
        artistShare: clampPercent(toFiniteNumber(matchedEventCategory?.artistShare ?? item.artistShare)),
        influencerShare: clampPercent(toFiniteNumber(matchedEventCategory?.influencerShare ?? item.influencerShare)),
      };
    });

    const subtotal = normalizedCategories.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
    const totalTickets = normalizedCategories.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const convenienceFees = totalTickets > 0 ? totalTickets * 175 : 0;

    let discountPercent = matchedRule ? matchedRule.discountPercent : 0;
    let discountAmount = Math.min(subtotal * (discountPercent / 100), subtotal);

    if (matchedGlobalRule) {
      const sourceForDiscount = matchedGlobalRule.sourceType === 'artist' ? 'artist' : 'influencer';
      const eventBasedDiscount = computeEventBasedDiscount(normalizedCategories, sourceForDiscount);
      discountAmount = eventBasedDiscount.discountAmount;
      discountPercent = eventBasedDiscount.effectiveDiscountPercent;
    }

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
        ticketCategories: JSON.stringify(normalizedCategories),
        couponCode: matchedRule?.code || matchedGlobalRule?.code || '',
        couponPercent: String(discountPercent),
        discountAmount: String(discountAmount),
        couponSourceType: matchedRule?.sourceType || matchedGlobalRule?.sourceType || '',
        couponSourceId: matchedRule?.sourceId || matchedGlobalRule?.sourceId || '',
        couponSourceName: matchedRule?.sourceName || matchedGlobalRule?.sourceName || '',
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
      couponCode: matchedRule?.code || matchedGlobalRule?.code || '',
      couponAudit: matchedRule || matchedGlobalRule ? {
        code: matchedRule?.code || matchedGlobalRule?.code || '',
        discountPercent,
        discountAmount: Math.round(discountAmount * 100),
        sourceType: matchedRule?.sourceType || matchedGlobalRule?.sourceType || null,
        sourceId: matchedRule?.sourceId || matchedGlobalRule?.sourceId || null,
        sourceName: matchedRule?.sourceName || matchedGlobalRule?.sourceName || null,
        startsAt: matchedRule?.startsAt || matchedGlobalRule?.startsAt || null,
        endsAt: matchedRule?.endsAt || matchedGlobalRule?.endsAt || null,
        maxUses: matchedRule?.maxUses ?? matchedGlobalRule?.maxUses ?? null,
        usedCount,
        remainingUses:
          (matchedRule?.maxUses ?? matchedGlobalRule?.maxUses)
            ? Math.max((matchedRule?.maxUses ?? matchedGlobalRule?.maxUses ?? 0) - usedCount - 1, 0)
            : null,
        discountModel: matchedGlobalRule ? 'event-based' : 'fixed-percent',
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
