# EasyEntry Ledger Foundation Implementation Guide

## Overview

This document describes the double-entry accounting ledger system implemented for EasyEntry as a merchant-of-record platform. The ledger is immutable, idempotent, and designed for full reconciliation with Razorpay and support for refunds/chargebacks.

---

## Core Principle: Double-Entry Accounting

Every financial transaction is recorded as a balanced set of ledger entries:
- **Debit**: increases asset accounts or decreases liability/income accounts
- **Credit**: decreases asset accounts or increases liability/income accounts

Each transaction must have **total debits = total credits**.

---

## Ledger Accounts

### Account Types and Examples

**Assets** (what the platform owns):
- `CASH_INR` – Cash received from customers (Razorpay)

**Liabilities** (what the platform owes):
- `PAYABLE_ORGANIZER` – Money owed to event organizers
- `PAYABLE_PROMOTER` – Money owed to promoters and artists
- `PAYABLE_GST` – GST collected, to be remitted to government
- `RESERVE_REFUND` – Estimated liability for potential refunds
- `LIABILITY_CHARGEBACK` – Chargebacks received from Razorpay

**Income** (earned revenue):
- `REVENUE_PLATFORM_FEE` – Platform fees earned from bookings

**Expenses** (losses):
- `EXPENSE_CHARGEBACK` – Chargeback losses (final, when chargeback is won by customer)

### Account Creation Query
```sql
SELECT * FROM ledger_accounts ORDER BY account_type, account_name;
```

---

## Data Model

### 1. Ledger Transactions
Represents a single balanced financial event. Examples:
- Booking confirmed (customer paid, money received)
- Refund issued (refund processed, cash returned)
- Chargeback received (dispute lost)
- Settlement paid (organizer payout executed)

**Key Fields:**
- `transaction_type` – `booking_confirmed`, `refund_issued`, `chargeback_received`, `settlement_paid`
- `status` – `posted`, `reversed`, `corrected`
- `idempotency_key` – Ensures no duplicate posting (e.g., `booking_<booking_id>_<payment_id>`)
- `external_reference` – Links to external system (e.g., `razorpay_payment_id`)

### 2. Ledger Entries
Immutable lines in the ledger. Each transaction is a set of balanced entries.

**Key Fields:**
- `direction` – `debit` or `credit`
- `amount` – Always positive; direction determines sign
- `reference_type` – `booking`, `refund`, `chargeback`, `settlement`
- `reference_id` – Links to business entity (e.g., booking UUID)

**Immutability:**
- Entries cannot be updated (enforced by trigger `prevent_ledger_entry_update_trigger`)
- Entries can only be created or, in exceptional cases, reversed (via new correcting transaction)

### 3. Settlements
Tracks money owed to organizers/promoters after a booking is confirmed.

**States:**
- `pending` – Amount is owed, not yet paid
- `paid` – Amount has been included in a payout
- `reconciled` – Payout was executed and verified with external system
- `disputed` – Settlement is being disputed (e.g., organizer complaint)

### 4. Payouts
Represents actual money transferred to a recipient.

**States:**
- `pending` – Payout is being prepared (batch assembled)
- `executing` – Payout request sent to payment processor
- `completed` – Payment processor confirmed
- `failed` – Payout failed; retryable
- `reconciled` – Verified against bank statement

**Idempotency:**
- `idempotency_key` (e.g., `PAYOUT_2026_05_13_BATCH_1_ORG_<org_id>`) prevents duplicate payouts

### 5. Refunds
Customer refunds with full reconciliation support.

**States:**
- `pending` – Refund request received
- `processing` – Refund sent to Razorpay
- `completed` – Razorpay processed; awaiting reconciliation
- `failed` – Razorpay rejected; needs manual review
- `reconciled` – Verified in bank statement

### 6. Chargebacks
Disputes and chargebacks from Razorpay.

**States:**
- `opened` – Dispute created by customer
- `investigating` – Merchant evidence gathered
- `won` – Platform won the dispute
- `lost` – Customer won; platform liable
- `reconciled` – Outcome verified in settlement file

---

## Booking Finalization & Ledger Posting

### Flow

When a booking is finalized via payment verification:

1. **App Code** (`app/api/payment/verify/route.ts`):
   - Verify Razorpay signature
   - Load `checkout_intent` by `razorpay_order_id`
   - Call `finalize_checkout_intent()` RPC

2. **RPC: `finalize_checkout_intent()`**:
   - Lock intent row for update
   - Validate `status = pending` and not expired
   - Check and decrement `ticket_categories` inventory
   - Insert `ticket_bookings` record
   - Increment global coupon usage
   - Call `post_booking_confirmed()` to post ledger entries
   - Mark intent as `completed`
   - **Atomic**: all or nothing

3. **Function: `post_booking_confirmed()`**:
   - Check idempotency (by `booking_id + razorpay_payment_id`)
   - Create balanced `ledger_transaction`
   - Post entries:
     - **Debit** `CASH_INR` (gross amount from `final_amount`)
     - **Credit** `RESERVE_REFUND` (10% standard reserve)
     - **Credit** `PAYABLE_GST` (if GST amount > 0)
     - **Credit** `REVENUE_PLATFORM_FEE` (convenience_fee)
     - **Credit** `PAYABLE_ORGANIZER` (organizer share, if exists)
     - **Credit** `PAYABLE_PROMOTER` (promoter share, if exists)
   - Create `settlements` records for recipients

### Example Ledger Posting

**Scenario:** Customer books 2 tickets at ₹1000 each, platform fee ₹200, GST ₹300, organizer gets 60%, promoter gets 30%.

**Gross Amount:** ₹2000
**Components:**
- Reserve (10%): ₹200
- GST: ₹300
- Platform Fee: ₹200
- Organizer Share: ₹1200 (60% of ₹2000)
- Promoter Share: ₹600 (30% of ₹2000)
- Remaining: ₹-300 (error in this example; total should balance)

**Corrected (balance to 2000):**
- Reserve: ₹300
- GST: ₹300
- Platform Fee: ₹200
- Organizer: ₹800
- Promoter: ₹400
- **Total: ₹2000**

**Ledger Entries:**
| Direction | Account           | Amount | Description              |
|-----------|-------------------|--------|--------------------------|
| Debit     | CASH_INR          | 2000   | Customer payment         |
| Credit    | RESERVE_REFUND    | 300    | Refund reserve (10%)     |
| Credit    | PAYABLE_GST       | 300    | GST collected            |
| Credit    | REVENUE_PLATFORM  | 200    | Platform fee             |
| Credit    | PAYABLE_ORGANIZER | 800    | Organizer payout due     |
| Credit    | PAYABLE_PROMOTER  | 400    | Promoter commission      |
| **TOTAL** | -                 | **2000** | Balanced            |

---

## Refund Flow

When a customer requests a refund:

1. **Create Refund Record**:
   ```sql
   INSERT INTO refunds (booking_id, user_id, refund_type, amount, status, reason)
   VALUES (?, ?, 'full', <booking_amount>, 'pending', 'Customer request');
   ```

2. **Process via Razorpay API**:
   - Send refund request to Razorpay
   - Record `external_refund_id` and `external_refund_status`

3. **On Razorpay Confirmation** (via webhook or polling):
   ```sql
   UPDATE refunds SET status = 'completed', external_refund_status = ? WHERE id = ?;
   ```

4. **Post Reversing Ledger Entries**:
   - Create new `ledger_transaction` with type `refund_issued`
   - **Debit** `PAYABLE_ORGANIZER/PROMOTER/etc.` (reverse shares)
   - **Credit** `CASH_INR` (cash returned)
   - **Debit** `REVENUE_PLATFORM_FEE` (reverse fee if applicable)
   - **Credit** `RESERVE_REFUND` (release reserve)

5. **Reconciliation**:
   - Match refund in Razorpay settlement file
   - Mark `refunds.status = reconciled`

---

## Chargeback Flow

When Razorpay reports a dispute/chargeback:

1. **Create Chargeback Record**:
   ```sql
   INSERT INTO chargebacks (booking_id, user_id, amount, chargeback_reason, status, external_dispute_id)
   VALUES (?, ?, <amount>, ?, 'opened', <razorpay_dispute_id>);
   ```

2. **Gather Evidence** (manual/automated):
   - Store merchant response in `evidence`

3. **On Outcome** (Razorpay notifies):
   ```sql
   UPDATE chargebacks SET status = 'lost', outcome = 'lost', outcome_at = NOW() WHERE external_dispute_id = ?;
   ```

4. **Post Chargeback Loss Entries** (if lost):
   - Create `ledger_transaction` with type `chargeback_received`
   - **Debit** `LIABILITY_CHARGEBACK` (track liability)
   - **Debit** `EXPENSE_CHARGEBACK` (record loss)
   - **Credit** `CASH_INR` (cash deducted by Razorpay)
   - **Credit** `PAYABLE_ORGANIZER/PROMOTER/etc.` (reverse their share)

---

## Settlement & Payout Execution

### Settlement Records

When a booking is confirmed, `settlement` records are created for each recipient:

```sql
INSERT INTO settlements (settlement_type, recipient_id, booking_id, amount_owed, currency, status)
VALUES ('organizer', <org_id>, <booking_id>, <share_amount>, 'INR', 'pending');
```

### Payout Batching (Daily/Weekly)

**Batch Assembly:**
```sql
SELECT SUM(amount_owed) as total, array_agg(id) as settlement_ids
FROM settlements
WHERE recipient_id = ? AND status = 'pending'
GROUP BY recipient_id;
```

**Create Payout Record:**
```sql
INSERT INTO payouts (batch_id, recipient_id, amount, status, settlement_ids, idempotency_key)
VALUES ('PAYOUT_2026_05_13_BATCH_1', <recipient_id>, <total>, 'pending', <settlement_ids>, 'unique_key');
```

**Execute Payout:**
- Call bank/UPI transfer API (e.g., Razorpay Settlement API)
- Update `payouts.status = executing`
- Record `external_payout_id` if returned

**On Payout Success:**
```sql
UPDATE payouts SET status = 'completed', external_payout_status = ? WHERE id = ?;
UPDATE settlements SET status = 'paid', payout_id = ? WHERE id = ANY(?);
```

**Reconciliation:**
- Daily: match payouts against bank statement / Razorpay settlement report
- Mark both `payouts` and `settlements` as `reconciled`

---

## Reconciliation Queries

### 1. Account Balances
```sql
SELECT * FROM ledger_balances ORDER BY account_code;
```

### 2. Verify Transaction Balance
All transactions must have debits = credits:
```sql
SELECT
  lt.id,
  lt.transaction_type,
  lt.external_reference,
  SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END) as net_balance
FROM ledger_transactions lt
LEFT JOIN ledger_entries le ON lt.id = le.transaction_id
GROUP BY lt.id, lt.transaction_type, lt.external_reference
HAVING SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END) != 0
ORDER BY lt.posted_at DESC;
```

### 3. Match Bookings to Ledger
```sql
SELECT
  COUNT(tb.id) as booking_count,
  SUM(tb.amount_paid) as booking_total_gmv,
  (SELECT COALESCE(SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE 0 END), 0)
   FROM ledger_entries le
   WHERE le.account_id = (SELECT id FROM ledger_accounts WHERE account_code = 'CASH_INR')) as ledger_cash_total
FROM ticket_bookings tb
WHERE tb.status = 'confirmed'
  AND tb.booked_at >= CURRENT_DATE;
```

### 4. Pending Settlements by Recipient
```sql
SELECT * FROM settlement_summary WHERE status = 'pending' ORDER BY recipient_id;
```

### 5. Unreconciled Payouts
```sql
SELECT
  recipient_id,
  COUNT(*) as payout_count,
  SUM(amount) as total_amount,
  array_agg(status) as statuses
FROM payouts
WHERE status IN ('completed', 'executing') AND updated_at < CURRENT_DATE - INTERVAL '7 days'
GROUP BY recipient_id;
```

---

## Constraints & Guarantees

### Data Integrity

1. **Immutability**: Ledger entries cannot be updated (only inserted or reversed)
2. **Balanced Transactions**: All transactions must have debits = credits
3. **Positive Amounts**: All entry amounts must be > 0
4. **Idempotent Posting**: Duplicate bookings/payouts use idempotency keys
5. **Status Flow**: Explicit state machines for settlements, payouts, refunds, chargebacks
6. **Referential Integrity**: All entries link to valid accounts and transactions

### Constraint Definitions (in migration)

```sql
-- Ledger entries
ALTER TABLE ledger_entries
  ADD CONSTRAINT check_entry_direction CHECK (direction IN ('debit', 'credit'));
ALTER TABLE ledger_entries
  ADD CONSTRAINT check_entry_amount_positive CHECK (amount > 0);

-- Settlements
ALTER TABLE settlements
  ADD CONSTRAINT check_settlement_paid_le_owed CHECK (amount_paid <= amount_owed);

-- Payouts, Refunds, Chargebacks
ALTER TABLE payouts ADD CONSTRAINT check_payout_amount_positive CHECK (amount > 0);
ALTER TABLE refunds ADD CONSTRAINT check_refund_amount_positive CHECK (amount > 0);
ALTER TABLE chargebacks ADD CONSTRAINT check_chargeback_amount_positive CHECK (amount > 0);
```

---

## Indexes & Performance

All high-cardinality and frequently-queried columns have indexes:

| Table               | Index Columns                    | Purpose                      |
|---------------------|---------------------------------|------------------------------|
| ledger_transactions | `posted_at`, `status`, `type`   | Daily batch queries          |
| ledger_entries      | `account_id`, `transaction_id`  | Balance calculations         |
| settlements         | `recipient_id`, `status`        | Recipient payout summary     |
| payouts             | `recipient_id`, `batch_id`      | Batch assembly               |
| refunds             | `booking_id`, `status`          | Refund tracking              |
| chargebacks         | `booking_id`, `external_dispute_id` | Dispute tracking         |

---

## Production Deployment Checklist

- [ ] Run migration `20260513_ledger_foundation.sql` on Supabase
- [ ] Verify all 8 default accounts exist in `ledger_accounts`
- [ ] Test `post_booking_confirmed()` with sample booking
- [ ] Confirm ledger views (`ledger_balances`, `settlement_summary`) are readable
- [ ] Add Supabase function permissions if using RLS
- [ ] Set up daily reconciliation job
- [ ] Create Razorpay webhook handler for disputes/chargebacks
- [ ] Train ops team on settlement/payout batch workflow
- [ ] Document GST, platform fee, and share percentages in config
- [ ] Set up monitoring for ledger imbalances

---

## Future Extensions

1. **Multi-Currency**: Extend ledger to support USD, EUR, etc.
2. **Tax Automation**: Calculate and post GST/TDS automatically
3. **Commission Tiers**: Dynamic commission rates based on event size
4. **Period Close**: Month-end snapshots and tax reporting
5. **Chargeback Insurance**: Track chargeback rates and insurance claims
6. **Analytics Dashboard**: Real-time balance and settlement metrics

