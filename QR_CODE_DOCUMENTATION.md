# EasyEntry QR Code Implementation Documentation

## Overview

This document describes the QR code implementation for EasyEntry ticket bookings. After a user completes payment, a unique QR code is generated containing all ticket information and event details. The QR code serves as the digital ticket for event entry and verification.

---

## QR Code Data Structure

### Complete QR Code Data (Full Format)

```json
{
  "ticketId": "EASY-1717881234567-a1b2c3d4",
  "bookingId": "550e8400-e29b-41d4-a716-446655440000",
  "eventId": "e29b4150-1234-5678-abcd-446655440000",
  "eventName": "Summer Music Festival 2024",
  "eventDate": "2024-06-15",
  "eventVenue": "Central Park Amphitheater, New York",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "ticketCategory": "VIP",
  "quantity": 2,
  "amountPaid": 299.99,
  "paymentId": "pay_1234567890abcdef",
  "bookedAt": "2024-06-08T14:30:45.123Z",
  "checksum": "f7a3c8e2d9b1f4a6"
}
```

### Serialized QR Code Data (Compact Format)

The data is compressed into a compact JSON format to reduce QR code complexity:

```json
{
  "t": "EASY-1717881234567-a1b2c3d4",
  "b": "550e8400-e29b-41d4-a716-446655440000",
  "e": "e29b4150-1234-5678-abcd-446655440000",
  "en": "Summer Music Festival 2024",
  "ed": "2024-06-15",
  "ev": "Central Park Amphitheater, New York",
  "un": "John Doe",
  "ue": "john@example.com",
  "tc": "VIP",
  "q": 2,
  "ap": 299.99,
  "pi": "pay_1234567890abcdef",
  "ba": "2024-06-08T14:30:45.123Z",
  "cs": "f7a3c8e2d9b1f4a6"
}
```

---

## QR Code Field Descriptions

### Key Identifiers

| Field | Description | Example |
|-------|-------------|---------|
| `ticketId` | Unique ticket identifier | `EASY-1717881234567-a1b2c3d4` |
| `bookingId` | Booking record ID in database | `550e8400-e29b-41d4-a716-446655440000` |
| `checksum` | SHA256 checksum for integrity verification | `f7a3c8e2d9b1f4a6` |

### Event Information

| Field | Description | Example |
|-------|-------------|---------|
| `eventId` | Event identifier | `e29b4150-1234-5678-abcd-446655440000` |
| `eventName` | Name of the event | `Summer Music Festival 2024` |
| `eventDate` | Date of the event (YYYY-MM-DD) | `2024-06-15` |
| `eventVenue` | Location/venue of the event | `Central Park Amphitheater, New York` |

### Customer Information

| Field | Description | Example |
|-------|-------------|---------|
| `userName` | Customer's full name | `John Doe` |
| `userEmail` | Customer's email address | `john@example.com` |

### Ticket Information

| Field | Description | Example |
|-------|-------------|---------|
| `ticketCategory` | Type/tier of ticket | `VIP`, `General`, `Premium` |
| `quantity` | Number of tickets in this booking | `2` |

### Payment Information

| Field | Description | Example |
|-------|-------------|---------|
| `amountPaid` | Amount paid in currency | `299.99` |
| `paymentId` | Payment gateway transaction ID | `pay_1234567890abcdef` |
| `bookedAt` | Timestamp when booking was created (ISO 8601) | `2024-06-08T14:30:45.123Z` |

---

## QR Code Generation & Storage

### When QR Codes Are Generated

1. **After Online Payment Verification**: When a Razorpay payment is successfully verified
2. **For Pay-at-Venue Bookings**: When a pay-at-venue booking is created
3. **On-Demand**: Via the `/api/qr-codes` endpoint if not already generated

### Database Storage

Generated QR codes are stored in the `ticket_bookings` table with the following columns:

```sql
-- QR code data as JSON object
qr_code_data JSONB

-- Base64-encoded PNG image of the QR code
qr_code_image TEXT

-- Unique ticket identifier
ticket_id TEXT UNIQUE

-- SHA256 verification checksum
checksum TEXT
```

### Example API Response After Payment

```json
{
  "success": true,
  "data": {
    "bookingId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentId": "pay_1234567890abcdef",
    "ticketId": "EASY-1717881234567-a1b2c3d4",
    "qrCodeImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "message": "Payment verified and tickets booked successfully"
}
```

---

## QR Code Verification & Validation

### Checksum Verification

The QR code includes a SHA256 checksum calculated from:
```
SHA256(ticketId + bookingId + eventId + paymentId)[0:16]
```

This ensures:
- QR code has not been tampered with
- Contains authentic booking information
- Can be validated without database lookup (offline validation)

### Validation Process

1. **Decode QR code** to extract JSON data
2. **Deserialize** compact format back to full structure
3. **Recalculate** checksum: `SHA256(ticketId + bookingId + eventId + paymentId)`
4. **Compare** calculated checksum with stored checksum
5. **Result**: Valid ✓ or Invalid ✗

### API Validation Endpoint

```
POST /api/qr-codes

Request:
{
  "ticketId": "EASY-1717881234567-a1b2c3d4"
}

Response (Valid):
{
  "success": true,
  "data": {
    "valid": true,
    "ticketId": "EASY-1717881234567-a1b2c3d4",
    "eventName": "Summer Music Festival 2024",
    "customerName": "John Doe",
    "ticketCategory": "VIP",
    "quantity": 2
  }
}

Response (Invalid):
{
  "success": false,
  "error": "INVALID_CHECKSUM",
  "message": "QR code validation failed"
}
```

---

## API Endpoints

### 1. Generate/Retrieve QR Code

**GET** `/api/qr-codes`

Query Parameters:
- `booking_id` (string) - Booking ID from database
- `ticket_id` (string) - Unique ticket ID
- `format` (string, optional) - Response format: `image`, `data`, or `buffer` (default: `image`)

**Response Formats:**

**Format: image** (default)
```json
{
  "success": true,
  "data": {
    "qrCodeImage": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

**Format: data**
```json
{
  "success": true,
  "data": {
    "qrCodeData": {
      "t": "EASY-1717881234567-a1b2c3d4",
      "b": "550e8400-e29b-41d4-a716-446655440000",
      ...
    }
  }
}
```

**Format: buffer**
```
PNG binary image download
Content-Type: image/png
```

### 2. Verify QR Code

**POST** `/api/qr-codes`

Request Body:
```json
{
  "ticketId": "EASY-1717881234567-a1b2c3d4"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "ticketId": "EASY-1717881234567-a1b2c3d4",
    "eventName": "Summer Music Festival 2024",
    "customerName": "John Doe",
    "ticketCategory": "VIP",
    "quantity": 2
  }
}
```

---

## QR Code Display & Usage

### Frontend Integration

#### 1. Display QR Code After Payment

```typescript
// After payment verification
const { bookingId, ticketId, qrCodeImage } = paymentResponse;

// Display the QR code image
<img src={qrCodeImage} alt={`Ticket ${ticketId}`} />

// Also show ticket details
<div>
  <h2>Your Ticket</h2>
  <p>Ticket ID: {ticketId}</p>
  <p>Booking ID: {bookingId}</p>
</div>
```

#### 2. Retrieve QR Code Later

```typescript
// Fetch QR code by ticket ID
const response = await fetch(`/api/qr-codes?ticket_id=${ticketId}&format=image`);
const { data } = await response.json();
const qrImage = data.qrCodeImage;
```

#### 3. Download QR Code

```typescript
// Download as PNG file
const link = document.createElement('a');
link.href = qrImage;
link.download = `ticket-${ticketId}.png`;
link.click();
```

#### 4. Print Ticket with QR Code

```typescript
// Print-friendly layout
const printWindow = window.open();
printWindow.document.write(`
  <h1>${eventName}</h1>
  <p>Date: ${eventDate}</p>
  <p>Venue: ${eventVenue}</p>
  <img src="${qrCodeImage}" />
  <p>Ticket ID: ${ticketId}</p>
`);
printWindow.print();
```

---

## QR Code Size & Quality

### Specifications

- **Default Width**: 300px × 300px
- **Margin**: 2 modules
- **Error Correction Level**: H (High - recoverable up to 30% damage)
- **Format**: PNG image (data URL or binary)
- **Encoding**: Base64 (for data URLs)

### QR Code Data Capacity

- **Data in QR**: ~400-500 characters (compact JSON)
- **Error Correction**: 30% of code can be damaged/obscured
- **Readability**: Works with standard QR scanners and phones

### Quality Levels

For different use cases, you can specify custom options:

```typescript
generateQRCodeImage(serializedData, {
  width: 200,        // Smaller for digital display
  margin: 1,         // Compact margins
  errorCorrectionLevel: 'M'  // Medium error correction
});

generateQRCodeImage(serializedData, {
  width: 600,        // Larger for printing
  margin: 2,         // Standard margins
  errorCorrectionLevel: 'H'  // High error correction
});
```

---

## Database Schema

### ticket_bookings Table Extensions

```sql
-- Existing columns
id UUID PRIMARY KEY
user_id UUID
user_email TEXT
user_name TEXT
event_id UUID
event_title TEXT
event_date DATE
event_venue TEXT
ticket_categories JSONB
total_tickets INTEGER
amount_paid NUMERIC(10, 2)
payment_id TEXT
order_id TEXT
status TEXT
booked_at TIMESTAMPTZ

-- New QR code columns
qr_code_data JSONB          -- Complete QR data
qr_code_image TEXT          -- Base64 PNG image
ticket_id TEXT UNIQUE       -- Unique ticket identifier
checksum TEXT               -- Verification checksum
```

### Indexes

```sql
CREATE INDEX idx_ticket_bookings_ticket_id ON ticket_bookings(ticket_id);
CREATE INDEX idx_ticket_bookings_checksum ON ticket_bookings(checksum);
```

---

## Security Considerations

### Checksum Validation

- **Purpose**: Prevent tampering and ensure data integrity
- **Algorithm**: SHA256
- **Components**: Combination of ticketId, bookingId, eventId, paymentId
- **Stored**: First 16 characters for balance of security and compactness

### Data Privacy

- QR code contains user email and name (displayed on ticket)
- Recommended: Only share QR codes with authorized recipients
- Consider: Enabling PDF download with password protection for sensitive events

### Verification Flow

1. Scan QR code → Extract encoded data
2. Validate checksum locally (no database needed)
3. Optionally verify in database for additional checks
4. Mark ticket as used if needed (add `used_at` column)

### Prevention of Ticket Duplication

```sql
-- Add column to track ticket usage
ALTER TABLE ticket_bookings
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS used_by TEXT;

-- Index for finding used tickets
CREATE INDEX idx_ticket_bookings_used_at ON ticket_bookings(used_at);
```

---

## Implementation Checklist

- [x] QR code data structure defined
- [x] QR code generation utility (`lib/qr-code-service.ts`)
- [x] QR code generator with database storage (`lib/qr-code-generator.ts`)
- [x] API endpoint for QR code retrieval (`app/api/qr-codes/route.ts`)
- [x] Payment verification integration (automatic QR generation)
- [x] Database migration for QR columns (`lib/migrations/20260608_add_qr_code_support.sql`)
- [ ] Frontend display component
- [ ] Ticket download/print functionality
- [ ] QR code scanner component for entry verification
- [ ] Ticket usage tracking system
- [ ] Email notification with QR code attachment

---

## Troubleshooting

### QR Code Not Generating

1. Check if `qrcode` package is installed: `npm list qrcode`
2. Verify API authentication (401 errors)
3. Check database connection and migration applied
4. View server logs for detailed error messages

### QR Code Won't Scan

1. Ensure QR code image is not corrupted
2. Check image size (recommended: 300px+)
3. Verify error correction level (use 'H' for printing)
4. Clean lens on scanning device

### Validation Fails

1. Verify checksum calculation: `SHA256(ticketId + bookingId + eventId + paymentId)`
2. Ensure no data modifications after QR generation
3. Check database for `qr_code_data` JSON structure
4. Validate that all required fields are present

### Performance Issues

- QR generation is performed asynchronously after payment
- Store generated images as base64 to avoid re-computation
- Use indexes on `ticket_id` and `checksum` for fast lookups
- Consider caching QR images in CDN for high traffic

---

## Future Enhancements

1. **Dynamic QR Codes**: Update QR code if ticket is transferred
2. **Batch QR Generation**: Generate multiple QR codes in background job
3. **Mobile Wallet Integration**: Add QR code to Apple Wallet/Google Pay
4. **Analytics**: Track QR code scans and redemptions
5. **Multi-Ticket QR**: Single QR for multiple tickets in booking
6. **Ticket Transfer**: Generate new QR when ticket is transferred
7. **Offline Verification**: QR code contains all data for air-gapped validation

---

## References

- [QRCode NPM Package](https://www.npmjs.com/package/qrcode)
- [QR Code Standards (ISO/IEC 18004)](https://www.iso.org/standard/62645.html)
- [SHA256 Hashing](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest)

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-08  
**Status**: Implementation Complete
