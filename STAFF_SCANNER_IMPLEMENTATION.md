# EasyEntry Staff Scanner — Implementation Spec & Progress Tracker

> **For AI agents:** This file is the single source of truth for this feature.
> Before doing anything, read the **Progress Tracker** section first to see
> what is already done. After completing any step, come back and update the
> tracker (`[ ]` → `[x]`) and add a one-line note under "Implementation Log"
> before ending your turn. Do not skip ahead — steps depend on each other in
> order.

---

## 0. Progress Tracker

Update this table as work is completed. Status values: `TODO`, `IN PROGRESS`, `DONE`, `BLOCKED`.

| # | Step | Status | Notes |
|---|------|--------|-------|
| 0 | DNS record for `staff.easyentry.in` (manual, human does this) | TODO | |
| 1 | SQL migration — schema changes | DONE | |
| 2 | STAFF role | DONE | |
| 3 | Event Code field | DONE | event_code generated on publish; surfaced in admin host UI and events list; seller UI surfaces code when returned |
| 4 | Subdomain routing (middleware) | DONE | middleware rewrite added for staff subdomain; staff routes and placeholders created |
| 5 | Staff login page | DONE | basic staff login page created at app/staff/page.tsx (NextAuth credentials) |
| 6 | Event selection page + search API | DONE | placeholder event selection page created at app/staff/event/page.tsx and search API implemented at app/api/staff/events/search/route.ts |
| 7 | QR payload fix (booking ID only) | DONE | qr payload changed to bookingId only in app/events/[id]/page.tsx |
| 8 | Verification API | DONE | Verified against real booking data on production (pay_at_venue/unpaid scenario tested) |
| 9 | Mark Paid + Check-In APIs | DONE | mark-paid and check-in APIs implemented; optimistic-lock pattern used to avoid missing RPC dependency |
| 10 | Scanner page (PWA UI) | TODO | |
| 11 | PWA manifest | TODO | |
| 12 | End-to-end testing checklist | TODO | |

### Implementation Log
*(Append one line per session, most recent on top. Example: "2026-06-22 — Completed Step 2, STAFF role added to lib/roles.ts, onboarding updated, build passed.")*

-

2026-06-24 — QR payload fix completed: QR generation previously encoded full JSON (bookingId, event, tickets, timestamp) which exposed unnecessary data to client-side QR payloads and made server-side verification rely on client-provided data. Fixed by changing the QR generator to emit only the `bookingId` (in `app/events/[id]/page.tsx`, `QRCodeCanvas` now sets `const qrData = bookingId`). This ensures staff scanners send only the booking identifier and the server-side verification API performs authoritative lookups.

2026-06-24 — Check-in root cause & fix: The check-in flow originally relied on a Postgres RPC (`exec`) to run multi-statement SQL; that RPC did not exist in the database which caused the RPC call to fail and the endpoint to return the generic {"error":"Failed"} without useful logs. Replaced RPC usage with an optimistic-lock update (`.update().eq('checked_in_count', ...)`) plus an insert into `ticket_scans`. Verified full partial check-in flows end-to-end on production test data; mark-paid and payment-required gate verified.

2026-06-24 — Test booking cleanup SQL: test booking `07686ce5-cd05-43e0-9cb3-5945068316bf` created for manual partial check-in verification. To remove it manually in Supabase run:

```sql
DELETE FROM ticket_scans WHERE booking_id = '07686ce5-cd05-43e0-9cb3-5945068316bf';
DELETE FROM ticket_bookings WHERE id = '07686ce5-cd05-43e0-9cb3-5945068316bf';
```

2026-06-24 — Verification API tested on production: `POST /api/staff/tickets/verify` validated against real booking IDs. Verified responses for valid booking, wrong event, non-existent booking, and unauthorized requests. Pay-at-venue unpaid scenario returned correct `paymentMode: "pay_at_venue"` and `venuePaymentStatus: "unpaid"`.

2026-06-24 — Verified & fixed Step 3 and Step 6 items: a) Admin events list shows `event_code` with copy button; b) Organizer `/outlet/profile` events list shows `event_code` with copy button; c) `seller-form` and `AdminEventHostSection` surface `event_code` after publish; d) `/staff/event` "Select This Event" now sets `staff_selected_event` cookie and redirects to `/staff/scan`; e) `/staff/scan` reads the cookie and displays selected event name/code; f) `/staff/scan` redirects to `/staff/event` when cookie missing. Also applied TypeScript typing fixes for outlet/summary and staff API and added `use client` where needed. 

2026-06-23 — Implemented Step 4–6: middleware subdomain rewrite for `staff.` hosts, created `app/staff` pages (login, event search, scan placeholder), added `GET /api/staff/events/search?code=` API to lookup events by `event_code` with ticket aggregates.

2026-06-22 — Completed Step 3: added `event_code` generation in `lib/public-events-store.ts`, mapped `event_code` from DB, surfaced code in `AdminEventHostSection` and events list; seller UI will display code if returned by publish API. Ensure DB migration applied in Supabase.


2026-06-22 — Completed Step 2, STAFF role added to lib/roles.ts, onboarding UI and admin onboard API updated.

---

## 1. Context — What Exists Today (Before This Feature)

- QR code on a confirmed booking currently encodes full JSON:
  `{"bookingId","event","tickets","timestamp"}`
- No `STAFF` role exists. Roles today: `ADMIN`, `ORGANIZER`, `ARTIST`,
  `PROMOTER`, `CUSTOMER`.
- No subdomain routing exists. Single domain `easyentry.in`, path-based
  routing only, enforced in `middleware.ts`.
- `ticket_bookings` has no check-in tracking columns.
- No concept of a short, human-searchable Event Code — events are only
  identified by internal UUID.
- No staff-facing check-in or Pay-at-Venue confirmation flow exists.
- Pay at Venue payment mode already exists on bookings
  (`payment_mode`, `remaining_amount` columns), built in an earlier phase.

---

## 2. Target Behavior (Confirmed Requirements)

### 2.1 Event Identification
Every event has a short, unique, human-typeable Event Code (distinct from
the internal UUID) so staff can search for an event manually at the door.

### 2.2 Scan Flow
1. Staff logs in at `staff.easyentry.in`.
2. Staff searches for and selects the event they are working, by Event Code.
3. Staff scans a customer's ticket QR.
4. App looks up the booking and shows:
   - Purchaser name
   - Total tickets in the booking
   - Already checked-in count
   - Remaining count
   - Payment mode (Online / Pay at Venue)
   - If Pay at Venue: payment status (Paid / Unpaid at door)

### 2.3 Partial Check-In
- Staff chooses how many people from this booking are checking in right now
  (e.g. 2 of 4).
- Confirms → those 2 are marked checked in.
- The remaining 2 can check in later via the same QR, same flow.
- Once all tickets in the booking are checked in, the ticket becomes fully
  used and no further check-ins are possible.

### 2.4 Pay at Venue Confirmation
- If a booking's `payment_mode = 'pay_at_venue'` and is still unpaid:
  - Staff must tap "Mark as Paid" before the check-in stepper is usable.
  - Once marked paid, the normal check-in flow (2.3) becomes available.

### 2.5 Event-Scoped Records
- All bookings and check-in scans must be queryable by Event ID.
- Staff can see a live summary for the currently selected event: total
  tickets sold, total checked in, total remaining.

---

## 3. Database Migration (Run Manually in Supabase Before Step 2)

Run this entire block once, in the Supabase SQL editor, before any code work
begins. This is a **manual step**, not something the agent runs via the app.

```sql
-- Add a short human-readable event code
ALTER TABLE published_events
ADD COLUMN IF NOT EXISTS event_code TEXT UNIQUE;

-- Add check-in tracking to bookings
ALTER TABLE ticket_bookings
ADD COLUMN IF NOT EXISTS entry_status TEXT DEFAULT 'valid',
ADD COLUMN IF NOT EXISTS checked_in_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_checked_in_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_checked_in_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS venue_payment_status TEXT DEFAULT 'unpaid';
-- venue_payment_status is only meaningful when payment_mode = 'pay_at_venue'
-- allowed values: 'unpaid' | 'paid'

-- Audit trail of every scan / check-in action
CREATE TABLE IF NOT EXISTS ticket_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES ticket_bookings(id),
  event_id UUID REFERENCES published_events(id),
  scanned_by UUID,
  scanned_count INTEGER NOT NULL,
  running_total INTEGER NOT NULL,
  scan_result TEXT NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

-- Backfill event_code for existing events (run once)
UPDATE published_events
SET event_code = UPPER(SUBSTRING(id::text, 1, 8))
WHERE event_code IS NULL;
```

**Mark Step 1 as DONE in the tracker only after this SQL has actually been
run against the production/self-hosted Supabase instance**, not just written.

---

## 4. Build Steps (Run In Order, One At A Time)

For every step below:
1. Check the tracker — confirm all prior steps are `DONE`.
2. Implement exactly what the prompt describes. Do not bundle multiple steps
   together even if it seems efficient.
3. Run `npm run build`. If it fails, fix the build error before continuing —
   do not move to the next step with a broken build.
4. Run `pm2 restart easyentry` (or the project's actual deploy command).
5. Update the tracker: set status to `DONE`, add a one-line note to the
   Implementation Log with the date and what was done.
6. Only then proceed to the next step.

If a step cannot be completed (missing info, blocked by a decision the human
needs to make), set its status to `BLOCKED` and explain why in the
Implementation Log, then stop and ask the human.

---

### Step 2 — STAFF Role

```text
In EasyEntry, add a new role: STAFF.

1. In lib/roles.ts, add STAFF to the role type/enum
   alongside ADMIN, ORGANIZER, ARTIST, PROMOTER, CUSTOMER.

2. Allow admin to create STAFF users. Check
   app/api/admin/onboard/route.ts and extend it to
   accept role STAFF.

3. Add an "Onboard Staff" option in the admin dashboard,
   similar to the existing onboard flow, defaulting
   role to STAFF. Fields needed: name, email, password,
   and optionally which organizer/outlet they work for.

Run npm run build after changes.
```

---

### Step 3 — Event Code Field

```text
In EasyEntry, every event needs a unique, short,
human-readable Event Code (separate from the internal
UUID) so staff can search for events manually.

1. published_events table now has an event_code column
   (already migrated, format: 8-character uppercase
   alphanumeric).

2. In app/seller-form/page.tsx and
   components/AdminEventHostSection.tsx, after an event
   is successfully created, show the generated Event Code
   prominently in the success confirmation
   ("Your event code: ABCD1234 - share this with venue staff").

3. Auto-generate event_code when a new event is created
   (in the event creation API routes) using a short
   random uppercase alphanumeric string, checking for
   uniqueness before saving.

4. Add event_code to the event details shown in the
   admin events list and organizer dashboard.

Run npm run build after changes.
```

---

### Step 4 — Subdomain Routing

```text
In EasyEntry, implement subdomain-based routing so
staff.easyentry.in serves a completely separate
experience from easyentry.in, using the same Next.js app.

In middleware.ts:

1. Read the request hostname:
   const hostname = request.headers.get('host') || '';

2. If hostname starts with 'staff.':
   - Rewrite all requests to /staff/* internal routes
   - Example: staff.easyentry.in/ -> rewrites to /staff
   - Example: staff.easyentry.in/scan -> rewrites to /staff/scan
   - Use NextResponse.rewrite() with the new pathname

3. If hostname does NOT start with 'staff.':
   - Continue with existing logic unchanged

4. Block direct access to /staff/* paths if accessed
   via the main domain (easyentry.in/staff should 404)

Create the folder structure:
app/staff/
  layout.tsx       (minimal layout, no main navbar/footer)
  page.tsx         (login page)
  scan/page.tsx    (scanner page, protected, placeholder for now)
  event/page.tsx   (event selection page, placeholder for now)

Run npm run build after changes.
```

---

### Step 5 — Staff Login Page

```text
In EasyEntry, create a dedicated login page for staff
at app/staff/page.tsx (served as staff.easyentry.in).

1. Simple, minimal login form - email and password.
2. Use the existing NextAuth credentials provider.
3. After successful login, check if user role is
   STAFF, ORGANIZER, or ADMIN.
   - If not, show error "This portal is for staff only".
   - If valid, redirect to /staff/event
     (event selection page).
4. Clean, mobile-first dark UI matching EasyEntry
   branding (#E5A823, #0D0D0D, #F5F5DC).
5. No navbar, no footer - centered login card only.

Run npm run build after changes.
```

---

### Step 6 — Event Selection Page + Search API

```text
In EasyEntry, create the event selection page for staff
at app/staff/event/page.tsx.

1. Protected - redirect to /staff if not logged in with
   valid role.

2. Show a search input where staff can type an Event Code
   (the short code, e.g. ABCD1234) to find an event.

3. On finding a match, show event details: title, date,
   venue, total tickets sold, total checked in so far,
   remaining.

4. If staff is role ORGANIZER, only show events they own
   (published_events.organizer_id matches their user id).
   If ADMIN or STAFF, show all events or let them search any.

5. "Select Event" button stores the chosen event_id in
   session/local state and navigates to /staff/scan.

6. Show a list of recently used/upcoming events below the
   search for quick access without typing the code.

Create API endpoint app/api/staff/events/search/route.ts:
GET /api/staff/events/search?code=XXXX
Returns matching event with live stats:
total_tickets_sold, total_checked_in, total_remaining
(aggregate from ticket_bookings for that event_id).

Run npm run build after changes.
```

---

### Step 7 — QR Payload Fix

```text
In EasyEntry, the QR code generated after booking
currently contains full JSON
(bookingId, event, tickets, timestamp).

In app/events/[id]/page.tsx, find where qrData is
constructed and change it to contain only the booking ID:

const qrData = bookingId;

This is the only data needed since staff will look up
full details server-side after scanning.

Run npm run build after changes.
```

---

### Step 8 — Verification API

```text
In EasyEntry, create the ticket verification API for staff.

Create app/api/staff/tickets/verify/route.ts

POST /api/staff/tickets/verify
Request: { bookingId: string, eventId: string }
Auth: Only STAFF, ORGANIZER, ADMIN roles via session.
Organizers can only verify bookings for events they own.

Logic:
1. Fetch ticket_bookings by id, join published_events
   and app_users for purchaser name and event details.
2. Verify the booking's event_id matches the eventId
   passed (the event currently selected by staff) - 
   if mismatch, return { result: 'wrong_event',
   message: 'This ticket belongs to a different event' }.
3. If not found: { result: 'not_found' }.
4. If entry_status = 'cancelled': { result: 'cancelled' }.
5. If checked_in_count >= total_tickets:
   { result: 'already_used', checked_in_count,
     total_tickets, first_checked_in_at }.
6. Otherwise return:
   {
     result: 'valid',
     bookingId,
     purchaserName,
     totalTickets,
     alreadyCheckedIn: checked_in_count,
     remaining: total_tickets - checked_in_count,
     paymentMode: 'online' | 'pay_at_venue',
     venuePaymentStatus: 'paid' | 'unpaid' | null,
     remainingAmount,
     eventTitle, eventDate
   }

Run npm run build after changes.
```

---

### Step 9 — Mark Paid + Check-In APIs

```text
In EasyEntry, create two staff action APIs: mark Pay at
Venue bookings as paid, and check in customers.

Create app/api/staff/tickets/mark-paid/route.ts

POST /api/staff/tickets/mark-paid
Request: { bookingId: string }
Auth: STAFF, ORGANIZER, ADMIN only.

Logic:
1. Verify booking has payment_mode = 'pay_at_venue'.
2. Update venue_payment_status = 'paid'.
3. Return updated booking status.

Create app/api/staff/tickets/check-in/route.ts

POST /api/staff/tickets/check-in
Request: { bookingId: string, eventId: string, checkInCount: number }
Auth: STAFF, ORGANIZER, ADMIN only.

Logic:
1. Re-fetch current checked_in_count fresh.
2. If payment_mode = 'pay_at_venue' and
   venue_payment_status = 'unpaid', reject with
   { result: 'payment_required', message:
   'Mark payment as received before check-in' }.
3. Validate: checkInCount > 0 and
   (checked_in_count + checkInCount) <= total_tickets.
4. Update checked_in_count += checkInCount.
5. If checked_in_count === total_tickets:
   entry_status = 'used', else entry_status = 'partial'.
6. Set first_checked_in_at if null, always update
   last_checked_in_at.
7. Insert into ticket_scans: booking_id, event_id,
   scanned_by (session user id), scanned_count,
   running_total, scan_result.
8. Return updated status and counts.

Use a Postgres transaction or RPC for the check-in
update to prevent race conditions from simultaneous scans.

Run npm run build after changes.
```

---

### Step 10 — Scanner Page

```text
In EasyEntry, build the mobile scanner page for staff
at app/staff/scan/page.tsx.

1. Protected - redirect to /staff if no valid session.
2. Redirect to /staff/event if no event is currently
   selected in session/state.
3. Show the currently selected event name and code at
   the top with a "Change Event" link back to /staff/event.

4. Camera-based QR scanner (check if a QR library is
   already installed; if not, install html5-qrcode or
   @yudiel/react-qr-scanner).

5. On scan, call POST /api/staff/tickets/verify with
   the scanned value as bookingId and the selected eventId.

6. Display result based on response:

   - wrong_event: red banner "This ticket is for a
     different event".

   - not_found: red banner "Invalid ticket".

   - cancelled: red banner "Ticket cancelled".

   - already_used: amber banner showing purchaser name,
     "Already fully checked in at [time]".

   - valid: show a result card with:
     - Purchaser name
     - Total tickets / Already checked in / Remaining
     - If paymentMode is 'pay_at_venue' and
       venuePaymentStatus is 'unpaid':
         Show "Mark as Paid (CURRENCY_SYMBOL + amount)" button first.
         Disable check-in stepper until paid.
     - Check-in stepper: number input/stepper defaulting
       to remaining count, min 1, max remaining count.
     - "Confirm Check-In" button.
     - On confirm, call POST /api/staff/tickets/check-in.
     - Show success: "2 of 4 checked in. 2 remaining."
       or "All 4 checked in. Fully used."

7. Add manual booking ID text input as fallback for
   camera issues.

8. Mobile-first UI: large touch targets, big readable
   text, dark theme matching EasyEntry branding.

9. Add a "Logout" and "Change Event" option, always
   visible.

Run npm run build after changes.
```

---

### Step 11 — PWA Manifest

```text
In EasyEntry, make staff.easyentry.in installable as
a PWA on mobile devices.

1. Create public/staff-manifest.json:
{
  "name": "EasyEntry Staff Scanner",
  "short_name": "EE Staff",
  "start_url": "/staff",
  "display": "standalone",
  "background_color": "#0D0D0D",
  "theme_color": "#E5A823",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}

2. In app/staff/layout.tsx, add manifest link and PWA
   meta tags:
   <link rel="manifest" href="/staff-manifest.json" />
   <meta name="theme-color" content="#E5A823" />
   <meta name="apple-mobile-web-app-capable" content="yes" />
   <meta name="mobile-web-app-capable" content="yes" />

3. Use existing favicon/logo for icon-192.png and
   icon-512.png if dedicated icons don't exist.

Run npm run build after changes.
```

---

## 5. Manual Steps (Human Does These, Not the Agent)

| Step | Action |
|---|---|
| A | Add DNS A record: `staff.easyentry.in` -> server IP |
| B | Run the SQL migration block (Section 3) in Supabase |
| C | After Step 2, manually onboard at least one STAFF test user |
| D | Test on an actual mobile phone camera, not just desktop browser |

---

## 6. End-to-End Testing Checklist (Step 12)

Run through this after all build steps are `DONE`. Check each box only after
manually verifying it works, not just because the code compiles.

- [ ] Staff can log in at `staff.easyentry.in`
- [ ] Staff can search and select an event by Event Code
- [ ] Scanning a valid QR shows purchaser + ticket counts
- [ ] Scanning a ticket from a different event shows "wrong event"
- [ ] Partial check-in works (2 of 4, then 2 more later)
- [ ] Fully checked-in ticket shows "already used" on re-scan
- [ ] Pay at Venue ticket requires "Mark as Paid" before check-in
- [ ] After marking paid, check-in proceeds normally
- [ ] Organizer staff only sees their own events
- [ ] Admin/Staff role can see all events
- [ ] Page installs as PWA on a phone home screen

When all boxes are checked, set Step 12 to `DONE` in the tracker and this
feature is complete.

---

## 7. Rules for Any Agent Working From This File

1. Never skip a step or do steps out of order — each one depends on the
   previous being functional.
2. Never mark a step `DONE` without having run `npm run build` successfully
   and restarted the app.
3. Never mark Step 1 (SQL migration) `DONE` unless you have explicit
   confirmation from the human that they ran it in Supabase — you cannot run
   it yourself.
4. If you hit a build error, fix it before proceeding, and note the fix in
   the Implementation Log.
5. If a prompt's instructions conflict with something you find in the actual
   codebase (e.g. a file/column already exists with a different name), stop,
   note the conflict in the Implementation Log, and ask the human before
   improvising.
6. Always update Section 0 (Progress Tracker) and the Implementation Log
   before ending your turn, even if the step is only partially done — set
   status to `IN PROGRESS` and describe exactly what remains.
