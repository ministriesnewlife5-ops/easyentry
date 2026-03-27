import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import crypto from 'crypto';

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
      amount
    } = body;

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

    // Payment is verified - save ticket booking
    // Here you would save to your database
    const booking = {
      id: `booking_${Date.now()}`,
      userId: session.user.email || '',
      userEmail: session.user.email,
      userName: session.user.name,
      eventId,
      ticketCategories,
      amount: amount / 100, // Convert paise to rupees
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: 'confirmed',
      bookedAt: new Date().toISOString(),
    };

    // TODO: Save booking to your database
    // await saveBookingToDB(booking);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and tickets booked successfully',
      bookingId: booking.id,
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
