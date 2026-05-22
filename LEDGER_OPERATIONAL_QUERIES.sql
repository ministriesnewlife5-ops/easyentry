-- ============================================
-- LEDGER OPERATIONAL QUERY REFERENCE
-- ============================================
-- Common queries for settlement, payout, and reconciliation operations

-- ============================================
-- 1. QUICK BALANCE SNAPSHOT
-- ============================================
SELECT
  account_code,
  account_name,
  account_type,
  balance,
  CASE
    WHEN account_type = 'asset' THEN 'What platform owns'
    WHEN account_type = 'liability' THEN 'What platform owes'
    WHEN account_type = 'income' THEN 'What platform earned'
    WHEN account_type = 'expense' THEN 'What platform lost'
  END as interpretation
FROM ledger_balances
ORDER BY account_type, account_code;

-- ============================================
-- 2. GET PENDING ORGANIZER/PROMOTER PAYABLES
-- ============================================
SELECT
  a.account_name,
  COALESCE(SUM(le.amount), 0) as pending_amount,
  COUNT(DISTINCT le.reference_id) as settlement_count
FROM ledger_accounts a
LEFT JOIN ledger_entries le ON a.id = le.account_id
  AND le.direction = 'credit'
  AND a.account_code IN ('PAYABLE_ORGANIZER', 'PAYABLE_PROMOTER')
WHERE a.account_code IN ('PAYABLE_ORGANIZER', 'PAYABLE_PROMOTER')
GROUP BY a.id, a.account_name
ORDER BY a.account_code;

-- ============================================
-- 3. SETTLEMENT SUMMARY BY RECIPIENT
-- ============================================
SELECT
  u.name,
  u.email,
  s.settlement_type,
  COUNT(*) as settlement_count,
  SUM(s.amount_owed) as total_owed,
  SUM(s.amount_paid) as total_paid,
  SUM(s.amount_owed) - SUM(s.amount_paid) as outstanding,
  s.status
FROM settlements s
JOIN app_users u ON s.recipient_id = u.id
GROUP BY u.id, u.name, u.email, s.settlement_type, s.status
ORDER BY s.settlement_type, u.name, s.status;

-- ============================================
-- 4. ASSEMBLE PAYOUT BATCH FOR A RECIPIENT
-- ============================================
-- Replace <recipient_id> with actual UUID
SELECT
  s.id,
  s.booking_id,
  s.amount_owed,
  tb.event_id,
  tb.event_title,
  tb.booked_at
FROM settlements s
JOIN ticket_bookings tb ON s.booking_id = tb.id
WHERE s.recipient_id = '<recipient_id>'
  AND s.status = 'pending'
ORDER BY tb.booked_at ASC;

-- ============================================
-- 5. CREATE PAYOUT BATCH (template)
-- ============================================
-- Step 1: Calculate total and get settlement IDs
WITH batch_settlements AS (
  SELECT
    s.id,
    s.amount_owed,
    COALESCE(p.account_balance, 'N/A') as recipient_account
  FROM settlements s
  LEFT JOIN (
    SELECT user_id, 'account_info' as account_balance FROM app_users
  ) p ON s.recipient_id = p.user_id
  WHERE s.recipient_id = '<recipient_id>'
    AND s.status = 'pending'
)
INSERT INTO payouts (
  batch_id,
  recipient_id,
  payout_method,
  recipient_account,
  amount,
  currency,
  status,
  settlement_ids,
  idempotency_key,
  metadata
)
SELECT
  'PAYOUT_' || to_char(NOW(), 'YYYY_MM_DD') || '_BATCH_1',
  '<recipient_id>',
  'bank_transfer',
  'account_xxxx1234',
  SUM(amount_owed),
  'INR',
  'pending',
  array_agg(id),
  'PAYOUT_' || '<recipient_id>' || '_' || to_char(NOW(), 'YYYY_MM_DD'),
  jsonb_build_object('settlement_count', COUNT(*))
FROM batch_settlements
RETURNING id, amount, status;

-- ============================================
-- 6. GET UNRECONCILED TRANSACTIONS (LAST 7 DAYS)
-- ============================================
SELECT
  lt.id,
  lt.transaction_type,
  lt.status,
  lt.external_reference,
  lt.total_amount,
  COUNT(le.id) as entry_count,
  lt.posted_at
FROM ledger_transactions lt
LEFT JOIN ledger_entries le ON lt.id = le.transaction_id
WHERE lt.posted_at >= CURRENT_DATE - INTERVAL '7 days'
  AND lt.status IN ('posted')
GROUP BY lt.id, lt.transaction_type, lt.status, lt.external_reference, lt.total_amount, lt.posted_at
ORDER BY lt.posted_at DESC;

-- ============================================
-- 7. VERIFY TRANSACTION BALANCE
-- ============================================
-- List any transactions that do NOT balance (should be empty)
SELECT
  lt.id,
  lt.transaction_type,
  lt.external_reference,
  SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END) as net_balance,
  COUNT(le.id) as entry_count
FROM ledger_transactions lt
LEFT JOIN ledger_entries le ON lt.id = le.transaction_id
GROUP BY lt.id, lt.transaction_type, lt.external_reference
HAVING ABS(SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END)) > 0.01
ORDER BY lt.posted_at DESC;

-- ============================================
-- 8. DAILY RECONCILIATION: BOOKINGS vs LEDGER
-- ============================================
WITH booking_totals AS (
  SELECT
    COUNT(*) as booking_count,
    SUM(amount_paid) as booking_gmv,
    MIN(booked_at) as earliest_booking,
    MAX(booked_at) as latest_booking
  FROM ticket_bookings
  WHERE status = 'confirmed'
    AND booked_at::date = CURRENT_DATE
),
ledger_totals AS (
  SELECT
    COALESCE(SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE 0 END), 0) as ledger_cash_inflow
  FROM ledger_entries le
  JOIN ledger_accounts la ON le.account_id = la.id
  WHERE la.account_code = 'CASH_INR'
    AND le.created_at::date = CURRENT_DATE
)
SELECT
  bt.booking_count,
  bt.booking_gmv,
  lt.ledger_cash_inflow,
  CASE
    WHEN bt.booking_gmv = lt.ledger_cash_inflow THEN 'BALANCED'
    ELSE 'MISMATCH'
  END as reconciliation_status,
  ABS(bt.booking_gmv - lt.ledger_cash_inflow) as difference
FROM booking_totals bt, ledger_totals lt;

-- ============================================
-- 9. REFUND STATUS BY BOOKING
-- ============================================
SELECT
  r.id,
  r.booking_id,
  tb.event_title,
  tb.amount_paid as original_amount,
  r.amount as refund_amount,
  r.status,
  r.reason,
  r.external_refund_id,
  r.created_at
FROM refunds r
JOIN ticket_bookings tb ON r.booking_id = tb.id
ORDER BY r.created_at DESC
LIMIT 20;

-- ============================================
-- 10. CHARGEBACK SUMMARY
-- ============================================
SELECT
  c.status,
  c.outcome,
  COUNT(*) as count,
  SUM(c.amount) as total_amount
FROM chargebacks c
WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.status, c.outcome
ORDER BY c.created_at DESC;

-- ============================================
-- 11. OPEN DISPUTES NEEDING EVIDENCE
-- ============================================
SELECT
  c.id,
  c.booking_id,
  tb.event_title,
  c.amount,
  c.chargeback_reason,
  c.external_dispute_id,
  c.created_at,
  c.evidence
FROM chargebacks c
JOIN ticket_bookings tb ON c.booking_id = tb.id
WHERE c.status = 'investigating'
  AND c.evidence IS NULL
ORDER BY c.created_at ASC;

-- ============================================
-- 12. PAYOUT EXECUTION REPORT (LAST 30 DAYS)
-- ============================================
SELECT
  batch_id,
  COUNT(*) as payout_count,
  SUM(amount) as total_amount,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  MIN(created_at)::date as batch_date
FROM payouts
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY batch_id
ORDER BY batch_date DESC;

-- ============================================
-- 13. GST LIABILITY ACCRUAL
-- ============================================
-- Total GST collected but not yet remitted
SELECT
  COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0) as gst_liability
FROM ledger_entries le
JOIN ledger_accounts la ON le.account_id = la.id
WHERE la.account_code = 'PAYABLE_GST'
  AND le.created_at >= CURRENT_DATE - INTERVAL '30 days';

-- ============================================
-- 14. PLATFORM REVENUE EARNED (LAST 7 DAYS)
-- ============================================
SELECT
  COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0) as platform_fee_earned
FROM ledger_entries le
JOIN ledger_accounts la ON le.account_id = la.id
WHERE la.account_code = 'REVENUE_PLATFORM_FEE'
  AND le.created_at >= CURRENT_DATE - INTERVAL '7 days';

-- ============================================
-- 15. CASH POSITION (ASSET - LIABILITY)
-- ============================================
-- "How much net cash does the platform have available?"
SELECT
  (SELECT balance FROM ledger_balances WHERE account_code = 'CASH_INR') as platform_cash,
  (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_ORGANIZER') as owed_to_organizers,
  (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_PROMOTER') as owed_to_promoters,
  (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_GST') as gst_liability,
  (SELECT balance FROM ledger_balances WHERE account_code = 'RESERVE_REFUND') as refund_reserve,
  (SELECT balance FROM ledger_balances WHERE account_code = 'CASH_INR')
    - (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_ORGANIZER')
    - (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_PROMOTER')
    - (SELECT balance FROM ledger_balances WHERE account_code = 'PAYABLE_GST')
    - (SELECT balance FROM ledger_balances WHERE account_code = 'RESERVE_REFUND')
    as available_cash;

-- ============================================
-- NOTES
-- ============================================
-- 1. Replace <recipient_id> with actual UUID values
-- 2. Run daily reconciliation (queries 8) as a scheduled job
-- 3. Monitor for ledger imbalances (query 7) - should always be empty
-- 4. Review disputed chargebacks (query 11) daily
-- 5. Execute payout batches (query 5) on a fixed schedule (e.g., weekly)
-- 6. All amounts are in INR; extend queries for multi-currency support if needed
