# Ledger Foundation - Production Deployment Checklist

**Prepared**: May 13, 2026  
**Status**: READY FOR DEPLOYMENT  
**Reviewer**: Engineering + Finance  

---

## Pre-Deployment Verification (Do This First)

### Schema Validation
- [ ] Review [LEDGER_AUDIT_REPORT.md](LEDGER_AUDIT_REPORT.md) completely
- [ ] Review accounting model in [LEDGER_FOUNDATION_GUIDE.md](LEDGER_FOUNDATION_GUIDE.md)
- [ ] Understand all 7 fixed issues (see [LEDGER_AUDIT_SUMMARY.md](LEDGER_AUDIT_SUMMARY.md))
- [ ] Confirm your Supabase PostgreSQL version supports gen_random_uuid()
- [ ] Confirm you have schema migration capability (Supabase CLI or SQL Editor)

### Code Review
- [ ] Read validate_booking_balance() function (10 lines)
- [ ] Read post_booking_confirmed() function (100 lines, 10 steps)
- [ ] Understand idempotency key construction
- [ ] Understand balance validation logic
- [ ] Review all CHECK constraints

---

## Deployment Steps

### Phase 1: Deploy Schema (30 minutes)

**Step 1.1: Backup Existing Data**
```bash
# If you have existing bookings, back them up:
# (Your backup strategy here)
```

**Step 1.2: Deploy Migration**
```bash
# Option A: Via Supabase SQL Editor
# 1. Open https://supabase.com/dashboard/project/{project_id}/sql/new
# 2. Paste entire contents of lib/migrations/20260513_ledger_foundation.sql
# 3. Click "RUN"
# 4. Verify no errors

# Option B: Via Supabase CLI
supabase db push
```

**Step 1.3: Verify Deployment**

Run in Supabase SQL Editor:

```sql
-- Check 1: All tables exist
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN (
  'ledger_accounts', 'ledger_transactions', 'ledger_entries',
  'settlements', 'payouts', 'refunds', 'chargebacks', 'reconciliation_runs'
);
-- Expected: 8

-- Check 2: Default accounts seeded
SELECT COUNT(*) as account_count FROM ledger_accounts;
-- Expected: 8

-- Check 3: Functions exist
SELECT COUNT(*) as function_count FROM pg_proc 
WHERE proname IN ('post_booking_confirmed', 'validate_booking_balance', 'get_account_balance', 'validate_ledger_transaction_balanced');
-- Expected: 4

-- Check 4: Views exist
SELECT COUNT(*) as view_count FROM information_schema.views
WHERE table_schema = 'public' AND table_name IN ('ledger_balances', 'settlement_summary');
-- Expected: 2
```

**Result**: ✅ If all checks return expected counts

---

### Phase 2: Update Booking Finalization (15 minutes)

**Step 2.1: Update finalize_checkout_intent() RPC**

Edit `lib/migrations/20260513_add_checkout_intents.sql` around line 80:

```sql
-- After inserting the ticket_booking record, add this:
-- POST LEDGER ENTRIES FOR THE CONFIRMED BOOKING
-- This call is atomic: either booking AND ledger succeed, or both fail
SELECT post_booking_confirmed(
  in_booking_id => v_booking_id,
  in_razorpay_payment_id => intent.razorpay_payment_id,
  in_gross_amount => intent.final_amount,
  in_platform_fee => intent.platform_fee_amount,
  in_organizer_id => event.organizer_id,
  in_organizer_share => v_organizer_share,
  in_promoter_id => NULL, -- Update if your events have promoters
  in_promoter_share => 0,  -- Update if your events have promoters
  in_gst_amount => 0       -- Update if you have GST calculation
) INTO v_ledger_result;

-- Verify ledger post succeeded
IF v_ledger_result IS NULL THEN
  RAISE EXCEPTION 'Ledger posting failed for booking %', v_booking_id;
END IF;
```

**Step 2.2: Deploy Updated RPC**
```bash
supabase db push
```

**Result**: ✅ finalize_checkout_intent() now posts ledger entries

---

### Phase 3: Test with Sample Data (30 minutes)

**Step 3.1: Create Test Event**

Run in Supabase SQL Editor:

```sql
-- Get a test organizer ID (use an actual admin user from your database)
SELECT id FROM app_users WHERE role = 'admin' LIMIT 1;
-- Save as $ORGANIZER_ID

-- Create test event
INSERT INTO published_events (
  organizer_id, title, description, category, is_online,
  is_published, event_date, event_time
) VALUES (
  '$ORGANIZER_ID'::uuid,
  'Ledger Integration Test Event',
  'Testing ledger posting during booking finalization',
  'music',
  false,
  true,
  NOW() + INTERVAL '7 days',
  '19:00:00'
) RETURNING id;
-- Save returned id as $EVENT_ID
```

**Step 3.2: Create Test Ticket Category**

```sql
INSERT INTO ticket_categories (
  event_id, name, description, price, quantity_available
) VALUES (
  '$EVENT_ID'::uuid,
  'General Admission',
  'Test ticket',
  500.00,
  100
) RETURNING id;
-- Save returned id as $CATEGORY_ID
```

**Step 3.3: Create Test Checkout Intent**

```sql
-- Get a test customer user
SELECT id FROM app_users WHERE role = 'customer' LIMIT 1;
-- Save as $CUSTOMER_ID

-- Create checkout intent
INSERT INTO checkout_intents (
  event_id, user_id, quantity, ticket_category_id,
  razorpay_order_id, razorpay_payment_id, final_amount,
  platform_fee_amount, status
) VALUES (
  '$EVENT_ID'::uuid,
  '$CUSTOMER_ID'::uuid,
  1,
  '$CATEGORY_ID'::uuid,
  'order_ledger_test_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS'),
  'pay_ledger_test_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS'),
  500.00,
  50.00,
  'pending'
) RETURNING id;
-- Save returned id as $INTENT_ID
```

**Step 3.4: Finalize Checkout (This Posts Ledger!)**

```sql
SELECT * FROM finalize_checkout_intent('$INTENT_ID'::uuid);
```

**Expected result**:
```
id: (booking ID)
event_id: (event ID)
amount_paid: 500.00
status: confirmed
```

**Step 3.5: Verify Ledger Entries Created**

```sql
-- Check 1: Booking was created
SELECT id, event_id, amount_paid, status FROM ticket_bookings
WHERE created_at >= NOW() - INTERVAL '5 minutes' LIMIT 1;

-- Check 2: Ledger transaction was created
SELECT id, transaction_type, total_amount FROM ledger_transactions
WHERE created_at >= NOW() - INTERVAL '5 minutes' LIMIT 1;
-- Expected: transaction_type = 'booking_confirmed', total_amount = 500.00

-- Check 3: Ledger entries were created
SELECT direction, amount, description FROM ledger_entries
WHERE transaction_id = (SELECT id FROM ledger_transactions WHERE created_at >= NOW() - INTERVAL '5 minutes' LIMIT 1)
ORDER BY direction;
-- Expected 4 rows:
--   debit,  500.00, Customer payment received
--   credit, 50.00,  Platform fee earned
--   credit, 400.00, Organizer payout due
--   credit, 50.00,  Promoter commission due

-- Check 4: Settlements were created
SELECT settlement_type, recipient_id, amount_owed, status FROM settlements
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY settlement_type;
-- Expected 2 rows (organizer and promoter)

-- Check 5: Transaction is balanced
SELECT 
  SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) as total_credits
FROM ledger_entries
WHERE transaction_id = (SELECT id FROM ledger_transactions WHERE created_at >= NOW() - INTERVAL '5 minutes' LIMIT 1);
-- Expected: both should be 500.00 (balanced!)
```

**Result**: ✅ All checks pass if ledger posting is working

---

### Phase 4: Verify Accounting Correctness (10 minutes)

**Step 4.1: Check Balance Sheet**

```sql
SELECT account_code, account_name, balance FROM ledger_balances
ORDER BY account_type, account_code;

-- Expected results (after 1 test booking of ₹500):
-- CASH_INR: 500.00
-- REVENUE_PLATFORM_FEE: 50.00
-- PAYABLE_ORGANIZER: 400.00
-- PAYABLE_PROMOTER: 50.00
-- Others: 0.00
```

**Step 4.2: Verify Reconciliation Math**

```sql
-- Cash should equal: payables + revenue
-- 500 (cash) = (400 organizer + 50 promoter) + 50 platform fee ✓

SELECT
  (SELECT balance FROM ledger_balances WHERE account_code = 'CASH_INR') as cash,
  (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_ORGANIZER') as org_payable,
  (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_PROMOTER') as promoter_payable,
  (SELECT balance FROM ledger_balances WHERE account_code = 'REVENUE_PLATFORM_FEE') as platform_revenue,
  (SELECT balance FROM ledger_balances WHERE account_code = 'CASH_INR') - 
  (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_ORGANIZER') -
  (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_PROMOTER') as available_for_operations;

-- Expected: available_for_operations = 50.00 (platform fee earned)
```

**Step 4.3: Verify No Unbalanced Transactions**

```sql
SELECT COUNT(*) as unbalanced_count FROM (
  SELECT lt.id
  FROM ledger_transactions lt
  LEFT JOIN ledger_entries le ON lt.id = le.transaction_id
  GROUP BY lt.id
  HAVING ABS(SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END)) > 0.01
) t;

-- Expected: 0
```

**Result**: ✅ Accounting is correct

---

### Phase 5: Deploy Admin Dashboard API (10 minutes)

**Step 5.1: Copy API File**

The file `app/api/admin/settlements/dashboard/route.ts` is already created.

**Step 5.2: Test the API**

```bash
# Start your development server
npm run dev

# Test the API
curl 'http://localhost:3000/api/admin/settlements/dashboard?date_from=2026-05-01&include_breakdowns=false'

# Expected response (200 OK):
# {
#   "period": { "from": "2026-05-01", "to": "2026-05-13" },
#   "financials": {
#     "gross_collected": 500.00,
#     "platform_fee_earned": 50.00,
#     "pending_organizer_payouts": 400.00,
#     "pending_promoter_payouts": 50.00,
#     ...
#   },
#   ...
# }
```

**Step 5.3: Protect API with Admin Role Check**

Add to the beginning of the GET function:

```typescript
// Add after: const searchParams = request.nextUrl.searchParams;
const session = await getSession(request);
if (!session || session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

**Result**: ✅ API deployed and protected

---

### Phase 6: Wire Dashboard to Admin UI (20 minutes)

**Step 6.1: Create Dashboard Component**

Create `components/AdminSettlementDashboard.tsx` with the example code from [LEDGER_INTEGRATION_GUIDE.md](LEDGER_INTEGRATION_GUIDE.md#step-43-wire-dashboard-to-admin-ui)

**Step 6.2: Add Dashboard to Admin Panel**

```typescript
// app/admin/page.tsx
import { AdminSettlementDashboard } from '@/components/AdminSettlementDashboard';

export default function AdminPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <AdminSettlementDashboard />
    </div>
  );
}
```

**Step 6.3: Test Dashboard Display**

1. Log in as admin
2. Navigate to /admin
3. Verify dashboard loads and shows correct totals
4. Test date range filters

**Result**: ✅ Dashboard is visible and working

---

### Phase 7: Set Up Monitoring (10 minutes)

**Step 7.1: Create Monitoring Queries**

In your monitoring system (e.g., Datadog, New Relic), add these queries to run daily at 6 AM:

See [LEDGER_INTEGRATION_GUIDE.md](LEDGER_INTEGRATION_GUIDE.md#step-51-daily-monitoring-queries) for the complete set of queries.

**Step 7.2: Set Up Alerts**

```yaml
Alerts to create:
1. CRITICAL: Any unbalanced ledger transactions (should be empty)
   - Alert if: unbalanced_count > 0
   - Notification: Slack #ledger-alerts

2. WARNING: Settlement aging > 30 days
   - Alert if: settlements.status = 'pending' AND created_at < NOW() - 30 days
   - Notification: Slack #finance-alerts

3. WARNING: Duplicate ledger postings
   - Alert if: idempotency_key appears more than once
   - Notification: Slack #ledger-alerts

4. WARNING: Negative account balances (should never happen)
   - Alert if: ledger_balances.balance < 0 for asset/income accounts
   - Notification: Slack #ledger-alerts
```

**Step 7.3: Test Alert System**

- Manually trigger a test alert to confirm notifications work
- Verify alert routing is correct

**Result**: ✅ Monitoring is active

---

## Post-Deployment Verification (Do This After Deployment)

### Monitoring (First 24 Hours)

- [ ] Dashboard API returns data without errors
- [ ] Admin dashboard displays correct totals
- [ ] No alerts triggered (should be all clean)
- [ ] Review monitoring queries for any unexpected values

### First Production Booking

- [ ] Create a real booking through the UI
- [ ] Verify ledger entries created
- [ ] Verify settlements created
- [ ] Verify dashboard reflects new booking
- [ ] Verify balance sheet is correct

### Reconciliation Check (Daily for 1 Week)

Run daily reconciliation queries:
```sql
-- 1. Check for unbalanced transactions
SELECT COUNT(*) FROM (
  SELECT lt.id FROM ledger_transactions lt
  LEFT JOIN ledger_entries le ON lt.id = le.transaction_id
  GROUP BY lt.id
  HAVING ABS(SUM(...)) > 0.01
) t;
-- Expected: 0

-- 2. Check settlement count matches bookings
SELECT 
  (SELECT COUNT(*) FROM ticket_bookings WHERE status = 'confirmed') as bookings,
  (SELECT COUNT(*) FROM settlements WHERE status = 'pending') as pending_settlements;
-- Expected: settlements >= bookings (some may have multiple recipients)

-- 3. Check total cash balance
SELECT balance FROM ledger_balances WHERE account_code = 'CASH_INR';
-- Expected: matches total booking amounts
```

---

## Rollback Plan (If Issues Occur)

**If ledger posting is causing errors**:

```sql
-- Temporarily disable ledger posting in finalize_checkout_intent()
-- Comment out the post_booking_confirmed() call

-- Run this to verify no pending bookings are affected:
SELECT COUNT(*) as pending_bookings
FROM ticket_bookings
WHERE status = 'confirmed' AND created_at >= NOW() - INTERVAL '1 hour';
```

**If ledger tables have corruption**:

```sql
-- DELETE ledger entries and transactions (careful!)
DELETE FROM ledger_entries WHERE created_at >= '2026-05-13';
DELETE FROM ledger_transactions WHERE created_at >= '2026-05-13';
DELETE FROM settlements WHERE created_at >= '2026-05-13';

-- Re-post ledger entries for all bookings created after the corruption
-- (Manual reconciliation required)
```

---

## Sign-Off

**Checklist Status**: Ready for Deployment ✅

**Required Approvals**:
- [ ] Engineering Lead: _________________ Date: _____
- [ ] Finance Lead: _________________ Date: _____
- [ ] DevOps/Infrastructure: _________________ Date: _____

**Deployment Date**: _____________

**Deployed By**: _____________

**Verification Completed By**: _____________

**Date Verified**: _____________

---

## Support & Troubleshooting

**Issue**: Ledger posting fails with "Required ledger accounts not found"
**Solution**: Verify that 20260513_ledger_foundation.sql was fully deployed and default accounts were seeded

**Issue**: Idempotency error when retrying booking
**Solution**: Check v_idempotency_key construction in post_booking_confirmed() - should be unique per booking

**Issue**: Settlement amounts don't match ledger payables
**Solution**: Run balance verification query (Phase 4, Step 4.2) to find discrepancies

**Issue**: Dashboard API returns 500 error
**Solution**: Check Supabase RPC function names - ensure post_booking_confirmed() was deployed

**For detailed troubleshooting**: See [LEDGER_AUDIT_REPORT.md](LEDGER_AUDIT_REPORT.md)

---

**Questions?** Contact: [engineering lead] or [finance lead]
