import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';
import { respondError, respondSuccess, logStructured } from '@/lib/api-utils';

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
  platformFee?: number;
  paymentGatewayFee?: number;
  gstPercent?: number;
};

type DbTicketCategory = {
  id: string;
  name: string;
  price: number;
  artist_share?: number | null;
  influencer_share?: number | null;
  platform_fee?: number | null;
  payment_gateway_fee?: number | null;
  gst_percent?: number | null;
  quantity?: number | null;
  available_from?: string | null;
  available_until?: string | null;
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
        : (sourceType === 'promoter'
            ? clampPercent(toFiniteNumber(item.influencerShare))
            : 0);

    return sum + lineSubtotal * (linePercent / 100);
  }, 0);

  const safeDiscount = Math.min(discountAmount, subtotal);
  return {
    discountAmount: safeDiscount,
    effectiveDiscountPercent: (safeDiscount / subtotal) * 100,
  };
}

function computeMoneySplit(
  ticketCategories: CheckoutTicketCategory[],
  couponSourceType?: string | null
): {
  basePrice: number;
  discountAmount: number;
  discountPercent: number;
  subtotal: number;
  paymentGatewayFeeAmount: number;
  platformFeeAmount: number;
  gstAmount: number;
  customerPaysTotal: number;
  commissionAmount: number;
  organizerAmount: number;
} {
  let basePrice = 0;
  let discountAmount = 0;
  let subtotal = 0;
  let paymentGatewayFeeAmount = 0;
  let platformFeeAmount = 0;
  let gstAmount = 0;

  for (const item of ticketCategories) {
    const qty = Math.max(0, toFiniteNumber(item.quantity));
    const price = Math.max(0, toFiniteNumber(item.price));
    const lineBase = qty * price;

    const couponSharePercent = couponSourceType === 'artist'
      ? clampPercent(toFiniteNumber(item.artistShare))
      : (couponSourceType === 'promoter'
          ? clampPercent(toFiniteNumber(item.influencerShare))
          : 0);

    const lineDiscount = lineBase * (couponSharePercent / 100);
    const lineSubtotal = Math.max(0, lineBase - lineDiscount);

    const linePgFee = lineSubtotal * (clampPercent(toFiniteNumber(item.paymentGatewayFee)) / 100);
    const linePlatformFee = lineSubtotal * (clampPercent(toFiniteNumber(item.platformFee)) / 100);
    const lineGst = lineBase * (clampPercent(toFiniteNumber(item.gstPercent)) / 100);

    basePrice += lineBase;
    discountAmount += lineDiscount;
    subtotal += lineSubtotal;
    paymentGatewayFeeAmount += linePgFee;
    platformFeeAmount += linePlatformFee;
    gstAmount += lineGst;
  }

  const customerPaysTotal = Math.max(0, subtotal + platformFeeAmount + paymentGatewayFeeAmount + gstAmount);
  const commissionAmount = discountAmount;
  const organizerAmount = subtotal - commissionAmount;
  const discountPercent = basePrice > 0 ? (discountAmount / basePrice) * 100 : 0;

  return {
    basePrice,
    discountAmount,
    discountPercent,
    subtotal,
    paymentGatewayFeeAmount,
    platformFeeAmount,
    gstAmount,
    customerPaysTotal,
    commissionAmount,
    organizerAmount,
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
      logStructured('payment/create-order', 'Unauthorized create-order attempt');
      return respondError('UNAUTHORIZED', 'Unauthorized', null, 401);
    }

    const body = await request.json();
    console.log('[payment/create-order] incoming request body', body);
    const { 
      eventId, 
      eventTitle, 
      ticketCategories,
      couponCode,
      currency = 'INR' 
    } = body;

    const normalizedEventId = typeof eventId === 'string' ? eventId.trim() : '';
    console.log('[payment/create-order] received eventId', normalizedEventId);

    if (!normalizedEventId || !ticketCategories || ticketCategories.length === 0) {
      logStructured('payment/create-order', 'Missing required fields', { normalizedEventId: Boolean(normalizedEventId), ticketCategoriesLength: Array.isArray(ticketCategories) ? ticketCategories.length : 0 });
      return respondError('MISSING_REQUIRED_FIELDS', 'Missing required fields', null, 400);
    }

    const supabase = getSupabaseServerClient();
    const eventQuery = supabase
      .from('published_events')
      .select('id, title, social_links, ticket_price, date, time, request_id')
      .eq('id', normalizedEventId)
      .single();

    console.log('[payment/create-order] published_events query', {
      table: 'published_events',
      filter: { id: normalizedEventId },
      select: 'id, title, social_links, ticket_price, date, time, request_id',
    });

    const { data: eventData, error: eventError } = await eventQuery;

    console.log('[payment/create-order] published_events query result', {
      eventId: normalizedEventId,
      hasData: Boolean(eventData),
      error: eventError
        ? { message: eventError.message, code: eventError.code, details: eventError.details, hint: eventError.hint }
        : null,
      data: eventData
        ? {
            id: (eventData as { id?: string }).id,
            title: (eventData as { title?: string }).title,
            request_id: (eventData as { request_id?: string }).request_id,
          }
        : null,
    });

    let resolvedEventData = eventData;
    let resolvedSource: 'id' | 'request_id' | null = eventData ? 'id' : null;

    if (eventError || !eventData) {
      const fallbackPublishedLookup = normalizedEventId
        ? await supabase
            .from('published_events')
        .select('id, title, social_links, ticket_price, date, time, request_id')
            .eq('request_id', normalizedEventId)
            .maybeSingle()
        : { data: null, error: null };

      if (fallbackPublishedLookup.data) {
        resolvedEventData = fallbackPublishedLookup.data;
        resolvedSource = 'request_id';
        console.warn('[payment/create-order] resolved event via published_events.request_id fallback', {
          eventId: normalizedEventId,
          publishedEventId: (fallbackPublishedLookup.data as { id?: string }).id,
          requestId: (fallbackPublishedLookup.data as { request_id?: string }).request_id,
        });
      }
    }

    if (eventError || !resolvedEventData) {
      let alternateLookup: Array<{ table: string; field: string; found: boolean }> = [];
      if (normalizedEventId) {
        const [{ data: requestRecord }, { data: requestPublishedRecord }] = await Promise.all([
          supabase
            .from('event_requests')
            .select('id')
            .eq('id', normalizedEventId)
            .maybeSingle(),
          supabase
            .from('published_events')
            .select('id, request_id')
            .eq('request_id', normalizedEventId)
            .maybeSingle(),
        ]);

        alternateLookup = [
          {
            table: 'event_requests',
            field: 'id',
            found: Boolean(requestRecord),
          },
          {
            table: 'published_events',
            field: 'request_id',
            found: Boolean(requestPublishedRecord),
          },
        ];
      }

      const queryResult = {
        data: resolvedEventData ?? null,
        error: eventError
          ? {
              message: eventError.message,
              code: eventError.code,
              details: eventError.details,
              hint: eventError.hint,
            }
          : null,
        alternateLookup,
        resolvedSource,
      };

      console.error('[payment/create-order] EVENT_NOT_FOUND', {
        eventId: normalizedEventId,
        searchedTable: 'published_events',
        queryResult,
      });

      return NextResponse.json(
        {
          code: 'EVENT_NOT_FOUND',
          eventId: normalizedEventId,
          searchedTable: 'published_events',
          queryResult,
        },
        { status: 404 }
      );
    }

    const resolvedPublishedEventId = String((resolvedEventData as { id?: string }).id || normalizedEventId);

    const { data: dbTicketCategories, error: ticketCategoriesError } = await supabase
      .from('ticket_categories')
      .select('id, name, price, artist_share, influencer_share, platform_fee, payment_gateway_fee, gst_percent, quantity, available_from, available_until')
      .eq('event_id', resolvedPublishedEventId)
      .order('created_at', { ascending: true });

    console.log('[payment/create-order] ticket_categories query', {
      table: 'ticket_categories',
      filter: { event_id: normalizedEventId },
      select: 'id, name, price, quantity, available_from, available_until',
      resultCount: Array.isArray(dbTicketCategories) ? dbTicketCategories.length : 0,
      error: ticketCategoriesError
        ? { message: ticketCategoriesError.message, code: ticketCategoriesError.code, details: ticketCategoriesError.details, hint: ticketCategoriesError.hint }
        : null,
    });

    const eventTicketCategories = Array.isArray(dbTicketCategories)
      ? (dbTicketCategories as DbTicketCategory[])
      : [];

    const socialLinks = (resolvedEventData.social_links as Record<string, unknown> | null) || null;
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
        logStructured('payment/create-order', 'Global coupon validation failed', { error: globalCouponError });
        return respondError('COUPON_VALIDATION_FAILED', 'Failed to validate coupon code', { error: (globalCouponError as any)?.message || String(globalCouponError) }, 500);
      }

      if (!globalCoupon) {
        logStructured('payment/create-order', 'Invalid global coupon code', { requestedCouponCode });
        return respondError('INVALID_COUPON', 'Invalid coupon code', { code: requestedCouponCode }, 400);
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
        logStructured('payment/create-order', 'Coupon rule not valid', { rule: matchedRule, reason: status.reason });
        return respondError('COUPON_NOT_ACTIVE', status.reason || 'Coupon is not valid right now', null, 400);
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
        logStructured('payment/create-order', 'Global coupon not active', { matchedGlobalRule, reason: status.reason });
        return respondError('COUPON_NOT_ACTIVE', status.reason || 'Coupon is not valid right now', null, 400);
      }
    }

    let usedCount = 0;
    if (matchedRule?.maxUses) {
      const { count, error: countError } = await supabase
        .from('ticket_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', normalizedEventId)
        .eq('coupon_code', matchedRule.code);

      if (!countError) {
        usedCount = Number(count || 0);
      }

      if (usedCount >= matchedRule.maxUses) {
        logStructured('payment/create-order', 'Coupon max uses reached', { code: matchedRule.code, maxUses: matchedRule.maxUses, usedCount });
        return respondError('COUPON_MAX_USES', 'Coupon usage limit has been reached', { code: matchedRule.code }, 400);
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
        logStructured('payment/create-order', 'Global coupon max uses reached', { code: matchedGlobalRule.code, maxUses: matchedGlobalRule.maxUses, usedCount });
        return respondError('COUPON_MAX_USES', 'Coupon usage limit has been reached', { code: matchedGlobalRule.code }, 400);
      }
    }

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
        price: Math.max(0, toFiniteNumber(matchedEventCategory?.price ?? item.price ?? resolvedEventData.ticket_price)),
        artistShare: clampPercent(toFiniteNumber(matchedEventCategory?.artist_share ?? item.artistShare)),
        influencerShare: clampPercent(toFiniteNumber(matchedEventCategory?.influencer_share ?? item.influencerShare)),
        platformFee: clampPercent(toFiniteNumber(matchedEventCategory?.platform_fee ?? item.platformFee)),
        paymentGatewayFee: clampPercent(toFiniteNumber(matchedEventCategory?.payment_gateway_fee ?? item.paymentGatewayFee)),
        gstPercent: clampPercent(toFiniteNumber(matchedEventCategory?.gst_percent ?? item.gstPercent)),
      };
    });

    const basePrice = normalizedCategories.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
    const totalTickets = normalizedCategories.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Read authoritative convenience fee from app_settings (fallback to 175)
    const { data: feeSetting, error: feeError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'convenience_fee')
      .maybeSingle();

    const configuredFlatFee = feeSetting && feeSetting.value != null ? Number(feeSetting.value) : 175;
    const legacyFlatConvenienceFee = totalTickets > 0 ? totalTickets * (Number.isFinite(configuredFlatFee) ? Math.round(configuredFlatFee) : 175) : 0;

    const activeCouponSourceType: string | null = matchedRule?.sourceType || matchedGlobalRule?.sourceType || null;
    const split = computeMoneySplit(normalizedCategories, activeCouponSourceType);

    let discountAmount = split.discountAmount;
    let discountPercent = split.discountPercent;
    let subtotal = split.subtotal;
    let paymentGatewayFeeAmount = split.paymentGatewayFeeAmount;
    let platformFeeAmount = split.platformFeeAmount;
    let gstAmount = split.gstAmount;
    let finalAmount = split.customerPaysTotal;

    // Keep legacy fallback only when no percentage-based fees are configured.
    if (platformFeeAmount === 0 && paymentGatewayFeeAmount === 0 && gstAmount === 0) {
      finalAmount = Math.max(subtotal + legacyFlatConvenienceFee, 0);
      platformFeeAmount = legacyFlatConvenienceFee;
    }

      if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
        logStructured('payment/create-order', 'Invalid final amount', { finalAmount });
        return respondError('INVALID_AMOUNT', 'Invalid amount', { finalAmount }, 400);
      }

    // Persist canonical checkout intent (server authoritative)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const { data: intentCreated, error: intentError } = await supabase
      .from('checkout_intents')
      .insert([
        {
          user_id: session.user.id,
          event_id: resolvedPublishedEventId,
          ticket_categories: normalizedCategories,
          subtotal: basePrice,
          discount_amount: discountAmount,
          discount_percent: discountPercent || null,
          coupon_code: matchedRule?.code || matchedGlobalRule?.code || null,
          coupon_source_type: matchedRule?.sourceType || matchedGlobalRule?.sourceType || null,
          coupon_source_id: matchedRule?.sourceId || matchedGlobalRule?.sourceId || null,
          // Store platform fee in convenience_fee for backward compatibility
          convenience_fee: platformFeeAmount,
          final_amount: finalAmount,
          currency,
          expires_at: expiresAt,
        },
      ])
      .select()
      .single();

    if (intentError || !intentCreated) {
      console.error('Failed to create checkout intent:', intentError);
        logStructured('payment/create-order', 'Failed to create checkout intent', { intentError });
        return respondError('INTENT_CREATE_FAILED', 'Failed to create checkout intent', { error: (intentError as any)?.message || String(intentError) }, 500);
    }

    const intentId = intentCreated.id;

    const { client: razorpay, keyId } = getRazorpayClient();

    // Create Razorpay order using authoritative final amount and attach receipt = intentId
    const orderOptions = {
      amount: Math.round(finalAmount * 100), // Razorpay expects amount in paise
      currency,
      receipt: String(intentId),
      notes: {
        intent_id: String(intentId),
        eventId: resolvedPublishedEventId,
        publishedEventId: resolvedPublishedEventId,
        basePrice: String(Math.round(basePrice * 100) / 100),
        subtotal: String(Math.round(subtotal * 100) / 100),
        discountAmount: String(Math.round(discountAmount * 100) / 100),
        platformFee: String(Math.round(platformFeeAmount * 100) / 100),
        paymentGatewayFee: String(Math.round(paymentGatewayFeeAmount * 100) / 100),
        gstAmount: String(Math.round(gstAmount * 100) / 100),
        resolvedFrom: resolvedSource || 'id',
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    // Persist razorpay order id back to intent record
    await supabase
      .from('checkout_intents')
      .update({ razorpay_order_id: order.id, updated_at: new Date().toISOString() })
      .eq('id', intentId);

    return respondSuccess({ orderId: order.id, amount: order.amount, currency: order.currency, keyId, intentId }, 'ORDER_CREATED', 'Payment order created', 200);

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
      logStructured('payment/create-order', 'Razorpay credentials missing');
      return respondError('PAYMENT_GATEWAY_NOT_CONFIGURED', 'Payment gateway is not configured on server', null, 500);
    }

    if (err.statusCode === 401) {
      logStructured('payment/create-order', 'Razorpay authentication failed', { statusCode: err.statusCode });
      return respondError('RAZORPAY_AUTH_FAILED', 'Payment gateway authentication failed. Please contact support.', { statusCode: err.statusCode }, 502);
    }

    logStructured('payment/create-order', 'Failed to create payment order', { error: (err as any)?.message || String(err) });
    return respondError('ORDER_CREATION_FAILED', 'Failed to create payment order', { error: (err as any)?.message || String(err) }, 500);
  }
}
