import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';
import {
  generateQRCodeData,
  serializeQRData,
  generateQRCodeImage,
  generateQRCodeBuffer,
  validateQRCodeChecksum,
  deserializeQRData,
} from '@/lib/qr-code-service';
import { logStructured, respondError, respondSuccess } from '@/lib/api-utils';

/**
 * GET - Retrieve QR code for a booking
 * Query params: booking_id or ticket_id
 */
async function handleGet(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const bookingId = searchParams.get('booking_id');
  const ticketId = searchParams.get('ticket_id');
  const format = searchParams.get('format') || 'image'; // 'image', 'data', or 'buffer'

  if (!bookingId && !ticketId) {
    return respondError('MISSING_PARAMS', 'Either booking_id or ticket_id is required', {}, 400);
  }

  try {
    const supabase = getSupabaseServerClient();

    // Fetch booking from database
    let booking;
    if (bookingId) {
      const { data, error } = await supabase
        .from('ticket_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error || !data) {
        return respondError('BOOKING_NOT_FOUND', 'Booking not found', { error }, 404);
      }
      booking = data;
    } else {
      const { data, error } = await supabase
        .from('ticket_bookings')
        .select('*')
        .eq('ticket_id', ticketId)
        .single();

      if (error || !data) {
        return respondError('TICKET_NOT_FOUND', 'Ticket not found', { error }, 404);
      }
      booking = data;
    }

    // Check if QR code already exists
    if (booking.qr_code_image && booking.qr_code_data) {
      if (format === 'image') {
        return respondSuccess({ qrCodeImage: booking.qr_code_image }, 200);
      } else if (format === 'data') {
        return respondSuccess({ qrCodeData: booking.qr_code_data }, 200);
      } else if (format === 'buffer') {
        // Return as PNG image
        const buffer = Buffer.from(booking.qr_code_image, 'base64');
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="ticket-${booking.ticket_id}.png"`,
          },
        });
      }
    }

    // Generate QR code if it doesn't exist
    const qrData = generateQRCodeData({
      id: booking.id,
      event_id: booking.event_id,
      event_title: booking.event_title,
      event_date: booking.event_date,
      event_venue: booking.event_venue,
      user_name: booking.user_name,
      user_email: booking.user_email,
      ticket_categories: booking.ticket_categories || [],
      amount_paid: booking.amount_paid,
      payment_id: booking.payment_id,
      booked_at: booking.booked_at,
    });

    const serialized = serializeQRData(qrData);
    const qrImage = await generateQRCodeImage(serialized);

    // Save QR code to database
    const { error: updateError } = await supabase
      .from('ticket_bookings')
      .update({
        qr_code_data: qrData,
        qr_code_image: qrImage,
        ticket_id: qrData.ticketId,
        checksum: qrData.checksum,
      })
      .eq('id', booking.id);

    if (updateError) {
      logStructured('api/qr-codes', 'Warning: Failed to save QR code to database', { error: updateError });
    }

    if (format === 'image') {
      return respondSuccess({ qrCodeImage: qrImage }, 200);
    } else if (format === 'data') {
      return respondSuccess({ qrCodeData: qrData }, 200);
    } else if (format === 'buffer') {
      const buffer = Buffer.from(qrImage.split(',')[1] || qrImage, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="ticket-${qrData.ticketId}.png"`,
        },
      });
    }
  } catch (error) {
    logStructured('api/qr-codes', 'Error generating QR code', { error });
    return respondError('QR_GENERATION_FAILED', 'Failed to generate QR code', { error }, 500);
  }
}

/**
 * POST - Verify QR code validity
 * Body: { qrData: string or object }
 */
async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const { qrDataString, ticketId } = body;

    if (!qrDataString && !ticketId) {
      return respondError('MISSING_PARAMS', 'Either qrDataString or ticketId is required', {}, 400);
    }

    const supabase = getSupabaseServerClient();

    let qrData;
    if (ticketId) {
      // Look up in database
      const { data: booking, error } = await supabase
        .from('ticket_bookings')
        .select('qr_code_data')
        .eq('ticket_id', ticketId)
        .single();

      if (error || !booking) {
        return respondError('TICKET_NOT_FOUND', 'Ticket not found', {}, 404);
      }

      qrData = booking.qr_code_data;
    } else {
      qrData = typeof qrDataString === 'string' 
        ? deserializeQRData(qrDataString) 
        : qrDataString;
    }

    // Validate checksum
    const isValid = validateQRCodeChecksum(qrData);

    if (isValid) {
      return respondSuccess(
        {
          valid: true,
          ticketId: qrData.ticketId,
          eventName: qrData.eventName,
          customerName: qrData.userName,
          ticketCategory: qrData.ticketCategory,
          quantity: qrData.quantity,
        },
        200
      );
    } else {
      return respondError('INVALID_CHECKSUM', 'QR code validation failed', { qrData }, 400);
    }
  } catch (error) {
    logStructured('api/qr-codes', 'Error verifying QR code', { error });
    return respondError('VERIFICATION_FAILED', 'Failed to verify QR code', { error }, 500);
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return respondError('UNAUTHORIZED', 'Unauthorized access', {}, 401);
  }

  return handleGet(req);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return respondError('UNAUTHORIZED', 'Unauthorized access', {}, 401);
  }

  return handlePost(req);
}
