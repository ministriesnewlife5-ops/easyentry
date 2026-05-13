import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import crypto from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getGlobalCouponByCode, incrementGlobalCouponUsage } from '@/lib/global-coupons-store';

function normalizeEnvValue(value?: string) {
  return value?.trim().replace(/^['\"]|['\"]$/g, '');
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
    }

    // Verify signature
    const razorpaySecret = normalizeEnvValue(process.env.RAZORPAY_KEY_SECRET) || '';
    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Load authoritative checkout intent by razorpay_order_id
    const { data: intent, error: intentError } = await supabase
      .from('checkout_intents')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    if (intentError) {
      console.error('Failed to load checkout intent:', intentError);
      return NextResponse.json({ error: 'Failed to load checkout intent' }, { status: 500 });
    }

    if (!intent) {
      return NextResponse.json({ error: 'Checkout intent not found' }, { status: 404 });
    }

    // Call Postgres RPC that finalizes intent atomically (inventory decrement, booking insert, coupon increment)
    try {
      const { data: finalizeResult, error: finalizeError } = await supabase.rpc('finalize_checkout_intent', {
        in_intent_id: intent.id,
        in_razorpay_order_id: razorpay_order_id,
        in_razorpay_payment_id: razorpay_payment_id,
      });

      if (finalizeError) {
        console.error('Failed to finalize checkout intent:', finalizeError);
        return NextResponse.json({ error: 'Failed to finalize booking' }, { status: 500 });
      }

      const bookingId = Array.isArray(finalizeResult) && finalizeResult.length > 0 ? finalizeResult[0].booking_id : null;

      return NextResponse.json({ success: true, message: 'Payment verified and tickets booked successfully', bookingId, paymentId: razorpay_payment_id });
    } catch (err) {
      console.error('Error during finalize RPC:', err);
      return NextResponse.json({ error: 'Failed to finalize booking' }, { status: 500 });
    }

  } catch (error) {
    console.error('Payment verification failed:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
