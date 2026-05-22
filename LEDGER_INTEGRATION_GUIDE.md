# Ledger Foundation Integration Guide

## Overview

The ledger foundation audit is complete. All critical accounting correctness issues have been fixed. This guide explains how to integrate the ledger into your booking finalization flow and how to deploy the admin dashboard.

---

## Part 1: Deploy Ledger Schema Migration

### Step 1.1: Deploy to Supabase

```bash
# Copy the contents of lib/migrations/20260513_ledger_foundation.sql
# and paste into Supabase SQL Editor

# OR use supabase CLI:
supabase db push
```

### Step 1.2: Verify Deployment

Run these checks in Supabase SQL Editor:

```sql
-- Check 1: Verify all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'ledger_%';

-- Expected: 8 tables
-- ledger_accounts, ledger_transactions, ledger_entries, 
-- settlements, payouts, refunds, chargebacks, reconciliation_runs

-- Check 2: Verify default accounts seeded
SELECT account_code, account_name, account_type FROM ledger_accounts ORDER BY account_code;

-- Expected: 8 rows (CASH_INR, REVENUE_PLATFORM_FEE, PAYABLE_ORGANIZER, etc.)

-- Check 3: Verify functions exist
SELECT proname FROM pg_proc WHERE proname LIKE 'post_booking%' OR proname LIKE 'validate_booking%';

-- Expected: post_booking_confirmed, validate_booking_balance, validate_ledger_transaction_balanced
```

---

## Part 2: Wire Ledger into Booking Finalization

### Step 2.1: Update finalize_checkout_intent() RPC

Ensure that finalize_checkout_intent() calls post_booking_confirmed() after booking is created.

**File**: `lib/migrations/20260513_add_checkout_intents.sql`

**Around line 80-90, add this after the booking is inserted**:

```sql
-- Post ledger entries for the confirmed booking
-- This is atomic: either both booking AND ledger succeed, or both fail
PERFORM post_booking_confirmed(
  booking_id => v_booking_id,
  razorpay_payment_id => intent.razorpay_payment_id,
  gross_amount => intent.final_amount,
  platform_fee => intent.platform_fee_amount,
  organizer_id => event.organizer_id,
  organizer_share => v_organizer_share,
  promoter_id => NULL,  -- Set if event has promoter; NULL for now
  promoter_share => 0,  -- Set if event has promoter split
  gst_amount => 0       -- Set if GST calculation is available
);
```

### Step 2.2: Test Booking Finalization

**Create test booking via finalize_checkout_intent()**:

```sql
-- Step 1: Create test event
INSERT INTO published_events (
  organizer_id, title, description, category, is_online,
  is_published, event_date, event_time
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Test Event',
  'Ledger integration test',
  'music',
  false,
  true,
  NOW() + INTERVAL '7 days',
  '19:00:00'
) RETURNING id;
-- Save returned event_id as $EVENT_ID

-- Step 2: Create test checkout intent
INSERT INTO checkout_intents (
  event_id, user_id, quantity, ticket_category_id,
  razorpay_order_id, razorpay_payment_id, final_amount,
  platform_fee_amount, status
) VALUES (
  '$EVENT_ID'::uuid,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  1,
  (SELECT id FROM ticket_categories WHERE event_id = '$EVENT_ID' LIMIT 1),
  'order_test_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS'),
  'pay_test_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS'),
  500.00,
  50.00,
  'pending'
) RETURNING id;
-- Save returned intent_id as $INTENT_ID

-- Step 3: Finalize checkout (this will post ledger)
SELECT * FROM finalize_checkout_intent('$INTENT_ID'::uuid);

-- Step 4: Verify booking created
SELECT id, event_id, amount_paid, status FROM ticket_bookings 
WHERE created_at >= NOW() - INTERVAL '1 minute' LIMIT 1;

-- Step 5: Verify ledger entries created
SELECT lt.id, lt.transaction_type, COUNT(le.id) as entry_count
FROM ledger_transactions lt
LEFT JOIN ledger_entries le ON lt.id = le.transaction_id
WHERE lt.created_at >= NOW() - INTERVAL '1 minute'
GROUP BY lt.id, lt.transaction_type;

-- Step 6: Verify settlements created
SELECT settlement_type, recipient_id, amount_owed, status
FROM settlements
WHERE created_at >= NOW() - INTERVAL '1 minute';

-- Step 7: Verify ledger is balanced
SELECT lt.id, lt.transaction_type,
  SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END) as balance
FROM ledger_transactions lt
LEFT JOIN ledger_entries le ON lt.id = le.transaction_id
WHERE lt.created_at >= NOW() - INTERVAL '1 minute'
GROUP BY lt.id, lt.transaction_type;
-- Expected: balance = 0 for all rows
```

---

## Part 3: Verify Accounting Correctness

### Step 3.1: Check Balance Sheet

```sql
-- Query current balances (should show all accounts)
SELECT * FROM ledger_balances ORDER BY account_type, account_code;

-- Expected output shows:
-- - CASH_INR (asset): positive if money collected
-- - REVENUE_PLATFORM_FEE (income): positive if fees earned
-- - PAYABLE_ORGANIZER (liability): positive if owed to organizers
-- - PAYABLE_PROMOTER (liability): positive if owed to promoters
-- - PAYABLE_GST (liability): positive if GST collected
-- - etc.
```

### Step 3.2: Check Transaction Balance

```sql
-- Verify all transactions are balanced (debits = credits)
SELECT lt.id, lt.transaction_type,
  SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN le.direction = 'credit' THEN le.amount ELSE 0 END) as total_credits,
  ABS(SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END)) as imbalance
FROM ledger_transactions lt
LEFT JOIN ledger_entries le ON lt.id = le.transaction_id
GROUP BY lt.id, lt.transaction_type
HAVING ABS(SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END)) > 0.01;

-- Expected: Empty result (no imbalances)
```

### Step 3.3: Check Settlement Integrity

```sql
-- Verify settlements match ledger payables
SELECT
  'organizer' as type,
  SUM(s.amount_owed) as settlement_owed,
  (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_ORGANIZER') as ledger_balance
FROM settlements s
WHERE s.settlement_type = 'organizer' AND s.status = 'pending'
UNION ALL
SELECT
  'promoter' as type,
  SUM(s.amount_owed) as settlement_owed,
  (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_PROMOTER') as ledger_balance
FROM settlements s
WHERE s.settlement_type = 'promoter' AND s.status = 'pending';

-- Expected: settlement_owed = ledger_balance for each type
```

---

## Part 4: Deploy Admin Settlement Dashboard

### Step 4.1: Create API Endpoint

The endpoint is already created at `app/api/admin/settlements/dashboard/route.ts`.

### Step 4.2: Test the API

```bash
# Test the dashboard API
curl 'http://localhost:3000/api/admin/settlements/dashboard?date_from=2026-05-01&date_to=2026-05-13&include_breakdowns=false' \
  -H 'Authorization: Bearer <admin_token>'

# Expected response:
{
  "period": { "from": "2026-05-01", "to": "2026-05-13" },
  "financials": {
    "gross_collected": 500.00,
    "platform_fee_earned": 50.00,
    "pending_organizer_payouts": 400.00,
    "pending_promoter_payouts": 0.00,
    "refunded_amount": 0.00,
    "chargeback_exposure": 0.00,
    "net_cash_available": 50.00
  },
  "settlement_summary": {
    "total_pending_settlements": 400.00,
    "pending_organizer_count": 1,
    "pending_promoter_count": 0,
    "paid_settlements_count": 0
  },
  ...
}
```

### Step 4.3: Wire Dashboard to Admin UI

Create a new admin panel component:

```typescript
// components/AdminSettlementDashboard.tsx
import { useEffect, useState } from 'react';

export function AdminSettlementDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const from = new Date();
        from.setDate(from.getDate() - 30);
        
        const response = await fetch(
          `/api/admin/settlements/dashboard?date_from=${from.toISOString().split('T')[0]}&include_breakdowns=true`
        );
        const data = await response.json();
        setDashboard(data);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!dashboard) return <div>Error loading dashboard</div>;

  const { financials, settlement_summary, payout_summary } = dashboard;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="card">
        <h3>Gross Collected</h3>
        <p className="text-2xl font-bold">₹{financials.gross_collected.toFixed(2)}</p>
      </div>
      
      <div className="card">
        <h3>Platform Revenue</h3>
        <p className="text-2xl font-bold">₹{financials.platform_fee_earned.toFixed(2)}</p>
      </div>
      
      <div className="card">
        <h3>Pending Payouts</h3>
        <p className="text-2xl font-bold">₹{financials.pending_organizer_payouts.toFixed(2)}</p>
        <p className="text-sm text-gray-600">{settlement_summary.pending_organizer_count} organizers</p>
      </div>

      <div className="card">
        <h3>Net Cash Available</h3>
        <p className="text-2xl font-bold">₹{financials.net_cash_available.toFixed(2)}</p>
      </div>

      <div className="card">
        <h3>Pending Refunds</h3>
        <p className="text-2xl font-bold">₹{payout_summary.pending_amount.toFixed(2)}</p>
      </div>

      <div className="card">
        <h3>Chargeback Exposure</h3>
        <p className="text-2xl font-bold text-red-600">₹{financials.chargeback_exposure.toFixed(2)}</p>
      </div>
    </div>
  );
}
```

---

## Part 5: Monitor Ledger Health

### Step 5.1: Daily Monitoring Queries

Run these queries daily in your monitoring system:

```sql
-- Query 1: Check for any unbalanced transactions (should be empty)
SELECT lt.id, lt.transaction_type, COUNT(le.id) as entry_count,
  SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE 0 END) as debits,
  SUM(CASE WHEN le.direction = 'credit' THEN le.amount ELSE 0 END) as credits
FROM ledger_transactions lt
LEFT JOIN ledger_entries le ON lt.id = le.transaction_id
GROUP BY lt.id, lt.transaction_type
HAVING ABS(SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END)) > 0.01
LIMIT 10;

-- Query 2: Check for duplicate entries (should be empty)
SELECT idempotency_key, COUNT(*) as count
FROM ledger_transactions
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

-- Query 3: Check settlement aging (unpaid > 30 days)
SELECT id, recipient_id, amount_owed, created_at
FROM settlements
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '30 days'
ORDER BY created_at ASC;

-- Query 4: Check for negative account balances (should be empty)
SELECT account_code, account_name, balance
FROM ledger_balances
WHERE (account_type = 'asset' AND balance < 0)
   OR (account_type = 'income' AND balance < 0);
```

### Step 5.2: Set Up Alerts

Create a scheduled job (e.g., daily at 6 AM):

```typescript
// jobs/daily-ledger-health-check.ts
import { supabase } from '@/lib/supabase';

export async function dailyLedgerHealthCheck() {
  // Check for unbalanced transactions
  const { data: unbalanced } = await supabase.rpc(
    'check_unbalanced_transactions'
  );
  
  if (unbalanced && unbalanced.length > 0) {
    // Alert ops team
    await notifyOps('CRITICAL: Unbalanced ledger transactions found', unbalanced);
  }

  // Check for duplicate entries
  const { data: duplicates } = await supabase.rpc(
    'check_duplicate_postings'
  );
  
  if (duplicates && duplicates.length > 0) {
    await notifyOps('WARNING: Duplicate ledger postings detected', duplicates);
  }

  // Check settlement aging
  const { data: aged } = await supabase
    .from('settlements')
    .select('*')
    .eq('status', 'pending')
    .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  if (aged && aged.length > 0) {
    await notifyOps('WARNING: Settlements unpaid for 30+ days', aged);
  }

  console.log('Ledger health check complete');
}
```

---

## Part 6: Implement Refund Handling (Phase 2)

When a refund is requested:

```typescript
// app/api/refunds/create/route.ts
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { booking_id, amount, reason } = await request.json();

  // 1. Create refund record
  const { data: refund, error: refundError } = await supabase
    .from('refunds')
    .insert({
      booking_id,
      user_id: getUserId(), // from auth context
      refund_type: 'full',
      amount,
      reason,
      status: 'pending',
      idempotency_key: `refund_${booking_id}_${Date.now()}`
    })
    .select()
    .single();

  if (refundError) throw refundError;

  // 2. Call post_refund_issued() RPC to reverse ledger entries
  const { error: ledgerError } = await supabase.rpc(
    'post_refund_issued',
    {
      in_refund_id: refund.id,
      in_booking_id: booking_id,
      in_amount: amount,
      in_razorpay_refund_id: null  // Will be set when Razorpay processes
    }
  );

  if (ledgerError) {
    // Refund creation failed at ledger level
    console.error('Refund ledger posting failed:', ledgerError);
    throw ledgerError;
  }

  // 3. Trigger Razorpay refund API call
  await initiateRazorpayRefund(booking_id, amount);

  return { success: true, refund_id: refund.id };
}
```

---

## Deployment Checklist

- [ ] Deploy `20260513_ledger_foundation.sql` to Supabase
- [ ] Run verification queries (Step 1.2)
- [ ] Update finalize_checkout_intent() to call post_booking_confirmed()
- [ ] Create test booking and verify ledger entries (Step 2.2)
- [ ] Verify accounting correctness (Step 3)
- [ ] Deploy admin dashboard API
- [ ] Test dashboard API with sample data
- [ ] Wire dashboard to admin UI
- [ ] Set up daily monitoring queries
- [ ] Create alerting for ledger health issues
- [ ] Document in runbooks for ops team
- [ ] Train finance team on settlement dashboard

---

## Support

**Questions?** Check [LEDGER_AUDIT_REPORT.md](LEDGER_AUDIT_REPORT.md) for detailed design decisions.

**Issues?** Use the monitoring queries (Step 5.1) to diagnose problems.

**Production incident?** See [LEDGER_INCIDENT_PLAYBOOK.md](LEDGER_INCIDENT_PLAYBOOK.md) (to be created).
