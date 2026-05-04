# Global Coupon System - Implementation Summary

## ✅ What's Been Implemented

### 1. **New Global Coupon API** (`/app/api/global-coupons/route.ts`)
- `GET /api/global-coupons` - Fetch user's global coupons + earnings
- `POST /api/global-coupons` - Create new global coupon
- Handles artists and promoters
- Calculates earnings based on ticket category shares
- Validates code uniqueness, discount range, date windows

### 2. **Refactored PromoCodeSection Component** (`/components/PromoCodeSection.tsx`)
- Removed "Select Event" dropdown (no longer event-specific)
- Now just asks for: **Code** + **Discount %**
- Displays "Works on ALL events" label
- Shows all global coupons created by user
- Generates codes with role-specific prefixes (ARTIST vs PARTY)

### 3. **Updated Artist Dashboard** (`/app/artist/profile/page.tsx`)
- Removed event-specific coupon logic
- Now uses `/api/global-coupons` endpoint
- Users create coupons that apply globally to all their events
- Shows earnings aggregated across all event bookings using their coupon

### 4. **Updated Promoter Dashboard** (`/app/promoter/profile/page.tsx`)
- Identical to artist but with "PARTY" code prefix
- Uses same global coupon API
- Tracks coupon usage across all promoter events

### 5. **Database Schema** (`/lib/migrations/global-coupons.sql`)
```sql
TABLE: global_coupons
- Stores code, discount%, creator (artist/promoter), dates, max uses
- Unique constraint per creator (no duplicate codes)
- Indexes for fast lookup and filtering
- View: global_coupons_valid for easy checkout validation
```

### 6. **Helper Library** (`/lib/global-coupons-store.ts`)
- `getGlobalCouponByCode()` - Fetch coupon for validation
- `validateGlobalCoupon()` - Check expiry, limits, status
- `incrementGlobalCouponUsage()` - Update usage count
- `getGlobalCouponsByCreator()` - Get creator's coupons

### 7. **Documentation** (`/GLOBAL_COUPON_IMPLEMENTATION.md`)
- Complete implementation guide
- Database schema details
- API contracts
- Payment flow integration
- Testing checklist

---

## 🎯 User Flow

### Creating a Global Coupon (Artist/Promoter)
1. Go to Dashboard → "Promo Codes" tab
2. Enter: Code (or click Generate) + Discount %
3. Click "Create Promo Code"
4. ✅ Code now works on **ALL events**

### Using Global Coupon (Ticket Buyer)
1. Browse events
2. At checkout, enter coupon code
3. Discount applied to all ticket prices
4. Payment processed (usage tracked)

### Tracking Earnings
1. Coupon earnings automatically credited
2. "Promo Earnings" cards show:
   - Total Share (auto-credited)
   - Total Bookings Using Coupon
   - Total GMV via Coupon
3. Breakdown by coupon code shown

---

## 🔧 Next Steps to Complete

### 1. **Run Database Migration**
```bash
psql -h your-host -d your-db -f lib/migrations/global-coupons.sql
# Or via Supabase SQL editor
```

### 2. **Update Payment Flow** (`/app/api/payment/create-order/route.ts`)
Add check for global coupons:
```typescript
// After parsing social_links couponRules, also check global coupons:
import { getGlobalCouponByCode, validateGlobalCoupon } from '@/lib/global-coupons-store';

// Look up global coupon
const globalCoupon = await getGlobalCouponByCode(normalizeCode(body.couponCode));
if (globalCoupon) {
  const status = validateGlobalCoupon(globalCoupon);
  if (!status.valid) {
    return NextResponse.json({ error: status.reason }, { status: 400 });
  }
  // Apply discount, store audit fields, increment usage
}
```

### 3. **Test All Flows**
```
✓ Create global coupon as artist
✓ Create global coupon as promoter
✓ Use global coupon at checkout
✓ Verify earnings calculation
✓ Test expiry dates
✓ Test max uses limit
```

---

## 📊 Key Differences from Event-Specific

| Feature | Event-Specific | Global |
|---------|---|---|
| **Selection** | Choose 1 event | Auto-applies to all |
| **Storage** | `published_events.couponRules[]` | `global_coupons` table |
| **Scope** | Per event | All events creator is in |
| **API** | `/api/promo-codes` | `/api/global-coupons` |
| **Earnings** | Event-specific | Aggregated across all events |

---

## 🏗️ Architecture Summary

```
┌─────────────────────────────────────────────┐
│         Artist/Promoter Dashboard           │
│  (PromoCodeSection Component)               │
└────────┬────────────────────────────────────┘
         │
         ├─→ Create Coupon: POST /api/global-coupons
         └─→ List Coupons:  GET  /api/global-coupons
                    │
         ┌──────────▼──────────┐
         │  global_coupons DB  │
         │  (code, discount,   │
         │   source, dates,    │
         │   max_uses, etc)    │
         └──────────┬──────────┘
                    │
         ┌──────────▼────────────┐
         │   Ticket Checkout     │
         │ Enter coupon code     │
         └──────────┬────────────┘
                    │
         ┌──────────▼────────────────┐
         │ Validate & Apply Discount │
         │ Increment usage_count     │
         │ Store audit fields        │
         └───────────────────────────┘

[Event-Specific Coupons] ← Unchanged
  ├─ Outlet uses for event submission
  └─ Stored in published_events.couponRules[]
```

---

## ✨ Benefits

✅ **Simpler UX** - No event selection needed  
✅ **Wider Reach** - Coupon works on all artist/promoter events  
✅ **Easier Tracking** - All earnings in one place  
✅ **Flexible Controls** - Date windows, usage limits  
✅ **Clean Data** - Separate table, no event dependencies  
✅ **DRY Code** - Shared component for artist & promoter  

---

## 🚀 Status

- ✅ API created
- ✅ Component refactored
- ✅ Dashboards updated
- ✅ Database schema ready
- ✅ Helper functions ready
- ✅ Documentation complete
- ⏳ **Awaiting**: Database migration execution
- ⏳ **Awaiting**: Payment flow integration
- ⏳ **Awaiting**: Testing

