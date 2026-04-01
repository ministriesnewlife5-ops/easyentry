import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import crypto from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase';

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
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      eventId,
      ticketCategories,
      amount,
      eventSnapshot,
    } = body;

    if (!session.user.id) {
      return NextResponse.json({ error: 'User ID missing in session' }, { status: 400 });
    }

    if (!eventId || !Array.isArray(ticketCategories) || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Invalid booking payload' }, { status: 400 });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Payment is verified - save ticket booking to Supabase
    const supabase = getSupabaseServerClient();
    const totalTickets = ticketCategories.reduce((sum: number, item: { quantity?: number }) => {
      return sum + (item.quantity || 0);
    }, 0);

    const fallbackTitle = typeof eventSnapshot?.title === 'string' ? eventSnapshot.title : 'Untitled Event';
    const fallbackDate = typeof eventSnapshot?.date === 'string' ? eventSnapshot.date : null;
    const fallbackVenue = typeof eventSnapshot?.venue === 'string' ? eventSnapshot.venue : null;
    const fallbackImage = typeof eventSnapshot?.image === 'string' ? eventSnapshot.image : null;

    const { data: eventData } = await supabase
      .from('published_events')
      .select('title, date, image_url')
      .eq('id', eventId)
      .single();

    const bookingPayload = {
      user_id: session.user.id,
      user_email: session.user.email || null,
      user_name: session.user.name || null,
      event_id: eventId,
      event_title: eventData?.title || fallbackTitle,
      event_date: eventData?.date || fallbackDate,
      event_venue: fallbackVenue,
      event_image: eventData?.image_url || fallbackImage,
      ticket_categories: ticketCategories,
      total_tickets: totalTickets,
      amount_paid: amount / 100, // Convert paise to rupees
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      status: 'confirmed',
      booked_at: new Date().toISOString(),
    };

    const { data: createdBooking, error: bookingError } = await supabase
      .from('ticket_bookings')
      .insert(bookingPayload)
      .select('id')
      .single();

    if (bookingError) {
      console.error('Failed to persist booking:', bookingError);
      return NextResponse.json({ error: 'Payment verified but failed to save booking' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and tickets booked successfully',
      bookingId: createdBooking.id,
      paymentId: razorpay_payment_id,
    });

  } catch (error) {
    console.error('Payment verification failed:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
