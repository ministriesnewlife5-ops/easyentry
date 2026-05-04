# Global Coupon Implementation Guide

This document outlines the complete global coupon flow for the 3-dashboard system (Artist, Promoter, Outlet Provider).

---

## Overview

**Global Coupons** are discount codes created by **Artists** and **Promoters** that work across **ALL events** they're involved with.

**Previous System**: Event-specific coupons (tied to single event)
**New System**: Global coupons (apply to all events automatically)

---

## Database Schema

### Table: `global_coupons`

```sql
id UUID PRIMARY KEY
code VARCHAR(24) UNIQUE PER SOURCE - e.g., "ARTIST1A2B", "PARTY3C4D"
discount_percent NUMERIC(5,2) - 1-100%
source_type VARCHAR(20) - 'artist' | 'promoter'
source_id UUID - User ID of creator
source_name VARCHAR(255) - Creator name (for tracking)
is_active BOOLEAN - Can be toggled on/off
starts_at TIMESTAMP - Optional: coupon active from this date
ends_at TIMESTAMP - Optional: coupon expires at this date
max_uses INTEGER - Optional: max redemptions before expiry
usage_count INTEGER - Current usage count
created_at TIMESTAMP - When coupon was created
updated_at TIMESTAMP - Last update time
```

### Constraints
- Unique constraint: `(code, source_type, source_id)` - No duplicate codes per creator
- Check: `discount_percent BETWEEN 1 AND 100`
- Check: `starts_at < ends_at` if both provided
- Check: `max_uses > 0` if specified

### Indexes
- `idx_global_coupons_code` - Fast lookup by code
- `idx_global_coupons_source` - Find all coupons by creator
- `idx_global_coupons_active` - Filter active coupons
- `idx_global_coupons_source_active` - Creator's active coupons

---

## API Endpoints

### GET `/api/global-coupons`
**Purpose**: Fetch user's global coupons and earnings

**Authentication**: Required (artist/promoter only)

**Response**:
```json
{
  "sourceType": "artist",
  "coupons": [
    {
      "id": "uuid",
      "code": "ARTIST1A2B",
      "discount_percent": 15,
      "source_type": "artist",
      "source_id": "user-id",
      "source_name": "John Doe",
      "is_active": true,
      "starts_at": null,
      "ends_at": null,
      "max_uses": null,
      "usage_count": 42,
      "created_at": "2025-05-04T10:00:00Z"
    }
  ],
  "earnings": {
    "totalShareAmount": 5000.00,
    "totalBookedAmount": 25000.00,
    "totalBookings": 42,
    "byCode": [
      {
        "code": "ARTIST1A2B",
        "bookings": 42,
        "shareAmount": 5000.00,
        "bookedAmount": 25000.00
      }
    ]
  }
}
```

---

### POST `/api/global-coupons`
**Purpose**: Create a new global coupon

**Authentication**: Required (artist/promoter only)

**Request Body**:
```json
{
  "code": "ARTIST1A2B",
  "discountPercent": 15,
  "startsAt": "2025-05-10T00:00:00Z",  // optional
  "endsAt": "2025-06-10T23:59:59Z",    // optional
  "maxUses": 100                        // optional
}
```

**Validation**:
- Code: 3-24 chars, A-Z, 0-9, underscore, hyphen only
- discountPercent: 1-100
- If both dates provided: startsAt < endsAt
- maxUses: positive integer if provided

**Response**:
```json
{
  "success": true,
  "coupon": {
    "id": "uuid",
    "code": "ARTIST1A2B",
    "discount_percent": 15,
    "source_type": "artist",
    "source_id": "user-id",
    "source_name": "John Doe",
    "is_active": true,
    "starts_at": null,
    "ends_at": null,
    "max_uses": null,
    "usage_count": 0,
    "created_at": "2025-05-04T10:00:00Z"
  }
}
```

---

## Payment Flow Integration

### At Checkout (`/api/payment/create-order`)

1. **User enters global coupon code**
2. **Server queries `global_coupons` table** by code
3. **Validate coupon**:
   - Code exists and is active
   - Time window valid (if set)
   - Usage limit not exceeded (if set)
   - Creator is artist/promoter
4. **Apply discount**: Calculate final amount with coupon
5. **Store audit fields** in ticket_bookings:
   - coupon_code
   - coupon_source_type ('artist'/'promoter')
   - coupon_source_id (creator user ID)
   - coupon_source_name (creator name)
   - coupon_discount_percent
   - coupon_discount_amount
6. **Increment usage**: Update `usage_count` in global_coupons

---

## Dashboard Integrations

### Artist Dashboard (`/app/artist/profile/page.tsx`)

**Promo Tab Component**: `<PromoCodeSection role="artist" />`

**Features**:
- Create global coupon (no event selection needed)
  - Code input with auto-generate (prefix: "ARTIST")
  - Discount % slider (1-100)
- List all active global coupons
  - Shows code, discount %, status
  - Displays "Works on ALL events"
- Earnings summary
  - Total share from coupons
  - Total bookings using coupons
  - Total GMV via coupons
  - By-coupon breakdown

**Data Flow**:
1. Load from `GET /api/global-coupons`
2. Create coupon: `POST /api/global-coupons`
3. Fetch updated list: `GET /api/global-coupons`

---

### Promoter Dashboard (`/app/promoter/profile/page.tsx`)

**Identical to Artist** except:
- Code prefix: "PARTY" instead of "ARTIST"
- Source type: 'promoter' instead of 'artist'
- All other UX/features identical

---

### Outlet Provider (No Changes)

Outlet still uses **event-specific coupons** embedded in seller-form:
- Coupons created during event submission
- Stored in `published_events.couponRules`
- Can specify sourceType (artist/promoter/influencer/outlet)
- Not affected by global coupon system

---

## Component Structure

### `PromoCodeSection.tsx`
Generic component for artist/promoter coupon management

**Props**:
```typescript
{
  role: 'artist' | 'promoter';
  promoForm: { code: string; discountPercent: string };
  globalCoupons: GlobalCoupon[];
  promoSummary: { totalShareAmount, totalBookedAmount, totalBookings };
  message: { type, text } | null;
  onPromoInputChange: (e) => void;
  onGenerateCode: () => void;
  onSubmitPromo: (e) => void;
}
```

**Sections**:
1. Form to create new coupon
   - Code input + Generate button
   - Discount % input
   - Submit button
2. Promo Earnings cards
   - Your Share (Auto Credited)
   - Promo Bookings count
   - Total GMV via Promo
3. Your Global Coupons list
   - Shows all coupons created
   - Displays code, discount, status
   - "Works on ALL events" label

---

## Earnings Attribution

### Artist/Promoter Share Calculation

When user books using global coupon:

**For Artists**:
```
artist_share = sum(quantity × price × artistShare%)
               from all ticket categories in booking
```

**For Promoters**:
Currently, promoters don't receive ticket-level share (only event hosting fees).
Global coupons created by promoters track usage but don't auto-credit earnings.
(Can be extended in future if promoter revenue model is defined)

### Earnings Query

```sql
SELECT 
  coupon_code,
  COUNT(*) as bookings,
  SUM(amount_paid) as total_gmv
FROM ticket_bookings
WHERE 
  coupon_source_id = 'user-id'
  AND coupon_source_type = 'artist'
  AND status = 'confirmed'
GROUP BY coupon_code
```

---

## Data Migration

### From Event-Specific to Global (Optional Future)

If converting existing event-specific coupons:

```sql
INSERT INTO global_coupons 
  (code, discount_percent, source_type, source_id, source_name, is_active, created_at)
SELECT 
  rule.code,
  rule.discount_percent,
  rule.source_type,
  rule.source_id,
  rule.source_name,
  true,
  NOW()
FROM published_events pe,
  LATERAL jsonb_array_elements(pe.social_links->'couponRules') rule
WHERE rule->>'sourceType' IN ('artist', 'promoter')
ON CONFLICT (code, source_type, source_id) DO NOTHING;
```

---

## Testing Checklist

- [ ] Create global coupon as artist
  - [ ] Code auto-generation works
  - [ ] Validation: code length, discount range
  - [ ] Stored in database
  - [ ] Appears in "Your Global Coupons" list
  
- [ ] Create global coupon as promoter
  - [ ] Code prefix is "PARTY"
  - [ ] Same validation rules
  - [ ] Separate from artist coupons

- [ ] Use global coupon at checkout
  - [ ] Code lookup works
  - [ ] Discount applied correctly
  - [ ] Usage count increments
  - [ ] Booking has coupon audit fields

- [ ] Earnings tracking
  - [ ] Correct share amount calculated
  - [ ] Grouped by coupon code
  - [ ] Displayed in dashboard

- [ ] Expiry/Limits
  - [ ] Coupon with start date not usable before date
  - [ ] Coupon with end date not usable after date
  - [ ] Max uses limit enforced

---

## Files Modified/Created

### New Files
- `/app/api/global-coupons/route.ts` - Global coupon API
- `/lib/global-coupons-store.ts` - Helper functions
- `/lib/migrations/global-coupons.sql` - Database schema
- `/components/PromoCodeSection.tsx` - Refactored component

### Modified Files
- `/app/artist/profile/page.tsx` - Use global coupon API
- `/app/promoter/profile/page.tsx` - Use global coupon API
- `/app/api/payment/create-order/route.ts` - Check global coupons at checkout

### Files Unchanged (Event-Specific)
- `/app/seller-form/page.tsx` - Still uses event-specific coupons
- `/lib/public-events-store.ts` - Event coupon management unchanged
- `/app/api/promo-codes/route.ts` - Event-specific endpoint unchanged

---

## Future Enhancements

1. **Bulk Coupon Management**
   - Deactivate/edit existing coupons
   - Download coupon codes as CSV
   - QR codes for social sharing

2. **Coupon Analytics**
   - Conversion rate by coupon
   - Geographic breakdown
   - Time-of-day trends

3. **Tiered Discounts**
   - Different discounts for different event types
   - Seasonal pricing
   - Dynamic discount based on demand

4. **Affiliate System**
   - Allow influencers to use others' coupons
   - Revenue sharing for promotions
   - Leaderboards for top promoters

