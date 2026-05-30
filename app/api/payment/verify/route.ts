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

type BookingTicketCategory = {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
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

async function insertPayAtVenueBooking(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  input: {
    userId: string;
    userEmail?: string | null;
    userName?: string | null;
    eventId: string;
    eventTitle: string;
    eventDate?: string;
    eventVenue?: string;
    eventImage?: string;
    ticketCategories: BookingTicketCategory[];
    paymentId?: string;
    orderId?: string;
    amountPaid: number;
    remainingAmount: number;
  }
) {
  const totalTickets = input.ticketCategories.reduce((sum, item) => sum + Math.max(0, toFiniteNumber(item.quantity)), 0);
  const now = new Date().toISOString();
  const paymentId = input.paymentId || `PAYATVENUE-${crypto.randomUUID()}`;
  const orderId = input.orderId || `PAYATVENUE-${crypto.randomUUID()}`;

  const { data: booking, error: bookingError } = await supabase
    .from('ticket_bookings')
    .insert([
      {
        user_id: input.userId,
        user_email: input.userEmail || null,
        user_name: input.userName || null,
        event_id: input.eventId,
        event_title: input.eventTitle,
        event_date: input.eventDate || null,
        event_venue: input.eventVenue || '',
        event_image: input.eventImage || null,
        ticket_categories: input.ticketCategories,
        total_tickets: totalTickets,
        amount_paid: Math.max(0, input.amountPaid),
        remaining_amount: Math.max(0, input.remainingAmount),
        payment_mode: 'pay_at_venue',
        status: 'confirmed',
        payment_id: paymentId,
        order_id: orderId,
        booked_at: now,
        created_at: now,
      },
    ])
    .select('id, payment_id')
    .single();

  return { booking, bookingError, paymentId, orderId };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logStructured('payment/verify', 'Unauthorized request to verify payment');
      return respondError('UNAUTHORIZED', 'Unauthorized', null, 401);
    }

    const body = await request.json().catch(() => null);
    const paymentMode = typeof body?.payment_mode === 'string' ? body.payment_mode : 'online';
    const ticketCategories = Array.isArray(body?.ticketCategories) ? (body.ticketCategories as BookingTicketCategory[]) : [];
    const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : '';
    const eventTitle = typeof body?.eventTitle === 'string' ? body.eventTitle.trim() : '';
    const eventDate = typeof body?.eventDate === 'string' ? body.eventDate.trim() : '';
    const eventVenue = typeof body?.eventVenue === 'string' ? body.eventVenue.trim() : '';
    const eventImage = typeof body?.eventImage === 'string' ? body.eventImage.trim() : '';

    if (paymentMode === 'pay_at_venue') {
      if (!eventId || ticketCategories.length === 0) {
        return respondError('MISSING_REQUIRED_FIELDS', 'Missing required fields', null, 400);
      }

      const supabase = getSupabaseServerClient();
      const { data: event, error: eventError } = await supabase
        .from('published_events')
        .select('id, title, date, location, image_url, convenience_fee, pay_at_venue_enabled')
        .eq('id', eventId)
        .maybeSingle();

      if (eventError) {
        return respondError('EVENT_LOOKUP_FAILED', 'Failed to load event', { error: eventError.message }, 500);
      }

      if (!event) {
        return respondError('EVENT_NOT_FOUND', 'Event not found', { eventId }, 404);
      }

      const totalTickets = ticketCategories.reduce((sum, item) => sum + Math.max(0, toFiniteNumber(item.quantity)), 0);
      const convenienceFeePerTicket = Math.max(0, toFiniteNumber((event as any).convenience_fee));
      const amountPaid = convenienceFeePerTicket * totalTickets;
      const remainingAmount = ticketCategories.reduce(
        (sum, item) => sum + Math.max(0, toFiniteNumber(item.price)) * Math.max(0, toFiniteNumber(item.quantity)),
        0
      );

      if (!body?.razorpay_order_id && !body?.razorpay_payment_id && !body?.razorpay_signature) {
        const { booking, bookingError, paymentId } = await insertPayAtVenueBooking(supabase, {
          userId: session.user.id,
          userEmail: session.user.email || null,
          userName: session.user.name || null,
          eventId,
          eventTitle: eventTitle || (event as any).title || '',
          eventDate: eventDate || (event as any).date || undefined,
          eventVenue: eventVenue || (event as any).location || '',
          eventImage: eventImage || (event as any).image_url || '',
          ticketCategories,
          amountPaid,
          remainingAmount,
        });

        if (bookingError || !booking) {
          return respondError('BOOKING_CREATE_FAILED', 'Failed to create booking', { error: bookingError?.message || 'Unknown error' }, 500);
        }

        return respondSuccess(
          {
            bookingId: booking.id,
            paymentId,
            paymentMode: 'pay_at_venue',
            amountPaid,
            remainingAmount,
            direct: true,
          },
          'BOOKING_CREATED',
          'Booking created successfully',
          200
        );
      }
    }

    const razorpay_order_id = typeof body?.razorpay_order_id === 'string' ? body.razorpay_order_id.trim() : '';
    const razorpay_payment_id = typeof body?.razorpay_payment_id === 'string' ? body.razorpay_payment_id.trim() : '';
    const razorpay_signature = typeof body?.razorpay_signature === 'string' ? body.razorpay_signature.trim() : '';
    // Online payments continue below.

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

    if (paymentMode === 'pay_at_venue') {
      const supabase = getSupabaseServerClient();
      const totalTickets = ticketCategories.reduce((sum, item) => sum + Math.max(0, toFiniteNumber(item.quantity)), 0);
      const eventSnapshot = body?.eventSnapshot && typeof body.eventSnapshot === 'object' ? body.eventSnapshot as Record<string, unknown> : {};
      const fullAmount = ticketCategories.reduce(
        (sum, item) => sum + Math.max(0, toFiniteNumber(item.price)) * Math.max(0, toFiniteNumber(item.quantity)),
        0
      );
      const convenienceFeePerTicket = Math.max(0, toFiniteNumber(body?.convenienceFeePerTicket));
      const amountPaid = Math.max(0, toFiniteNumber(body?.amountPaid, convenienceFeePerTicket * totalTickets));
      const remainingAmount = Math.max(0, toFiniteNumber(body?.remainingAmount, fullAmount));

      const { booking, bookingError } = await insertPayAtVenueBooking(supabase, {
        userId: session.user.id,
        userEmail: session.user.email || null,
        userName: session.user.name || null,
        eventId: eventId || String(eventSnapshot.eventId || ''),
        eventTitle: eventTitle || String(eventSnapshot.title || ''),
        eventDate: eventDate || String(eventSnapshot.date || ''),
        eventVenue: eventVenue || String(eventSnapshot.location || ''),
        eventImage: eventImage || String(eventSnapshot.image || ''),
        ticketCategories,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amountPaid,
        remainingAmount,
      });

      if (bookingError || !booking) {
        return respondError('BOOKING_CREATE_FAILED', 'Failed to create booking', { error: bookingError?.message || 'Unknown error' }, 500);
      }

      return respondSuccess(
        { bookingId: booking.id, paymentId: razorpay_payment_id, paymentMode: 'pay_at_venue', amountPaid, remainingAmount },
        'BOOKING_CREATED',
        'Booking confirmed',
        200
      );
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
