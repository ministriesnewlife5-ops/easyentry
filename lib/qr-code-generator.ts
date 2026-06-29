import { getSupabaseServerClient } from '@/lib/supabase';
import {
  generateQRCodeData,
  serializeQRData,
  generateQRCodeImage,
} from '@/lib/qr-code-service';
import { logStructured } from '@/lib/api-utils';

/**
 * Generate and store QR code for a booking after successful payment
 * This is called automatically after payment verification
 */
export async function generateAndStoreQRCode(bookingId: string): Promise<{
  ticketId?: string;
  qrCodeImage?: string;
  error?: string;
}> {
  try {
    const supabase = getSupabaseServerClient();

    // Fetch the booking details
    const { data: booking, error: bookingError } = await supabase
      .from('ticket_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      logStructured('qr-code-service', 'Booking not found for QR generation', {
        bookingId,
        error: bookingError?.message,
      });
      return { error: 'Booking not found' };
    }

    // Generate QR code data
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

    // Serialize and generate QR code image
    const serialized = serializeQRData(qrData);
    const qrImage = await generateQRCodeImage(serialized, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    // Store QR code in database
    const { error: updateError } = await supabase
      .from('ticket_bookings')
      .update({
        qr_code_data: qrData,
        qr_code_image: qrImage,
        ticket_id: qrData.ticketId,
        checksum: qrData.checksum,
      })
      .eq('id', bookingId);

    if (updateError) {
      logStructured('qr-code-service', 'Failed to store QR code in database', {
        bookingId,
        error: updateError.message,
      });
      return {
        ticketId: qrData.ticketId,
        qrCodeImage: qrImage,
        error: 'QR code generated but not stored in database',
      };
    }

    logStructured('qr-code-service', 'QR code generated and stored successfully', {
      bookingId,
      ticketId: qrData.ticketId,
    });

    return {
      ticketId: qrData.ticketId,
      qrCodeImage: qrImage,
    };
  } catch (error) {
    logStructured('qr-code-service', 'Error generating QR code', {
      bookingId,
      error: String(error),
    });
    return { error: 'Failed to generate QR code' };
  }
}

/**
 * Generate QR codes for multiple bookings (batch operation)
 */
export async function generateQRCodesForBookings(bookingIds: string[]): Promise<{
  successful: string[];
  failed: Array<{ bookingId: string; error: string }>;
}> {
  const successful: string[] = [];
  const failed: Array<{ bookingId: string; error: string }> = [];

  for (const bookingId of bookingIds) {
    const result = await generateAndStoreQRCode(bookingId);
    if (result.error) {
      failed.push({ bookingId, error: result.error });
    } else {
      successful.push(bookingId);
    }
  }

  return { successful, failed };
}
