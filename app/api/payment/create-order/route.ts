import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

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
      amount, 
      eventId, 
      eventTitle, 
      ticketCategories,
      currency = 'INR' 
    } = body;

    if (!amount || !eventId || !ticketCategories || ticketCategories.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const { client: razorpay, keyId } = getRazorpayClient();

    // Create Razorpay order
    const orderOptions: {
      amount: number;
      currency: string;
      receipt: string;
      notes: Record<string, string>;
    } = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        eventId: String(eventId),
        eventTitle: String(eventTitle || ''),
        userId: String(session.user.email || ''),
        userEmail: String(session.user.email || ''),
        userName: String(session.user.name || ''),
        ticketCategories: JSON.stringify(ticketCategories),
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });

  } catch (error) {
    console.error('Razorpay order creation failed:', {
      message: error?.message,
      statusCode: error?.statusCode,
      error: error?.error,
    });

    if (error?.message === 'Missing Razorpay credentials in environment') {
      return NextResponse.json(
        { error: 'Payment gateway is not configured on server' },
        { status: 500 }
      );
    }

    if (error?.statusCode === 401) {
      return NextResponse.json(
        { error: 'Payment gateway authentication failed. Please contact support.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
