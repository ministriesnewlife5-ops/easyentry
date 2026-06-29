# QR Code System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EASYENTRY QR SYSTEM                             │
└─────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────────┐
                         │   User Completes     │
                         │      Payment         │
                         └──────────┬───────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │  Razorpay Verification      │
                    │  (Check signature)          │
                    └────────────┬────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────┐
                    │  Create Booking Record      │
                    │  (DB INSERT)                │
                    └────────────┬────────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │  Generate QR Code (ASYNC)    │
                  │  ├─ Create data object       │
                  │  ├─ Generate checksum        │
                  │  ├─ Generate PNG image       │
                  │  └─ Store in DB              │
                  └────────────┬─────────────────┘
                               │
                               ▼
                  ┌──────────────────────────────┐
                  │  Send Response to Frontend   │
                  │  {                           │
                  │    ticketId,                 │
                  │    bookingId,                │
                  │    qrCodeImage,              │
                  │    ...                       │
                  │  }                           │
                  └────────────┬─────────────────┘
                               │
                               ▼
                  ┌──────────────────────────────┐
                  │  Display Ticket with QR      │
                  │  ├─ Show event details       │
                  │  ├─ Show customer info       │
                  │  ├─ Show QR code image       │
                  │  └─ Download/Print/Share     │
                  └──────────────────────────────┘
```

---

## QR Code Data Structure

```
┌────────────────────────────────────────────────────┐
│           QR CODE ENCODED DATA                      │
├────────────────────────────────────────────────────┤
│                                                    │
│  {                                                 │
│    "t": "EASY-timestamp-hash",    ← Ticket ID     │
│    "b": "booking-uuid",           ← Booking ID    │
│    "e": "event-uuid",             ← Event ID      │
│    "en": "Event Name",            ← Event Name    │
│    "ed": "2024-06-15",            ← Event Date    │
│    "ev": "Venue Location",        ← Event Venue   │
│    "un": "Customer Name",         ← Customer     │
│    "ue": "email@example.com",     ← Email        │
│    "tc": "VIP",                   ← Ticket Type   │
│    "q": 2,                        ← Quantity      │
│    "ap": 299.99,                  ← Amount Paid   │
│    "pi": "pay_xxxxx",             ← Payment ID    │
│    "ba": "2024-06-08T...",        ← Booking Time  │
│    "cs": "f7a3c8e2d9b1f4a6"       ← Checksum      │
│  }                                                 │
│                                                    │
└────────────────────────────────────────────────────┘
         │
         ▼ (PNG Image)
   [QR CODE IMAGE]
   300x300 pixels
   High Error Correction
```

---

## Database Schema

```
┌──────────────────────────────────────────────────────┐
│         ticket_bookings TABLE                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Existing Columns:                                   │
│  ├─ id (UUID)                                        │
│  ├─ user_id, user_email, user_name                   │
│  ├─ event_id, event_title, event_date                │
│  ├─ event_venue, event_image                         │
│  ├─ ticket_categories (JSONB)                        │
│  ├─ amount_paid, payment_id, order_id                │
│  ├─ status, booked_at, created_at                    │
│                                                      │
│  New QR Code Columns:                                │
│  ├─ qr_code_data (JSONB)  ─────────────────────┐   │
│  ├─ qr_code_image (TEXT)  ────────────────────┼─┐  │
│  ├─ ticket_id (TEXT UNIQUE)                 │ │ │  │
│  └─ checksum (TEXT)                         │ │ │  │
│                                             │ │ │  │
│  Indexes:                                   │ │ │  │
│  ├─ PRIMARY KEY: id                         │ │ │  │
│  ├─ UNIQUE: payment_id                      │ │ │  │
│  ├─ UNIQUE: ticket_id ◄─────────────────────┘ │ │  │
│  ├─ INDEX: ticket_id ◄────────────────────────┘ │  │
│  ├─ INDEX: checksum ◄──────────────────────────┘  │
│  ├─ INDEX: user_id, booked_at                     │
│  └─ INDEX: event_id                              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## API Endpoints

```
┌─────────────────────────────────────────────────────┐
│        GET /api/qr-codes                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Query Parameters:                                   │
│ ├─ booking_id=xxx  OR  ticket_id=xxx              │
│ └─ format=image|data|buffer (default: image)      │
│                                                     │
│ Returns:                                            │
│ ├─ format=image   → { qrCodeImage: "data:..." }  │
│ ├─ format=data    → { qrCodeData: {...} }         │
│ └─ format=buffer  → PNG binary file                │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│        POST /api/qr-codes                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Body:                                               │
│ { "ticketId": "EASY-..." }                         │
│                                                     │
│ Returns:                                            │
│ {                                                   │
│   "valid": true,                                    │
│   "ticketId": "EASY-...",                          │
│   "eventName": "...",                              │
│   "customerName": "...",                           │
│   "ticketCategory": "...",                         │
│   "quantity": 2                                     │
│ }                                                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Frontend Component Hierarchy

```
┌──────────────────────────────────┐
│   Page (Ticket Confirmation)     │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│     QRTicketDisplay Component    │
├──────────────────────────────────┤
│                                  │
│  ├─ Header (gradient)            │
│  │  ├─ "Your Ticket"             │
│  │  └─ Event confirmation        │
│  │                               │
│  ├─ Event Details Section        │
│  │  ├─ Event Date                │
│  │  ├─ Venue Location            │
│  │  ├─ Customer Name             │
│  │  └─ Ticket Type               │
│  │                               │
│  ├─ QR Code Display              │
│  │  ├─ "Scan for Entry"          │
│  │  └─ 300x300px Image           │
│  │                               │
│  ├─ Ticket Details Section       │
│  │  ├─ Ticket ID                 │
│  │  ├─ Booking ID                │
│  │  ├─ Amount Paid               │
│  │  └─ Booking Time              │
│  │                               │
│  ├─ Action Buttons               │
│  │  ├─ Download QR               │
│  │  ├─ Print Ticket              │
│  │  ├─ Share                     │
│  │  └─ Copy Ticket ID            │
│  │                               │
│  └─ Footer (important notice)    │
│                                  │
└──────────────────────────────────┘
```

---

## React Hooks Flow

```
useQRCode Hook
┌──────────────────────────────────┐
│  State:                          │
│  ├─ qrData (null|object)         │
│  ├─ loading (boolean)            │
│  └─ error (null|string)          │
│                                  │
│  Methods:                        │
│  ├─ fetchQRCode(id1, id2)        │
│  │  └─ Fetches from API          │
│  └─ reset()                      │
│     └─ Clears state              │
└──────────────────────────────────┘

useQRCodeVerification Hook
┌──────────────────────────────────┐
│  State:                          │
│  ├─ isValid (null|boolean)       │
│  ├─ loading (boolean)            │
│  ├─ error (null|string)          │
│  └─ details (null|object)        │
│                                  │
│  Methods:                        │
│  └─ verifyQRCode(ticketId)       │
│     └─ Calls verify API          │
└──────────────────────────────────┘
```

---

## Security Flow

```
QR CODE GENERATION
┌──────────────────────────────────────┐
│  1. Payment Verified               │
│     ├─ Check Razorpay signature    │
│     └─ Confirm amount              │
│                                    │
│  2. Booking Created                │
│     └─ Insert into database        │
│                                    │
│  3. Generate QR Data               │
│     ├─ Collect ticket info         │
│     └─ Create data object          │
│                                    │
│  4. Calculate Checksum             │
│     ├─ SHA256(ticketId+booking...) │
│     └─ Store first 16 chars        │
│                                    │
│  5. Generate QR Image              │
│     ├─ Encode JSON data            │
│     └─ Generate PNG                │
│                                    │
│  6. Store in Database              │
│     ├─ Save QR data                │
│     ├─ Save QR image               │
│     ├─ Save ticket ID              │
│     └─ Save checksum               │
│                                    │
│  7. Return to Frontend             │
│     └─ Send encrypted data         │
└──────────────────────────────────────┘

QR CODE VERIFICATION
┌──────────────────────────────────────┐
│  1. Scan QR Code                   │
│     └─ Extract JSON data           │
│                                    │
│  2. Calculate Checksum             │
│     └─ SHA256(ticketId+booking...) │
│                                    │
│  3. Compare Checksums              │
│     ├─ Stored vs Calculated        │
│     └─ Valid? → Yes/No             │
│                                    │
│  4. Lookup in Database (Optional)  │
│     ├─ Verify booking exists       │
│     └─ Check if already used       │
│                                    │
│  5. Return Result                  │
│     ├─ Valid ✓                     │
│     ├─ Invalid ✗                   │
│     └─ Used ✗                      │
└──────────────────────────────────────┘
```

---

## File Structure

```
easyentry/
├── app/
│   └── api/
│       └── qr-codes/
│           └── route.ts ........................ API Endpoints
│       └── payment/
│           └── verify/
│               └── route.ts ................... Updated (QR generation)
│
├── lib/
│   ├── qr-code-service.ts .................... Core QR Logic
│   ├── qr-code-generator.ts .................. DB Integration
│   ├── hooks/
│   │   └── use-qr-code.ts .................... React Hooks
│   └── migrations/
│       └── 20260608_add_qr_code_support.sql .. DB Schema
│
├── components/
│   └── QRTicketDisplay.tsx ................... UI Component
│
└── Documentation/
    ├── QR_CODE_DOCUMENTATION.md .............. Complete Guide
    ├── QR_CODE_INTEGRATION_GUIDE.md .......... Quick Start
    └── QR_CODE_IMPLEMENTATION_SUMMARY.md .... Overview
```

---

## Data Flow Diagram

```
PAYMENT COMPLETION
        │
        ▼
    Frontend sends payment data
        │
        ▼
    POST /api/payment/verify
        │
        ▼
    ├─ Verify Razorpay signature
    ├─ Create booking record
    │
    └─ ASYNC: Generate QR Code
        │
        ├─ generateQRCodeData()
        │   ├─ Create data object
        │   ├─ Calculate checksum
        │   └─ Return structured data
        │
        ├─ serializeQRData()
        │   └─ Compress to compact JSON
        │
        ├─ generateQRCodeImage()
        │   ├─ Encode data
        │   └─ Return PNG as base64
        │
        └─ Save to Database
            ├─ qr_code_data
            ├─ qr_code_image
            ├─ ticket_id
            └─ checksum
        │
        ▼
    Return Response
        │
        ├─ bookingId
        ├─ ticketId ◄─ NEW
        ├─ qrCodeImage ◄─ NEW
        └─ paymentId
        │
        ▼
    Frontend displays QRTicketDisplay
        │
        ├─ Show QR image
        ├─ Show event details
        ├─ Show action buttons
        └─ User can download/print/share
```

---

## Error Handling Flow

```
QR Generation Errors
└─ Payment Verification Failed
   ├─ Invalid signature
   ├─ Missing fields
   └─ DB query error

└─ Booking Creation Failed
   ├─ User not found
   ├─ Event not found
   └─ DB insert error

└─ QR Generation Failed
   ├─ QRCode library error
   ├─ Checksum calculation error
   └─ Image generation error

└─ Database Save Failed
   ├─ DB connection lost
   ├─ Invalid column data
   └─ Duplicate ticket_id

└─ Graceful Fallback
   ├─ QR generation is async
   ├─ Booking still created
   ├─ User notified of issue
   └─ Can retry QR generation
```

---

## Performance Optimization

```
QR Generation Performance
┌────────────────────────────────────┐
│  Normal Flow (Async)               │
│  ├─ Payment verify: ~100ms         │
│  ├─ QR generate: ~50ms (async)     │
│  └─ Total response: ~100ms         │
│                                    │
│  User Experience:                  │
│  ├─ Ticket shows instantly         │
│  ├─ QR appears within 1 second     │
│  └─ No blocking operations         │
│                                    │
│  Database Performance:             │
│  ├─ Indexed lookups: <10ms         │
│  ├─ QR storage: compact format     │
│  └─ Cache generated QR images      │
└────────────────────────────────────┘
```

---

**Diagram Version**: 1.0  
**Last Updated**: 2026-06-08
