import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';
import { logStructured, respondError, respondSuccess } from '@/lib/api-utils';

function normalizeEnvValue(value?: string) {
  return value?.trim().replace(/^['\"]|['\"]$/g, '');
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

type IntentTicketCategory = {
  quantity?: number;
  price?: number;
  artistShare?: number;
  influencerShare?: number;
  platformFee?: number;
  paymentGatewayFee?: number;
  gstPercent?: number;
};

function computeMoneySplit(
  ticketCategories: IntentTicketCategory[],
  couponSourceType?: string | null,
  convenienceFeePerTicket = 0
) {
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
    const linePaymentGatewayFee = lineSubtotal * (clampPercent(toFiniteNumber(item.paymentGatewayFee)) / 100);
    const linePlatformFee = lineSubtotal * (clampPercent(toFiniteNumber(item.platformFee)) / 100);
    const lineGst = lineBase * (clampPercent(toFiniteNumber(item.gstPercent)) / 100);

    basePrice += lineBase;
    discountAmount += lineDiscount;
    subtotal += lineSubtotal;
    paymentGatewayFeeAmount += linePaymentGatewayFee;
    platformFeeAmount += linePlatformFee;
    gstAmount += lineGst;
  }

  const totalTickets = ticketCategories.reduce((sum, item) => sum + Math.max(0, toFiniteNumber(item.quantity)), 0);
  const convenienceFeeAmount = Math.max(0, convenienceFeePerTicket) * totalTickets;
  const finalAmount = subtotal + platformFeeAmount + paymentGatewayFeeAmount + gstAmount + convenienceFeeAmount;
  const discountPercent = basePrice > 0 ? (discountAmount / basePrice) * 100 : 0;

  return {
    basePrice,
    discountAmount,
    discountPercent,
    subtotal,
    paymentGatewayFeeAmount,
    platformFeeAmount,
    gstAmount,
    convenienceFeeAmount,
    finalAmount,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logStructured('payment/verify', 'Unauthorized request to verify payment');
      return respondError('UNAUTHORIZED', 'Unauthorized', null, 401);
    }

    const body = await request.json().catch(() => null);
    const razorpay_order_id = typeof body?.razorpay_order_id === 'string' ? body.razorpay_order_id.trim() : '';
    const razorpay_payment_id = typeof body?.razorpay_payment_id === 'string' ? body.razorpay_payment_id.trim() : '';
    const razorpay_signature = typeof body?.razorpay_signature === 'string' ? body.razorpay_signature.trim() : '';

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      logStructured('payment/verify', 'Missing payment fields', {
        razorpay_order_id: Boolean(razorpay_order_id),
        razorpay_payment_id: Boolean(razorpay_payment_id),
        razorpay_signature: Boolean(razorpay_signature),
      });
      return respondError('MISSING_PAYMENT_FIELDS', 'Missing payment fields', null, 400);
    }

    const razorpaySecret = normalizeEnvValue(process.env.RAZORPAY_KEY_SECRET) || '';
    if (!razorpaySecret) {
      logStructured('payment/verify', 'Missing Razorpay secret in environment');
      return respondError('CONFIG_ERROR', 'Payment configuration is incomplete', null, 500);
    }

    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      logStructured('payment/verify', 'Invalid payment signature', { razorpay_order_id, paymentId: razorpay_payment_id });
      return respondError('INVALID_SIGNATURE', 'Invalid payment signature', null, 400);
    }

    const supabase = getSupabaseServerClient();

    const { data: intent, error: intentError } = await supabase
      .from('checkout_intents')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    if (intentError) {
      logStructured('payment/verify', 'Failed to load checkout intent', { error: intentError });
      return respondError('INTENT_LOAD_FAILED', 'Failed to load checkout intent', { error: (intentError as any)?.message || String(intentError) }, 500);
    }

    if (!intent) {
      logStructured('payment/verify', 'Checkout intent not found', { razorpay_order_id });
      return respondError('INTENT_NOT_FOUND', 'Checkout intent not found', { razorpay_order_id }, 404);
    }

    if ((intent as any).status && (intent as any).status !== 'pending') {
      logStructured('payment/verify', 'Checkout intent not pending', { intentId: intent.id, status: (intent as any).status });
      return respondError('INTENT_NOT_PENDING', 'Checkout intent already processed or not pending', { status: (intent as any).status }, 409);
    }

    // Recompute authoritative money split before finalization to ensure consistency.
    const intentTickets = Array.isArray((intent as any).ticket_categories)
      ? ((intent as any).ticket_categories as IntentTicketCategory[])
      : [];

    const convenienceFeePerTicket = Math.max(0, toFiniteNumber((intent as any).convenience_fee));
    const split = computeMoneySplit(intentTickets, (intent as any).coupon_source_type || null, convenienceFeePerTicket);
    const currentFinal = toFiniteNumber((intent as any).final_amount);
    const tolerance = 0.01;

    if (Math.abs(currentFinal - split.finalAmount) > tolerance) {
      const { error: patchIntentError } = await supabase
        .from('checkout_intents')
        .update({
          discount_amount: split.discountAmount,
          discount_percent: split.discountPercent || null,
          subtotal: split.basePrice,
          convenience_fee: convenienceFeePerTicket,
          final_amount: split.finalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (intent as any).id);

      if (patchIntentError) {
        logStructured('payment/verify', 'Failed to sync checkout intent split', { patchIntentError, intentId: (intent as any).id });
        return respondError('INTENT_SPLIT_SYNC_FAILED', 'Failed to synchronize checkout intent split', { error: (patchIntentError as any)?.message || String(patchIntentError) }, 500);
      }

      logStructured('payment/verify', 'Checkout intent money split synchronized', {
        intentId: (intent as any).id,
        oldFinal: currentFinal,
        newFinal: split.finalAmount,
        discountAmount: split.discountAmount,
        discountPercent: split.discountPercent,
        convenienceFeePerTicket,
        convenienceFeeAmount: split.convenienceFeeAmount,
      });
    }

    const { data: finalizeResult, error: finalizeError } = await supabase.rpc('finalize_checkout_intent', {
      in_intent_id: intent.id,
      in_razorpay_order_id: razorpay_order_id,
      in_razorpay_payment_id: razorpay_payment_id,
    });

    // Booking finalization is handled inside finalize_checkout_intent().
    // The ticket_bookings insert there uses the same commission mapping as the test script:
    // - source_type 'artist'   -> artist_share%
    // - source_type 'promoter' -> influencer_share%
    // - coupon_source_commission = discount amount
    // - coupon_discount_percent = actual percent used

    if (finalizeError) {
      logStructured('payment/verify', 'Failed to finalize checkout intent', { finalizeError });
      return respondError('FINALIZE_FAILED', 'Failed to finalize booking', { finalizeError: (finalizeError as any)?.message || String(finalizeError) }, 500);
    }

    const bookingId = Array.isArray(finalizeResult)
      ? finalizeResult[0]?.booking_id ?? null
      : (finalizeResult as { booking_id?: string } | null)?.booking_id ?? null;

    if (!bookingId) {
      logStructured('payment/verify', 'Finalize RPC returned no booking id', { intentId: intent.id, razorpay_order_id });
      return respondError('FINALIZE_NO_BOOKING', 'Payment was verified but booking finalization did not return an id', { intentId: intent.id }, 500);
    }

    logStructured('payment/verify', 'Payment verified and booking finalized', {
      bookingId,
      intentId: intent.id,
      paymentId: razorpay_payment_id,
    });

    return respondSuccess({ bookingId, paymentId: razorpay_payment_id }, 'BOOKING_CREATED', 'Payment verified and tickets booked successfully', 200);
  } catch (error) {
    logStructured('payment/verify', 'Payment verification failed', { error: String(error) });
    return respondError('VERIFICATION_FAILED', 'Failed to verify payment', { error: String(error) }, 500);
  }
}
