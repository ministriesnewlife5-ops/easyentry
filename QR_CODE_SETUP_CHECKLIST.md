# QR Code Implementation - Setup & Verification Checklist

## ✅ Pre-Implementation Checklist

Before you start, verify:

- [ ] Node.js project running (Next.js 16.1.6)
- [ ] Supabase configured and accessible
- [ ] Authentication working (NextAuth)
- [ ] Payment system (Razorpay) integrated
- [ ] `qrcode` package installed (check package.json)
- [ ] TypeScript configured
- [ ] Tailwind CSS available

---

## 📋 Setup Steps

### Step 1: Database Migration
```bash
# 1. Open Supabase SQL Editor
# 2. Run the migration file:
# File: lib/migrations/20260608_add_qr_code_support.sql

# Alternatively, run these commands:
```

```sql
-- Copy and paste in Supabase SQL Editor

ALTER TABLE ticket_bookings
ADD COLUMN IF NOT EXISTS qr_code_data JSONB,
ADD COLUMN IF NOT EXISTS qr_code_image TEXT,
ADD COLUMN IF NOT EXISTS ticket_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS checksum TEXT;

CREATE INDEX IF NOT EXISTS idx_ticket_bookings_ticket_id 
  ON ticket_bookings(ticket_id);
  
CREATE INDEX IF NOT EXISTS idx_ticket_bookings_checksum 
  ON ticket_bookings(checksum);

-- Verify: Run this query to check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ticket_bookings' 
AND column_name IN ('qr_code_data', 'qr_code_image', 'ticket_id', 'checksum');
```

**Expected Output:**
```
column_name        | data_type
------------------|----------
qr_code_data       | jsonb
qr_code_image      | text
ticket_id          | text
checksum           | text
```

- [ ] Database migration applied
- [ ] Columns verified in Supabase

---

### Step 2: File Verification

Verify all new files exist in your project:

```bash
# Run these commands to verify files
ls -la lib/qr-code-service.ts
ls -la lib/qr-code-generator.ts
ls -la lib/hooks/use-qr-code.ts
ls -la components/QRTicketDisplay.tsx
ls -la app/api/qr-codes/route.ts
ls -la lib/migrations/20260608_add_qr_code_support.sql
```

Expected: All files should exist

- [ ] `lib/qr-code-service.ts` exists
- [ ] `lib/qr-code-generator.ts` exists
- [ ] `lib/hooks/use-qr-code.ts` exists
- [ ] `components/QRTicketDisplay.tsx` exists
- [ ] `app/api/qr-codes/route.ts` exists
- [ ] `lib/migrations/20260608_add_qr_code_support.sql` exists

---

### Step 3: Verify Payment Integration

Check that payment verification was updated:

**File:** `app/api/payment/verify/route.ts`

**Look for:**
1. Import added at top:
```typescript
import { generateAndStoreQRCode } from '@/lib/qr-code-generator';
```

2. QR generation before successful responses:
```typescript
const qrResult = await generateAndStoreQRCode(bookingId);
```

3. QR data in response:
```typescript
return respondSuccess({
  bookingId,
  paymentId,
  ticketId: qrResult.ticketId,
  qrCodeImage: qrResult.qrCodeImage,
  // ... other fields
});
```

- [ ] Import added to payment/verify route
- [ ] QR generation calls added
- [ ] Response includes ticketId and qrCodeImage

---

## 🧪 Testing Checklist

### Test 1: API Endpoint Availability

```bash
# Test GET endpoint
curl http://localhost:5000/api/qr-codes?booking_id=test

# Expected: 401 Unauthorized (requires auth)
# OR 404 Not Found (if booking doesn't exist)
# NOT: 500 Internal Server Error
```

- [ ] GET `/api/qr-codes` endpoint accessible
- [ ] Returns appropriate error (not 500)

### Test 2: QR Generation After Payment

1. Complete a test payment
2. Check browser console for any errors
3. Verify response includes:
   - `bookingId` ✓
   - `ticketId` ✓
   - `qrCodeImage` ✓

Response format:
```json
{
  "success": true,
  "data": {
    "bookingId": "550e8400-e29b-41d4-a716-446655440000",
    "ticketId": "EASY-1717881234567-a1b2c3d4",
    "qrCodeImage": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

- [ ] Payment completes successfully
- [ ] Response includes ticketId
- [ ] Response includes qrCodeImage (base64 data)
- [ ] No errors in console

### Test 3: QR Code Display

```typescript
// In your ticket confirmation page
console.log('QR Image URL valid:', paymentResponse.qrCodeImage?.startsWith('data:image/png'));
```

- [ ] QR image data URL is valid
- [ ] Image displays in component
- [ ] Image is not broken or blank

### Test 4: Component Rendering

Add this to your confirmation page:
```typescript
import { QRTicketDisplay } from '@/components/QRTicketDisplay';

// After payment
<QRTicketDisplay {...paymentResponse} />
```

- [ ] Component renders without errors
- [ ] All fields display correctly
- [ ] QR code image is visible
- [ ] Buttons are clickable

### Test 5: Component Features

Test each button in the component:

```
Test Button: Download
- Click download button
- File should download as "ticket-*.png"
- File should be valid PNG
- [ ] Download works

Test Button: Print
- Click print button
- Print dialog should open
- Ticket should display nicely
- [ ] Print works

Test Button: Share
- Click share button
- Native share dialog or clipboard action
- Should not throw error
- [ ] Share works

Test Button: Copy
- Click copy button
- Should show "Copied!" feedback
- [ ] Copy works
```

### Test 6: QR Code Verification

```bash
curl -X POST http://localhost:5000/api/qr-codes \
  -H "Content-Type: application/json" \
  -d '{"ticketId":"EASY-1717881234567-a1b2c3d4"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "ticketId": "EASY-1717881234567-a1b2c3d4",
    "eventName": "...",
    "customerName": "..."
  }
}
```

- [ ] Verification endpoint works
- [ ] Returns valid=true for real tickets
- [ ] Returns valid=false for invalid tickets

### Test 7: Database Storage

Verify QR data is stored in database:

```sql
-- Run in Supabase SQL Editor
SELECT 
  id,
  ticket_id,
  checksum,
  qr_code_data IS NOT NULL as has_data,
  qr_code_image IS NOT NULL as has_image
FROM ticket_bookings
ORDER BY booked_at DESC
LIMIT 1;
```

Expected: Should show your test booking with all QR columns populated

- [ ] `ticket_id` populated (not null)
- [ ] `checksum` populated (not null)
- [ ] `qr_code_data` populated (JSON object)
- [ ] `qr_code_image` populated (base64 string)

### Test 8: Multiple Bookings

Create 3 test bookings and verify:

```sql
SELECT 
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN ticket_id IS NOT NULL THEN 1 END) as with_qr
FROM ticket_bookings;
```

- [ ] All bookings have unique ticket IDs
- [ ] No duplicate ticket IDs
- [ ] All have QR data

### Test 9: Error Handling

Trigger errors and verify handling:

**Test missing payment:**
```bash
# Try to get QR for non-existent booking
curl http://localhost:5000/api/qr-codes?booking_id=invalid-uuid
# Should return 404, not 500
```

**Test invalid format:**
```bash
# Try invalid format parameter
curl http://localhost:5000/api/qr-codes?booking_id=xxx&format=invalid
# Should handle gracefully
```

- [ ] 404 returned for missing bookings
- [ ] 401 returned for unauthorized access
- [ ] 500 not returned for validation errors
- [ ] Error messages are helpful

### Test 10: Mobile Responsiveness

Test QR ticket display on mobile:

```
Scenarios to test:
- [ ] Display on small phone (320px)
- [ ] Display on tablet (768px)
- [ ] Display on desktop (1024px+)
- [ ] Buttons clickable on touch devices
- [ ] Text readable on small screens
- [ ] QR code size appropriate for all sizes
```

---

## 🔍 Verification Checklist Summary

### Database
- [ ] Migration applied successfully
- [ ] All 4 new columns exist
- [ ] Indexes created
- [ ] Can insert test data
- [ ] Can query by ticket_id

### Files & Code
- [ ] All new files created
- [ ] No TypeScript errors
- [ ] Payment route updated
- [ ] Imports working
- [ ] No ESLint warnings

### Functionality
- [ ] QR generates after payment
- [ ] QR displays in component
- [ ] Download works
- [ ] Print works
- [ ] Share works
- [ ] Copy works
- [ ] Verification works
- [ ] Mobile responsive

### Performance
- [ ] QR generation < 100ms
- [ ] API response < 200ms
- [ ] Database lookup < 10ms
- [ ] Component renders instantly
- [ ] No memory leaks

### Security
- [ ] Authentication required
- [ ] Checksum validates
- [ ] No sensitive data exposed
- [ ] Payment verification required
- [ ] User can't modify QR

---

## 🚀 Go-Live Checklist

Before deploying to production:

### Code Review
- [ ] All files reviewed
- [ ] No console.error left
- [ ] Error handling complete
- [ ] No hardcoded values
- [ ] Environment variables set

### Testing
- [ ] All manual tests passed
- [ ] Works on multiple browsers
- [ ] Works on mobile devices
- [ ] Error cases handled
- [ ] Edge cases tested

### Documentation
- [ ] Developers know how to use
- [ ] Support team aware
- [ ] Users understand QR
- [ ] Fallback plan if QR fails
- [ ] Monitoring/logging in place

### Deployment
- [ ] Database migration applied
- [ ] All environment variables set
- [ ] Payment integration tested
- [ ] Supabase backup taken
- [ ] Rollback plan ready

### Monitoring
- [ ] Error logs monitored
- [ ] QR generation tracked
- [ ] API performance monitored
- [ ] Database performance okay
- [ ] User feedback gathered

---

## 📊 Performance Benchmarks

After setup, verify performance:

```bash
# QR Generation Time
# Expected: 50-100ms

# API Response Time
# Expected: <200ms

# Database Query Time
# Expected: <10ms

# Component Render Time
# Expected: <100ms
```

- [ ] QR generation: < 100ms
- [ ] API response: < 200ms
- [ ] Database queries: < 10ms
- [ ] Component render: < 100ms

---

## 🐛 Debugging Tips

If something doesn't work:

### QR Not Generating
1. Check server logs
2. Verify payment completed
3. Check database connection
4. Verify `qrcode` package installed

### QR Image Not Showing
1. Check if base64 string valid
2. Verify data URL format
3. Check browser console
4. Try different browser

### Component Not Rendering
1. Check TypeScript errors
2. Verify all props passed
3. Check Tailwind CSS loaded
4. Try in different page

### Database Error
1. Verify migration applied
2. Check Supabase connection
3. Verify columns exist
4. Check permissions

---

## ✨ Success Indicators

You'll know it's working when:

✅ User completes payment  
✅ Response includes `ticketId` and `qrCodeImage`  
✅ QRTicketDisplay component renders  
✅ QR code image is visible  
✅ Download button works  
✅ Print shows nice layout  
✅ Share opens native dialog  
✅ Database has QR data  
✅ Can verify QR code  
✅ Works on mobile  

---

## 📞 Support Resources

- `QR_CODE_DOCUMENTATION.md` - Complete reference
- `QR_CODE_INTEGRATION_GUIDE.md` - How to integrate
- `QR_CODE_ARCHITECTURE.md` - System design
- `QR_CODE_QUICK_REFERENCE.md` - Quick guide
- Code comments in each file

---

## 🎉 Completion

Once all checkboxes are checked, you're ready to:

✅ Deploy to production  
✅ Show QR codes to users  
✅ Let users download/print/share  
✅ Scan QR codes at events  
✅ Verify ticket authenticity  

---

**Checklist Version**: 1.0  
**Last Updated**: 2026-06-08  
**Created for**: EasyEntry QR Code Implementation
