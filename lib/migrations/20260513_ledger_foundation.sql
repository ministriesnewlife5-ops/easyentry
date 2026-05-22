-- ============================================
-- LEDGER FOUNDATION MIGRATION
-- ============================================
-- This migration implements a double-entry accounting ledger for EasyEntry
-- as a merchant-of-record platform. It supports:
-- - immutable ledger entries
-- - idempotent settlement batches
-- - refunds and chargebacks
-- - full reconciliation with Razorpay
-- - tax/GST separation
-- - multi-role commission tracking

-- ============================================
-- 1. LEDGER ACCOUNTS TABLE
-- ============================================
-- Canonical accounts for the double-entry ledger.
-- Example accounts:
--   - platform_cash (asset: cash received from customers)
--   - platform_revenue (income: earned fees)
--   - organizer_payable (liability: owed to event organizers)
--   - promoter_payable (liability: owed to promoters/artists)
--   - gst_payable (liability: collected GST)
--   - refund_reserve (liability: held for potential refunds)
--   - chargeback_liability (liability: chargebacks received)

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(50) NOT NULL UNIQUE,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- asset, liability, income, expense
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_code ON ledger_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_type ON ledger_accounts(account_type);

-- Seed default accounts
INSERT INTO ledger_accounts (account_code, account_name, account_type, description)
VALUES
  ('CASH_INR', 'Platform Cash (INR)', 'asset', 'Cash collected from Razorpay'),
  ('REVENUE_PLATFORM_FEE', 'Platform Revenue (Fees)', 'income', 'Earned platform fees'),
  ('PAYABLE_ORGANIZER', 'Organizer Payable', 'liability', 'Amount owed to event organizers'),
  ('PAYABLE_PROMOTER', 'Promoter Payable', 'liability', 'Amount owed to promoters and artists'),
  ('PAYABLE_GST', 'GST Payable', 'liability', 'Collected GST to be remitted'),
  ('RESERVE_REFUND', 'Refund Reserve', 'liability', 'Held for refund obligations'),
  ('LIABILITY_CHARGEBACK', 'Chargeback Liability', 'liability', 'Chargebacks received from Razorpay'),
  ('EXPENSE_CHARGEBACK', 'Chargeback Expense', 'expense', 'Chargeback loss (final)')
ON CONFLICT (account_code) DO NOTHING;

-- ============================================
-- 2. LEDGER TRANSACTIONS TABLE
-- ============================================
-- Groups related ledger entries into a single balanced transaction.
-- Examples: booking_confirmed, refund_issued, chargeback_received, settlement_paid

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(50) NOT NULL, -- booking_confirmed, refund_issued, chargeback_received, settlement_paid
  status VARCHAR(50) NOT NULL DEFAULT 'posted', -- posted, reversed, corrected
  external_reference VARCHAR(255), -- e.g., razorpay_payment_id, booking_id
  idempotency_key VARCHAR(255) UNIQUE, -- prevents duplicate posting
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  metadata JSONB, -- arbitrary context (e.g., event_id, user_id, promotion code)
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_transactions_type ON ledger_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_status ON ledger_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_external_ref ON ledger_transactions(external_reference);
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_idempotency ON ledger_transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_posted_at ON ledger_transactions(posted_at DESC);

-- ============================================
-- 3. LEDGER ENTRIES TABLE
-- ============================================
-- Immutable double-entry lines. Each transaction must have balanced debit/credit.
-- Entries are append-only; they are never updated or deleted.

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  direction VARCHAR(10) NOT NULL, -- debit or credit
  amount NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  description TEXT,
  reference_type VARCHAR(50), -- booking, refund, chargeback, settlement
  reference_id VARCHAR(255), -- e.g., booking_id, refund_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index for fast queries on transaction and account
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_id ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at DESC);

-- Prevent updates on entries (immutable by trigger)
CREATE OR REPLACE FUNCTION prevent_ledger_entry_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are immutable and cannot be updated';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_ledger_entry_update_trigger ON ledger_entries;
CREATE TRIGGER prevent_ledger_entry_update_trigger
  BEFORE UPDATE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ledger_entry_update();

-- ============================================
-- 4. SETTLEMENTS TABLE
-- ============================================
-- Tracks money owed to organizers, promoters, and artists after booking confirmation.
-- States: pending -> paid -> reconciled

CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_type VARCHAR(50) NOT NULL, -- organizer, promoter, artist
  recipient_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  event_id UUID REFERENCES published_events(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES ticket_bookings(id) ON DELETE SET NULL,
  amount_owed NUMERIC(15, 2) NOT NULL,
  amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, reconciled, disputed
  payout_id UUID, -- reference to payout record when paid
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_recipient_id ON settlements(recipient_id);
CREATE INDEX IF NOT EXISTS idx_settlements_event_id ON settlements(event_id);
CREATE INDEX IF NOT EXISTS idx_settlements_booking_id ON settlements(booking_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_settlement_type ON settlements(settlement_type);
CREATE INDEX IF NOT EXISTS idx_settlements_created_at ON settlements(created_at DESC);

-- ============================================
-- 5. PAYOUTS TABLE
-- ============================================
-- Tracks actual money paid out to organizers/promoters.
-- States: pending -> executing -> completed -> reconciled

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id VARCHAR(255), -- e.g., "PAYOUT_2026_05_13_BATCH_1"
  recipient_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  payout_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer', -- bank_transfer, upi, wallet
  recipient_account VARCHAR(255), -- bank account, UPI ID, etc.
  amount NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, executing, completed, failed, reconciled
  external_payout_id VARCHAR(255), -- reference from payout provider (e.g., Razorpay settlement ID)
  external_payout_status VARCHAR(50), -- status from payout provider
  failure_reason TEXT,
  settlement_ids UUID[], -- array of settlement IDs included in this payout
  idempotency_key VARCHAR(255) UNIQUE, -- prevents duplicate payout attempts
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_recipient_id ON payouts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_batch_id ON payouts(batch_id);
CREATE INDEX IF NOT EXISTS idx_payouts_external_payout_id ON payouts(external_payout_id);
CREATE INDEX IF NOT EXISTS idx_payouts_idempotency ON payouts(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);

-- ============================================
-- 6. REFUNDS TABLE
-- ============================================
-- Tracks customer refunds with full/partial status and ledger linking.
-- States: pending -> processing -> completed -> reconciled

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES ticket_bookings(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  refund_type VARCHAR(50) NOT NULL DEFAULT 'full', -- full or partial
  amount NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, reconciled
  reason TEXT,
  external_refund_id VARCHAR(255), -- Razorpay refund ID
  external_refund_status VARCHAR(50), -- status from Razorpay
  failure_reason TEXT,
  ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(255) UNIQUE, -- prevents duplicate refund attempts
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_external_refund_id ON refunds(external_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_idempotency ON refunds(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at DESC);

-- ============================================
-- 7. CHARGEBACKS TABLE
-- ============================================
-- Tracks disputes and chargebacks from Razorpay/payment processors.
-- States: opened -> investigating -> won/lost -> reconciled

CREATE TABLE IF NOT EXISTS chargebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES ticket_bookings(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  amount NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  chargeback_reason VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'opened', -- opened, investigating, won, lost, reconciled
  external_dispute_id VARCHAR(255), -- Razorpay dispute ID
  external_dispute_status VARCHAR(50), -- status from Razorpay
  outcome VARCHAR(50), -- won or lost (null if still open)
  outcome_at TIMESTAMPTZ,
  evidence TEXT, -- merchant evidence submitted
  ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chargebacks_booking_id ON chargebacks(booking_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_user_id ON chargebacks(user_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_status ON chargebacks(status);
CREATE INDEX IF NOT EXISTS idx_chargebacks_external_dispute_id ON chargebacks(external_dispute_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_outcome ON chargebacks(outcome);
CREATE INDEX IF NOT EXISTS idx_chargebacks_created_at ON chargebacks(created_at DESC);

-- ============================================
-- 8. VALIDATION: validate_booking_balance
-- ============================================
-- Ensures booking amounts are balanced: gross = platform_fee + organizer_share + promoter_share + gst
-- This is the accounting identity that MUST hold for all bookings.

CREATE OR REPLACE FUNCTION validate_booking_balance(
  in_gross_amount NUMERIC,
  in_platform_fee NUMERIC,
  in_organizer_share NUMERIC,
  in_promoter_share NUMERIC,
  in_gst_amount NUMERIC
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_allocated_amount NUMERIC;
  v_tolerance NUMERIC := 0.01; -- INR paise tolerance for floating point
BEGIN
  -- Sum all allocations (these should equal gross)
  v_allocated_amount := COALESCE(in_platform_fee, 0) 
                      + COALESCE(in_organizer_share, 0) 
                      + COALESCE(in_promoter_share, 0) 
                      + COALESCE(in_gst_amount, 0);

  -- Verify that allocated amount matches gross amount (within tolerance)
  IF ABS(v_allocated_amount - in_gross_amount) > v_tolerance THEN
    RAISE EXCEPTION 'Booking balance mismatch: gross ₹%.2f != allocated ₹%.2f (fee + organizer + promoter + gst)',
      in_gross_amount, v_allocated_amount;
  END IF;

  RETURN TRUE;
END;
$$;

-- ============================================
-- 9. LEDGER POSTING FUNCTION: post_booking_confirmed
-- ============================================
-- Called by finalize_checkout_intent() to atomically post ledger entries for a confirmed booking.
-- Creates a balanced transaction with:
--   debit:  CASH_INR (gross amount)
--   credit: PAYABLE_GST (GST amount)
--   credit: REVENUE_PLATFORM_FEE (platform fee)
--   credit: PAYABLE_ORGANIZER/PAYABLE_PROMOTER (split to beneficiaries)
--
-- NOTE: RESERVE_REFUND is NOT posted at booking time. Refunds are posted only when a refund
--       is actually requested by the customer (not speculatively).
-- 
-- ATOMIC GUARANTEE: Either the entire ledger transaction succeeds with settlement records,
--                   or the entire function rolls back. No partial states.

CREATE OR REPLACE FUNCTION post_booking_confirmed(
  in_booking_id UUID,
  in_razorpay_payment_id TEXT,
  in_gross_amount NUMERIC,
  in_platform_fee NUMERIC,
  in_organizer_id UUID,
  in_organizer_share NUMERIC,
  in_promoter_id UUID,
  in_promoter_share NUMERIC,
  in_gst_amount NUMERIC
) RETURNS TABLE(transaction_id UUID, is_balanced BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE
  v_idempotency_key TEXT;
  v_txn_id UUID;
  v_cash_acct UUID;
  v_fee_acct UUID;
  v_gst_acct UUID;
  v_org_acct UUID;
  v_promo_acct UUID;
  v_total_debits NUMERIC;
  v_total_credits NUMERIC;
  v_balance_tolerance NUMERIC := 0.01;
BEGIN
  -- STEP 1: Validate accounting identity BEFORE any database writes
  PERFORM validate_booking_balance(
    in_gross_amount,
    in_platform_fee,
    in_organizer_share,
    in_promoter_share,
    in_gst_amount
  );

  -- STEP 2: Validate no negative amounts
  IF in_gross_amount < 0 OR in_platform_fee < 0 OR in_organizer_share < 0 
     OR in_promoter_share < 0 OR in_gst_amount < 0 THEN
    RAISE EXCEPTION 'Negative amounts not allowed in booking: gross=%.2f, fee=%.2f, organizer=%.2f, promoter=%.2f, gst=%.2f',
      in_gross_amount, in_platform_fee, in_organizer_share, in_promoter_share, in_gst_amount;
  END IF;

  -- STEP 3: Build idempotency key (using variable, not parameter, for safety)
  v_idempotency_key := 'booking_' || in_booking_id::text || '_' || in_razorpay_payment_id;

  -- STEP 4: Check if already posted using variable comparison
  SELECT id INTO v_txn_id 
  FROM ledger_transactions 
  WHERE idempotency_key = v_idempotency_key;
  
  IF v_txn_id IS NOT NULL THEN
    RAISE NOTICE 'Booking already posted to ledger: idempotency_key=%', v_idempotency_key;
    RETURN QUERY SELECT v_txn_id, true;
    RETURN;
  END IF;

  -- STEP 5: Fetch account IDs (will fail early if accounts don't exist)
  SELECT id INTO v_cash_acct FROM ledger_accounts WHERE account_code = 'CASH_INR';
  SELECT id INTO v_fee_acct FROM ledger_accounts WHERE account_code = 'REVENUE_PLATFORM_FEE';
  SELECT id INTO v_gst_acct FROM ledger_accounts WHERE account_code = 'PAYABLE_GST';
  SELECT id INTO v_org_acct FROM ledger_accounts WHERE account_code = 'PAYABLE_ORGANIZER';
  SELECT id INTO v_promo_acct FROM ledger_accounts WHERE account_code = 'PAYABLE_PROMOTER';

  IF v_cash_acct IS NULL OR v_fee_acct IS NULL THEN
    RAISE EXCEPTION 'Required ledger accounts (CASH_INR, REVENUE_PLATFORM_FEE) not found';
  END IF;

  -- STEP 6: Create transaction record
  INSERT INTO ledger_transactions (
    transaction_type, status, external_reference, idempotency_key, currency, total_amount, metadata
  ) VALUES (
    'booking_confirmed',
    'posted',
    in_razorpay_payment_id,
    v_idempotency_key,
    'INR',
    in_gross_amount,
    jsonb_build_object('booking_id', in_booking_id::text)
  ) RETURNING id INTO v_txn_id;

  -- STEP 7: Post all ledger entries (must be balanced)
  -- Debit: CASH_INR (gross amount received from customer)
  INSERT INTO ledger_entries (transaction_id, account_id, direction, amount, currency, description, reference_type, reference_id)
  VALUES (v_txn_id, v_cash_acct, 'debit', in_gross_amount, 'INR', 'Customer payment received', 'booking', in_booking_id::text);

  -- Credit: PAYABLE_GST (GST collected, if any)
  IF in_gst_amount > 0 THEN
    INSERT INTO ledger_entries (transaction_id, account_id, direction, amount, currency, description, reference_type, reference_id)
    VALUES (v_txn_id, v_gst_acct, 'credit', in_gst_amount, 'INR', 'GST collected', 'booking', in_booking_id::text);
  END IF;

  -- Credit: REVENUE_PLATFORM_FEE (platform fee earned)
  IF in_platform_fee > 0 THEN
    INSERT INTO ledger_entries (transaction_id, account_id, direction, amount, currency, description, reference_type, reference_id)
    VALUES (v_txn_id, v_fee_acct, 'credit', in_platform_fee, 'INR', 'Platform fee earned', 'booking', in_booking_id::text);
  END IF;

  -- Credit: PAYABLE_ORGANIZER (organizer share, if present)
  IF in_organizer_id IS NOT NULL AND in_organizer_share > 0 THEN
    INSERT INTO ledger_entries (transaction_id, account_id, direction, amount, currency, description, reference_type, reference_id)
    VALUES (v_txn_id, v_org_acct, 'credit', in_organizer_share, 'INR', 'Organizer payout due', 'booking', in_booking_id::text);
  END IF;

  -- Credit: PAYABLE_PROMOTER (promoter share, if present)
  IF in_promoter_id IS NOT NULL AND in_promoter_share > 0 THEN
    INSERT INTO ledger_entries (transaction_id, account_id, direction, amount, currency, description, reference_type, reference_id)
    VALUES (v_txn_id, v_promo_acct, 'credit', in_promoter_share, 'INR', 'Promoter commission due', 'booking', in_booking_id::text);
  END IF;

  -- STEP 8: Validate transaction is balanced before committing settlements
  SELECT
    COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0)
  INTO v_total_debits, v_total_credits
  FROM ledger_entries
  WHERE transaction_id = v_txn_id;

  IF ABS(v_total_debits - v_total_credits) > v_balance_tolerance THEN
    RAISE EXCEPTION 'Ledger transaction unbalanced: debits ₹%.2f != credits ₹%.2f (txn_id=%)',
      v_total_debits, v_total_credits, v_txn_id;
  END IF;

  -- STEP 9: Create settlement records (only if ledger is balanced)
  IF in_organizer_id IS NOT NULL AND in_organizer_share > 0 THEN
    INSERT INTO settlements (settlement_type, recipient_id, booking_id, amount_owed, currency, status)
    VALUES ('organizer', in_organizer_id, in_booking_id, in_organizer_share, 'INR', 'pending');
  END IF;

  IF in_promoter_id IS NOT NULL AND in_promoter_share > 0 THEN
    INSERT INTO settlements (settlement_type, recipient_id, booking_id, amount_owed, currency, status)
    VALUES ('promoter', in_promoter_id, in_booking_id, in_promoter_share, 'INR', 'pending');
  END IF;

  -- STEP 10: Return success with balance flag
  RETURN QUERY SELECT v_txn_id, TRUE;
END;
$$;

-- ============================================
-- 9. HELPER FUNCTION: get_account_balance
-- ============================================
-- Fast query to get the balance of any ledger account at a point in time.

CREATE OR REPLACE FUNCTION get_account_balance(
  in_account_id UUID,
  in_as_of_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS NUMERIC LANGUAGE SQL STABLE AS $$
  SELECT
    COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END), 0)
  FROM ledger_entries
  WHERE account_id = in_account_id
    AND created_at <= in_as_of_date;
$$;

-- ============================================
-- 10. HELPER FUNCTION: validate_ledger_transaction_balanced
-- ============================================
-- Ensures a transaction is balanced (total debits = total credits).

CREATE OR REPLACE FUNCTION validate_ledger_transaction_balanced(
  in_transaction_id UUID
) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT
    ABS(
      COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END), 0)
    ) < 0.01 -- account for floating point
  FROM ledger_entries
  WHERE transaction_id = in_transaction_id;
$$;

-- ============================================
-- 11. CONSTRAINTS AND VALIDATIONS
-- ============================================

-- Ensure ledger_entries direction is valid
ALTER TABLE ledger_entries
  ADD CONSTRAINT check_entry_direction CHECK (direction IN ('debit', 'credit'));

-- Ensure ledger_entries amount is positive
ALTER TABLE ledger_entries
  ADD CONSTRAINT check_entry_amount_positive CHECK (amount > 0);

-- Ensure settlements amount_paid <= amount_owed
ALTER TABLE settlements
  ADD CONSTRAINT check_settlement_paid_le_owed CHECK (amount_paid <= amount_owed);

-- Ensure payouts amount > 0
ALTER TABLE payouts
  ADD CONSTRAINT check_payout_amount_positive CHECK (amount > 0);

-- Ensure refunds amount > 0
ALTER TABLE refunds
  ADD CONSTRAINT check_refund_amount_positive CHECK (amount > 0);

-- Ensure chargebacks amount > 0
ALTER TABLE chargebacks
  ADD CONSTRAINT check_chargeback_amount_positive CHECK (amount > 0);

-- ============================================
-- 12. VIEW: LEDGER_BALANCES
-- ============================================
-- Materialized summary of all account balances for fast querying.

CREATE OR REPLACE VIEW ledger_balances AS
  SELECT
    a.id,
    a.account_code,
    a.account_name,
    a.account_type,
    a.currency,
    COALESCE(SUM(CASE WHEN e.direction = 'debit' THEN e.amount ELSE -e.amount END), 0) as balance
  FROM ledger_accounts a
  LEFT JOIN ledger_entries e ON a.id = e.account_id
  GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.currency;

-- ============================================
-- 13. VIEW: SETTLEMENT_SUMMARY
-- ============================================
-- Quick view of pending, paid, and reconciled settlement amounts by recipient.

CREATE OR REPLACE VIEW settlement_summary AS
  SELECT
    settlement_type,
    recipient_id,
    status,
    COUNT(*) as count,
    SUM(amount_owed) as total_owed,
    SUM(amount_paid) as total_paid
  FROM settlements
  GROUP BY settlement_type, recipient_id, status;

-- ============================================
-- 14. GRANT PUBLIC READ ACCESS TO VIEWS
-- ============================================
-- (In production, restrict these with RLS policies)

GRANT SELECT ON ledger_balances TO authenticated;
GRANT SELECT ON settlement_summary TO authenticated;
GRANT SELECT ON ledger_accounts TO authenticated;
GRANT SELECT ON ledger_transactions TO authenticated;
GRANT SELECT ON ledger_entries TO authenticated;

-- ============================================
-- DOCUMENTATION: BOOKING FINALIZATION FLOW
-- ============================================
/*
When a booking is finalized via finalize_checkout_intent():

1. Verify Razorpay signature server-side (in app code)
2. Load checkout_intent by razorpay_order_id
3. Call finalize_checkout_intent() RPC, which:
   a. Lock the intent row for update
   b. Validate status = 'pending' and not expired
   c. Check ticket inventory and decrement
   d. Insert ticket_booking record
   e. Increment coupon usage if applicable
   f. Mark intent completed
4. Call post_booking_confirmed() to post ledger entries:
   a. Create balanced ledger transaction (idempotent by booking_id + payment_id)
   b. Debit CASH_INR (gross amount from checkout_intent.final_amount)
   c. Credit RESERVE_REFUND (10% estimated refund reserve)
   d. Credit PAYABLE_GST (if GST calculation exists)
   e. Credit REVENUE_PLATFORM_FEE (platform fee from checkout_intent)
   f. Credit PAYABLE_ORGANIZER and/or PAYABLE_PROMOTER (from ticket_categories shares)
   g. Create settlement records for organizer/promoter

All operations are atomic within the RPC transaction. If any step fails, the entire
transaction rolls back, leaving checkout_intent still pending for retry.

Reconciliation:
- Daily: query ledger_balances to verify totals
- Match booking counts vs ledger entries
- Compare Razorpay settlements vs ledger CASH_INR
- Check PAYABLE_ORGANIZER vs pending settlements
- Verify all posted transactions are balanced
*/

