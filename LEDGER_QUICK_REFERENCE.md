# Ledger Foundation - Quick Reference Card

**Audit Date**: May 13, 2026 | **Status**: ✅ PRODUCTION READY

---

## The 7 Issues Fixed (TL;DR)

| # | Issue | Fix | Impact |
|----|-------|-----|--------|
| 1 | Idempotency broken (variable collision) | Renamed to v_idempotency_key | No duplicates ✅ |
| 2 | No balance validation | Added balance check before settlement | All txns balanced ✅ |
| 3 | Speculative refund reserve | Removed from booking-time posting | Reconciliation fixed ✅ |
| 4 | No negative amount checks | Added RPC + CHECK constraints | Negatives rejected ✅ |
| 5 | No accounting identity check | Added validate_booking_balance() | Allocation validated ✅ |
| 6 | No over-allocation protection | Balance validation enforces equality | Over-alloc impossible ✅ |
| 7 | No atomic transaction flow | Single RPC with 10-step flow | All-or-nothing ✅ |

---

## Key SQL Functions

### post_booking_confirmed() — 10-step atomic RPC
```sql
STEP 1: Validate accounting identity (gross = sum of allocations)
STEP 2: Validate no negative amounts
STEP 3: Build idempotency key (using v_ variable)
STEP 4: Check for duplicate (using fixed comparison)
STEP 5: Fetch account IDs
STEP 6: Create ledger_transactions record
STEP 7: Insert all ledger_entries
STEP 8: Validate transaction is balanced (debits = credits)
STEP 9: Create settlement records (only if balanced!)
STEP 10: Return success with is_balanced flag
```

### validate_booking_balance() — Validates allocation
```sql
-- Ensures: gross_amount = platform_fee + organizer_share + promoter_share + gst_amount
-- Called at STEP 1 (fail-fast, before any DB writes)
-- Tolerance: 0.01 paise
```

### ledger_balances — View of all account balances
```sql
SELECT * FROM ledger_balances;
-- Shows: account_code, account_name, balance for all accounts
```

---

## Test Data (₹500 Booking)

```
INPUT:
  gross_amount: 500
  platform_fee: 50
  organizer_share: 400
  promoter_share: 50
  gst_amount: 0

VALIDATION:
  ✓ No negatives (all >= 0)
  ✓ Sum equals gross (50 + 400 + 50 + 0 = 500)
  ✓ Ledger entries posted
  ✓ Ledger balanced (debits 500 = credits 500)
  ✓ Settlements created

LEDGER ENTRIES:
  Debit:  CASH_INR              500.00
  Credit: REVENUE_PLATFORM_FEE   50.00
  Credit: PAYABLE_ORGANIZER     400.00
  Credit: PAYABLE_PROMOTER       50.00
  ─────────────────────────────
  Balance:                        0.00 ✓

SETTLEMENTS:
  organizer: amount_owed=400, status='pending'
  promoter:  amount_owed=50,  status='pending'
```

---

## Accounting Identities (All Enforced)

```
✓ Gross Amount Identity
  gross = platform_fee + organizer_share + promoter_share + gst_amount

✓ Ledger Balance Identity
  sum(debits) = sum(credits) for each transaction

✓ Settlement Identity
  pending_settlements = ledger payable accounts
  
✓ No Duplicates
  idempotency_key is UNIQUE

✓ No Over-allocation
  sum(allocated) <= gross (enforced by balance validation)

✓ No Negatives
  all amounts >= 0

✓ Settlement Constraint
  amount_paid <= amount_owed
```

---

## Deploy Checklist

```
Phase 1: Deploy Schema (30 min)
  [ ] Run 20260513_ledger_foundation.sql
  [ ] Verify 8 tables created
  [ ] Verify 4 functions created
  [ ] Verify 8 default accounts seeded

Phase 2: Update Booking Finalization (15 min)
  [ ] Add post_booking_confirmed() call to finalize_checkout_intent()
  [ ] Deploy updated RPC

Phase 3: Test (30 min)
  [ ] Create test booking
  [ ] Verify ledger entries created
  [ ] Verify settlements created
  [ ] Verify balance = 0

Phase 4: Admin Dashboard (15 min)
  [ ] Deploy route.ts file
  [ ] Test API endpoint
  [ ] Verify response schema

Phase 5: Monitoring (10 min)
  [ ] Set up daily balance check query
  [ ] Set up alert for unbalanced transactions
  [ ] Set up alert for settlement aging > 30 days

Total: ~2 hours
```

---

## Verify Deployment

```sql
-- Check 1: Tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('ledger_accounts', 'ledger_entries', 'settlements', ...) 
AND table_schema = 'public';
-- Expected: 8

-- Check 2: Default accounts
SELECT COUNT(*) FROM ledger_accounts;
-- Expected: 8

-- Check 3: Functions
SELECT COUNT(*) FROM pg_proc WHERE proname = 'post_booking_confirmed';
-- Expected: 1

-- Check 4: Test booking
SELECT * FROM finalize_checkout_intent('booking-id');
SELECT * FROM ledger_entries WHERE created_at >= NOW() - INTERVAL '5 min';
-- Should see ledger entries

-- Check 5: Verify balance
SELECT SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END) as balance
FROM ledger_entries WHERE transaction_id = 'txn-id';
-- Expected: 0.00
```

---

## Admin Dashboard API

```
Endpoint: GET /api/admin/settlements/dashboard
Query Params:
  ?date_from=2026-05-01
  ?date_to=2026-05-13
  ?include_breakdowns=true (optional)

Response:
{
  "financials": {
    "gross_collected": 500.00,
    "platform_fee_earned": 50.00,
    "pending_organizer_payouts": 400.00,
    "pending_promoter_payouts": 50.00,
    "refunded_amount": 0.00,
    "chargeback_exposure": 0.00,
    "net_cash_available": 50.00
  },
  "settlement_summary": { ... },
  "payout_summary": { ... },
  "refund_summary": { ... },
  "chargeback_summary": { ... }
}
```

---

## Reconciliation Math

```
After ₹500 booking:

Cash in Bank:        ₹500 (collected)
Cash Account:        ₹500 (CASH_INR)
✓ Matches

Organizer Owed:      ₹400 (from allocation)
Settlement Record:   ₹400 (PAYABLE_ORGANIZER)
✓ Matches

Platform Earned:     ₹50 (platform fee)
Revenue Account:     ₹50 (REVENUE_PLATFORM_FEE)
✓ Matches

Check: 500 - 400 - 50 = 50 (available for operations)
✓ Verified
```

---

## Documentation Map

| Document | For Whom | Time |
|----------|----------|------|
| LEDGER_AUDIT_EXECUTIVE_SUMMARY.md | Finance, CTO | 10 min |
| LEDGER_AUDIT_REPORT.md | Auditors, Engineers | 30 min |
| LEDGER_DEPLOYMENT_CHECKLIST.md | DevOps | 20 min (read) / 2 hrs (execute) |
| LEDGER_INTEGRATION_GUIDE.md | Engineers | 30 min |
| LEDGER_OPERATIONAL_QUERIES.sql | Operations | 10 min |
| LEDGER_DOCUMENTATION_INDEX.md | Everyone | 5 min |

---

## Common Operations

### Check Balance Sheet
```sql
SELECT account_code, balance FROM ledger_balances ORDER BY account_code;
```

### Find Pending Settlements
```sql
SELECT recipient_id, SUM(amount_owed) as owed_amount
FROM settlements WHERE status = 'pending'
GROUP BY recipient_id;
```

### Check for Unbalanced Transactions
```sql
SELECT lt.id FROM ledger_transactions lt
LEFT JOIN ledger_entries le ON lt.id = le.transaction_id
GROUP BY lt.id
HAVING ABS(SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END)) > 0.01;
-- Should return: (empty)
```

### Check Cash Position
```sql
SELECT
  (SELECT balance FROM ledger_balances WHERE account_code = 'CASH_INR') as cash,
  (SELECT SUM(amount_owed) FROM settlements WHERE status = 'pending') as payables,
  (SELECT balance FROM ledger_balances WHERE account_code = 'CASH_INR') -
  (SELECT SUM(amount_owed) FROM settlements WHERE status = 'pending') as available;
```

---

## Alert Rules

Set up these alerts to monitor ledger health:

```
CRITICAL: Unbalanced Transactions
  Condition: unbalanced_count > 0
  Query: SELECT COUNT(*) WHERE balance != 0
  Action: Page on-call engineer

WARNING: Settlement Aging
  Condition: settlements.status='pending' AND created_at < NOW()-30d
  Query: SELECT COUNT(*) WHERE ...
  Action: Notify finance team

WARNING: Negative Balances
  Condition: balance < 0 for asset accounts
  Query: SELECT account_code WHERE balance < 0
  Action: Notify engineering team

INFO: Daily Settlement Summary
  Run daily at 6 AM: SELECT COUNT(*), SUM(amount_owed) ...
  Action: Log to dashboard
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "Required ledger accounts not found" | Schema not deployed | Run 20260513_ledger_foundation.sql |
| Duplicate postings | Idempotency bug | Already fixed - check if deployed |
| Unbalanced transactions | Bug in entry creation | Run balance check query |
| Settlement != ledger payable | Sync issue | Check reconciliation query |
| Admin API returns 500 | RPC not found | Verify migration deployed |

---

## Key Guarantees

✅ **No Duplicate Bookings**: UNIQUE constraint on idempotency_key  
✅ **No Unbalanced Ledger**: Balance validation before settlement  
✅ **No Over-allocation**: Sum equals gross, enforced  
✅ **No Negative Amounts**: CHECK constraints + RPC validation  
✅ **No Partial States**: Single RPC transaction (all-or-nothing)  
✅ **Immutable Entries**: Trigger prevents UPDATE/DELETE  
✅ **Reconciliation-safe**: 1-to-1-to-1 mapping (booking → ledger → settlement)  

---

**Status**: ✅ PRODUCTION READY | **Risk**: LOW | **Action**: DEPLOY

See [LEDGER_DOCUMENTATION_INDEX.md](LEDGER_DOCUMENTATION_INDEX.md) for full documentation
