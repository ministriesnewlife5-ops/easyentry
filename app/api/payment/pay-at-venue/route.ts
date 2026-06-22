import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';
import { logStructured, respondError, respondSuccess } from '@/lib/api-utils';

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

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type TicketCategory = {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return respondError('UNAUTHORIZED', 'Unauthorized', null, 401);
    }

    const body = await request.json().catch(() => null);
    const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : '';
    const eventTitle = typeof body?.eventTitle === 'string' ? body.eventTitle.trim() : '';
    const eventDate = typeof body?.eventDate === 'string' ? body.eventDate.trim() : '';
    const eventVenue = typeof body?.eventVenue === 'string' ? body.eventVenue.trim() : '';
    const eventImage = typeof body?.eventImage === 'string' ? body.eventImage.trim() : '';
    const currency = typeof body?.currency === 'string' && body.currency.trim() ? body.currency.trim() : 'INR';
    const ticketCategories = Array.isArray(body?.ticketCategories) ? (body.ticketCategories as TicketCategory[]) : [];

    if (!eventId || ticketCategories.length === 0) {
      return respondError('MISSING_REQUIRED_FIELDS', 'Missing required fields', null, 400);
    }

    const supabase = getSupabaseServerClient();
    const { data: event, error: eventError } = await supabase
      .from('published_events')
      .select('id, title, date, time, social_links, image_url, convenience_fee, pay_at_venue_enabled')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) {
      logStructured('payment/pay-at-venue', 'Failed to load event', { error: eventError });
      return respondError('EVENT_LOOKUP_FAILED', 'Failed to load event', { error: eventError.message }, 500);
    }

    if (!event) {
      return respondError('EVENT_NOT_FOUND', 'Event not found', { eventId }, 404);
    }

    if (!Boolean((event as any).pay_at_venue_enabled)) {
      return respondError('PAY_AT_VENUE_DISABLED', 'Pay at Venue is not enabled for this event', { eventId }, 400);
    }

    const totalTickets = ticketCategories.reduce((sum, item) => sum + Math.max(0, toFiniteNumber(item.quantity)), 0);
    const convenienceFeePerTicket = Math.max(0, toFiniteNumber((event as any).convenience_fee));
    const convenienceFeeAmount = convenienceFeePerTicket * totalTickets;
    const fullTicketAmount = ticketCategories.reduce(
      (sum, item) => sum + Math.max(0, toFiniteNumber(item.price)) * Math.max(0, toFiniteNumber(item.quantity)),
      0
    );

    if (convenienceFeeAmount <= 0) {
      const now = new Date().toISOString();
      const paymentId = `PAYATVENUE-${crypto.randomUUID()}`;
      const orderId = `PAYATVENUE-${crypto.randomUUID()}`;

      const { data: booking, error: bookingError } = await supabase
        .from('ticket_bookings')
        .insert([
          {
            user_id: session.user.id,
            user_email: session.user.email || null,
            user_name: session.user.name || null,
            event_id: eventId,
            event_title: eventTitle || (event as any).title || '',
            event_date: eventDate || (event as any).date || null,
            event_venue: eventVenue || (event as any).social_links?.venue || '',
            event_image: eventImage || (event as any).image_url || null,
            ticket_categories: ticketCategories,
            total_tickets: totalTickets,
            amount_paid: 0,
            remaining_amount: fullTicketAmount,
            gst_amount: 0,
            artist_commission: 0,
            platform_revenue: 0,
            outlet_payout: 0,
            gateway_fee: 0,
            convenience_fee_amount: 0,
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

      if (bookingError || !booking) {
        return respondError('BOOKING_CREATE_FAILED', 'Failed to create booking', { error: bookingError?.message || 'Unknown error' }, 500);
      }

      return respondSuccess(
        {
          bookingId: booking.id,
          paymentId: booking.payment_id,
          direct: true,
          amountPaid: 0,
          remainingAmount: fullTicketAmount,
          paymentMode: 'pay_at_venue',
        },
        'BOOKING_CREATED',
        'Booking created successfully',
        200
      );
    }

    const { client: razorpay, keyId } = getRazorpayClient();
    let order: any;
    try {
      order = await razorpay.orders.create({
        amount: Math.round(convenienceFeeAmount * 100),
        currency,
        receipt: `pay-at-venue-${eventId}-${Date.now()}`,
        notes: {
          eventId,
          eventTitle: eventTitle || (event as any).title || '',
          paymentMode: 'pay_at_venue',
          convenienceFeePerTicket: String(convenienceFeePerTicket),
          convenienceFeeAmount: String(convenienceFeeAmount),
          remainingAmount: String(fullTicketAmount),
        },
      });
    } catch (rpErr) {
      const errMsg = rpErr && (rpErr.error || rpErr.message) ? (rpErr.error || rpErr.message) : JSON.stringify(rpErr);
      logStructured('payment/pay-at-venue', 'Razorpay order creation failed', { error: errMsg, details: rpErr });
      return respondError('RAZORPAY_ORDER_FAILED', 'Failed to create Razorpay order', { error: String(errMsg) }, 500);
    }

    return respondSuccess(
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        paymentMode: 'pay_at_venue',
        convenienceFeePerTicket,
        convenienceFeeAmount,
        remainingAmount: fullTicketAmount,
      },
      'ORDER_CREATED',
      'Pay at Venue order created',
      200
    );
  } catch (error) {
    // Normalize and log error details for easier debugging
    let errorDetails: Record<string, unknown> | string = String(error);
    try {
      if (error instanceof Error) {
        errorDetails = { message: error.message, stack: error.stack };
      } else if (typeof error === 'object' && error !== null) {
        errorDetails = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }
    } catch (e) {
      errorDetails = String(error);
    }

    logStructured('payment/pay-at-venue', 'Pay at Venue flow failed', { error: errorDetails });
    const errMsg = typeof errorDetails === 'string' ? errorDetails : (errorDetails as any).message || JSON.stringify(errorDetails);
    return respondError('PAY_AT_VENUE_FAILED', 'Failed to process Pay at Venue flow', { error: String(errMsg) }, 500);
  }
}
