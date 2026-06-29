import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * QR Code Data Structure for EasyEntry Tickets
 * This contains all information needed for ticket validation and entry
 */
export interface QRCodeData {
  ticketId: string; // Unique ticket identifier
  bookingId: string; // Booking ID from ticket_bookings table
  eventId: string; // Event ID
  eventName: string; // Event name for display
  eventDate: string; // Event date (YYYY-MM-DD)
  eventVenue: string; // Venue location
  userName: string; // Customer name
  userEmail: string; // Customer email
  ticketCategory: string; // Type/category of ticket
  quantity: number; // Number of tickets
  amountPaid: number; // Amount paid in currency
  paymentId: string; // Payment ID from payment gateway
  bookedAt: string; // Booking timestamp (ISO 8601)
  checksum: string; // SHA256 checksum for verification
}

/**
 * Generates a QR code data object with all ticket information
 * @param bookingData - The booking information from the database
 * @returns QRCodeData object ready for encoding
 */
export function generateQRCodeData(bookingData: {
  id: string; // booking ID
  event_id: string;
  event_title: string;
  event_date: string;
  event_venue: string;
  user_name: string;
  user_email: string;
  ticket_categories: Array<{ name: string; quantity: number }>;
  amount_paid: number;
  payment_id: string;
  booked_at: string;
}): QRCodeData {
  // Generate unique ticket ID if not exists
  const ticketId = `EASY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // Get primary ticket category
  const primaryCategory = bookingData.ticket_categories?.[0];
  const totalQuantity = bookingData.ticket_categories?.reduce(
    (sum, cat) => sum + (cat.quantity || 0),
    0
  ) || 0;

  const qrData: QRCodeData = {
    ticketId,
    bookingId: bookingData.id,
    eventId: bookingData.event_id,
    eventName: bookingData.event_title,
    eventDate: bookingData.event_date,
    eventVenue: bookingData.event_venue,
    userName: bookingData.user_name,
    userEmail: bookingData.user_email,
    ticketCategory: primaryCategory?.name || 'General',
    quantity: totalQuantity,
    amountPaid: bookingData.amount_paid,
    paymentId: bookingData.payment_id,
    bookedAt: bookingData.booked_at,
    checksum: '', // Will be calculated below
  };

  // Generate checksum for verification
  const checksumString = `${qrData.ticketId}${qrData.bookingId}${qrData.eventId}${qrData.paymentId}`;
  qrData.checksum = crypto
    .createHash('sha256')
    .update(checksumString)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for compactness

  return qrData;
}

/**
 * Converts QR data to a compact JSON string for encoding in QR code
 * Uses compression-friendly format
 */
export function serializeQRData(qrData: QRCodeData): string {
  return JSON.stringify({
    t: qrData.ticketId, // ticket
    b: qrData.bookingId, // booking
    e: qrData.eventId, // event
    en: qrData.eventName, // event name
    ed: qrData.eventDate, // event date
    ev: qrData.eventVenue, // event venue
    un: qrData.userName, // user name
    ue: qrData.userEmail, // user email
    tc: qrData.ticketCategory, // ticket category
    q: qrData.quantity, // quantity
    ap: qrData.amountPaid, // amount paid
    pi: qrData.paymentId, // payment id
    ba: qrData.bookedAt, // booked at
    cs: qrData.checksum, // checksum
  });
}

/**
 * Deserializes compact QR JSON back to full data structure
 */
export function deserializeQRData(serialized: string): QRCodeData {
  const data = JSON.parse(serialized);
  return {
    ticketId: data.t,
    bookingId: data.b,
    eventId: data.e,
    eventName: data.en,
    eventDate: data.ed,
    eventVenue: data.ev,
    userName: data.un,
    userEmail: data.ue,
    ticketCategory: data.tc,
    quantity: data.q,
    amountPaid: data.ap,
    paymentId: data.pi,
    bookedAt: data.ba,
    checksum: data.cs,
  };
}

/**
 * Generates a QR code image as a data URL
 * @param qrData - The serialized QR data string
 * @param options - QR code options (size, error correction, etc.)
 */
export async function generateQRCodeImage(
  qrData: string,
  options?: {
    width?: number;
    margin?: number;
    color?: { dark: string; light: string };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }
): Promise<string> {
  const defaultOptions = {
    width: options?.width || 300,
    margin: options?.margin || 2,
    color: options?.color || { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: (options?.errorCorrectionLevel || 'H') as 'L' | 'M' | 'Q' | 'H',
  };

  try {
    const dataUrl = await QRCode.toDataURL(qrData, defaultOptions);
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generates QR code as a data buffer (for storing/downloading)
 */
export async function generateQRCodeBuffer(
  qrData: string,
  options?: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }
): Promise<Buffer> {
  const defaultOptions = {
    width: options?.width || 300,
    margin: options?.margin || 2,
    errorCorrectionLevel: (options?.errorCorrectionLevel || 'H') as 'L' | 'M' | 'Q' | 'H',
  };

  try {
    const buffer = await QRCode.toBuffer(qrData, defaultOptions);
    return buffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}

/**
 * Validates QR code data integrity using checksum
 */
export function validateQRCodeChecksum(qrData: QRCodeData): boolean {
  const checksumString = `${qrData.ticketId}${qrData.bookingId}${qrData.eventId}${qrData.paymentId}`;
  const expectedChecksum = crypto
    .createHash('sha256')
    .update(checksumString)
    .digest('hex')
    .substring(0, 16);

  return qrData.checksum === expectedChecksum;
}

/**
 * Format QR data for display (human-readable format)
 */
export function formatQRDataForDisplay(qrData: QRCodeData): string {
  return `
═══════════════════════════════════════════
              EASYENTRY TICKET
═══════════════════════════════════════════
Event: ${qrData.eventName}
Date: ${qrData.eventDate}
Venue: ${qrData.eventVenue}

Customer: ${qrData.userName}
Email: ${qrData.userEmail}

Ticket ID: ${qrData.ticketId}
Booking ID: ${qrData.bookingId}
Category: ${qrData.ticketCategory}
Quantity: ${qrData.quantity}

Amount Paid: ${qrData.amountPaid}
Payment ID: ${qrData.paymentId}
Booked: ${new Date(qrData.bookedAt).toLocaleString()}

Checksum: ${qrData.checksum}
═══════════════════════════════════════════
  `;
}
