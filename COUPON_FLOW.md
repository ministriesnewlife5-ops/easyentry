# Final Coupon Feature – Flow and Logic

This document describes the **final implemented coupon feature** for ticket booking, including:

- event-level coupon setup
- multi-source coupon ownership (Outlet / Artist / Promoter / Influencer)
- coupon validity windows
- coupon usage caps
- secure server-side discount enforcement
- booking-level coupon audit fields
- coupon analytics for admin dashboards

---

## 1) Feature Summary

The coupon system is now a **server-enforced, auditable coupon engine**.

### Supported capabilities

1. **Advanced coupon rules** (`couponRules[]`)
  - code
  - discount percent
  - source attribution (`sourceType`, `sourceId`, `sourceName`)
  - active window (`startsAt`, `endsAt`)
  - usage cap (`maxUses`)
2. **Usage enforcement**
  - usage count checked against booking records
3. **Booking audit trail**
  - coupon code/source/discount stored in `ticket_bookings`
4. **Analytics support**
  - conversion, top codes, source performance, total discount impact

---

## 2) End-to-End Flow

### Step A: Outlet creates event request with coupon

Source UI: [app/seller-form/page.tsx](app/seller-form/page.tsx)

Outlet can submit:

- `couponRules` with optional:
  - `sourceType`: outlet | artist | promoter | influencer
  - `sourceRefId`
  - `sourceRefName`
  - `startsAt`
  - `endsAt`
  - `maxUses`

Validation in form:

- discount must be in $[1, 100]$
- max uses must be a positive integer
- end time must be after start time

---

### Step B: Event request API validates coupon rules

Endpoint: `POST /api/admin/event-requests`

Source: [app/api/admin/event-requests/route.ts](app/api/admin/event-requests/route.ts)

Backend validates:

- each coupon rule has valid code + discount
- valid source type
- valid datetime format
- valid date window order
- valid positive integer max uses

Coupon data is persisted under `event_requests.event_data`.

---

### Step C: Publish request → publish coupon metadata

Source: [lib/public-events-store.ts](lib/public-events-store.ts)

On approval, event publish flow stores coupon data into `published_events.social_links`:

- `couponRules` (structured array)

---

### Step D: User enters coupon at checkout

Source UI: [app/events/[id]/page.tsx](app/events/[id]/page.tsx)

Frontend behavior:

- user enters code in checkout panel
- local preview checks matching rule + optional active window
- shows estimated discount in order summary

Important: frontend preview is **non-authoritative**.

---

### Step E: Server computes final amount and validates coupon

Endpoint: `POST /api/payment/create-order`

Source: [app/api/payment/create-order/route.ts](app/api/payment/create-order/route.ts)

Server-side logic:

1. Load event + coupon metadata from DB
2. Build effective coupon rule set from `couponRules`
3. Match requested code
4. Validate:
  - code exists
  - time window active (if configured)
  - usage cap not exhausted (if configured)
5. Recompute totals on server:

$$
  ext{subtotal} = \sum (\text{ticket price} \times \text{quantity})
$$

$$
  ext{convenienceFees} = 175 \times \text{totalTickets}
$$

$$
  ext{discountAmount} = \min\left(\text{subtotal} \times \frac{\text{discountPercent}}{100},\ \text{subtotal}\right)
$$

$$
  ext{finalAmount} = \max(\text{subtotal} - \text{discountAmount} + \text{convenienceFees},\ 0)
$$

6. Create Razorpay order with `finalAmount` only
7. Return `couponAudit` in response for booking persistence

This prevents price tampering from client payloads.

---

### Step F: Verify payment and persist coupon audit

Endpoint: `POST /api/payment/verify`

Source: [app/api/payment/verify/route.ts](app/api/payment/verify/route.ts)

After signature verification, booking record now stores:

- `coupon_code`
- `coupon_source_type`
- `coupon_source_id`
- `coupon_source_name`
- `coupon_discount_percent`
- `coupon_discount_amount`

These fields provide immutable auditability and analytics input.

---

## 3) Database Changes

Schema + migration files updated:

- [supabase-schema.sql](supabase-schema.sql)
- [lib/supabase-migration.sql](lib/supabase-migration.sql)

Added columns in `ticket_bookings`:

- `coupon_code TEXT`
- `coupon_source_type TEXT`
- `coupon_source_id TEXT`
- `coupon_source_name TEXT`
- `coupon_discount_percent NUMERIC(5,2)`
- `coupon_discount_amount NUMERIC(10,2)`

Added index:

- `idx_ticket_bookings_coupon_code`

---

## 4) Admin Visibility + Review

Event request admin panel now shows advanced coupon rules.

Source: [components/EventRequestsSection.tsx](components/EventRequestsSection.tsx)

This allows reviewers to verify:

- code and discount
- attribution source
- active window
- max-uses policy

before approving event publication.

---

## 5) Coupon Analytics

Endpoint: `GET /api/admin/analytics`

Source: [app/api/admin/analytics/route.ts](app/api/admin/analytics/route.ts)

New analytics output section:

- `couponAnalytics.totalBookings`
- `couponAnalytics.couponBookings`
- `couponAnalytics.couponConversionRate`
- `couponAnalytics.totalCouponDiscount`
- `couponAnalytics.topCodes[]`
- `couponAnalytics.bySource[]`

This enables measurement of:

- coupon adoption
- most effective codes
- source-wise performance (artist/promoter/influencer/outlet)
- discount impact vs revenue

---

## 6) Security Guarantees

1. Coupon validity is enforced server-side.
2. Final amount is server-calculated and cannot be overridden by client amount.
3. Usage caps are enforced from persisted booking history.
4. Coupon attribution is recorded per booking.
5. Analytics are derived from auditable booking data.

---

## 7) Final Outcome

The coupon feature is now production-grade and complete for:

- **creation** (with advanced controls)
- **validation** (secure + authoritative)
- **enforcement** (time/cap/source aware)
- **auditability** (booking-level persistence)
- **measurement** (admin analytics)
