import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';
import { logStructured, respondError, respondSuccess } from '@/lib/api-utils';

function normalizeEnvValue(value?: string) {
  return value?.trim().replace(/^['\"]|['\"]$/g, '');
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
