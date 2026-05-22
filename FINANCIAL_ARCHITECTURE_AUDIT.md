# Financial Architecture & Settlement Audit

## Current State
EasyEntry already behaves like a merchant-of-record platform:
- Customer pays EasyEntry through Razorpay.
- Booking finalization is now server-authoritative through `checkout_intents` and `finalize_checkout_intent(...)`.
- Promo/commission earnings are derived from confirmed bookings.
- Admin and outlet dashboards still show some operational aggregates, but those are not yet backed by a canonical accounting ledger.

## What Is Trusted Today
The following are the current trust boundaries:
- `published_events` is the canonical public event source.
- `ticket_categories` is the canonical ticket inventory source.
- `checkout_intents` is the canonical pending-payment source.
- `ticket_bookings` is the canonical confirmed-booking source.
- Razorpay payment success is only a trigger; it is not the source of truth for fulfillment.

## Missing Financial Core
The system still lacks a proper settlement layer for:
- platform revenue recognition,
- organizer payable balances,
- promoter / influencer commissions,
- refunds,
- chargebacks,
- payout reconciliation,
- tax / GST separation,
- duplicate settlement prevention.

## Recommended Canonical Ledger Model
Use an append-only double-entry style ledger, even if balances are materialized separately.

### Core Tables
- `ledger_accounts`
  - one row per economic actor or bucket
  - examples: platform cash, platform revenue, organizer payable, promoter payable, refund reserve, GST payable
- `ledger_entries`
  - immutable transaction lines
  - fields: `id`, `transaction_id`, `account_id`, `direction`, `amount`, `currency`, `reference_type`, `reference_id`, `created_at`
- `ledger_transactions`
  - groups a balanced set of entries
  - fields: `id`, `type`, `status`, `source`, `external_reference`, `idempotency_key`, `metadata`, `posted_at`
- `settlements`
  - tracks money owed and money released to organizers / creators / promoters
- `payouts`
  - tracks bank-transfer execution, retry state, and payout provider reference
- `refunds`
  - tracks customer refunds and whether they were partial or full
- `chargebacks`
  - tracks disputes, provisional holds, and final liability outcome

## Event / Money Lifecycle

### 1) Checkout Intent
When a customer starts payment:
- create a `checkout_intent`
- lock the requested ticket quantities logically
- compute final payable amount server-side
- record the expected fee split and coupon impact
- include an idempotency key for the attempt

### 2) Payment Success
When Razorpay succeeds:
- verify signature server-side
- fetch the canonical intent by Razorpay order id
- finalize exactly once through a DB transaction or RPC
- write the booking record
- post ledger entries for gross inflow, platform fee, creator share, tax reserve, and refund reserve

### 3) Settlement Accrual
After booking finalization:
- organizer payable becomes pending
- creator commissions become pending only if business rules allow them
- platform revenue is recognized when policy says it is earned
- GST / tax liabilities are separated from operating revenue

### 4) Payout Execution
When the platform pays out organizers or partners:
- create a payout record first
- move amount from pending payable to paid payable
- store the external payout reference
- make the operation idempotent by payout batch + beneficiary + period

### 5) Refund / Chargeback Handling
On refund or dispute:
- reverse the original booking economics with a new ledger transaction
- do not mutate old entries
- reduce pending payouts or create recovery balances if payout already happened
- keep chargeback outcome separate from refund outcome

## Accounting Rules

### Gross Amount
The customer’s full payment should be posted as gross GMV first.

### Platform Fee
Platform fee should be recognized separately from the settlement owed to others.

### GST / Tax
GST should not be mixed into revenue. Keep it in a dedicated liability account.

### Creator Earnings
Artist / promoter / influencer earnings should be derived from confirmed bookings only, not from estimated views or frontend calculations.

### Coupon Impact
Coupon discount should reduce customer gross collected, but should also be auditable as a separate promotional expense bucket if needed.

## Reconciliation Model
Daily reconciliation should compare:
- Razorpay captured payments,
- internal confirmed bookings,
- ledger transaction totals,
- outstanding settlements,
- executed payouts,
- refunds and chargebacks,
- net platform cash movement.

Minimum reconciliation reports:
- payments received vs bookings finalized,
- bookings finalized vs inventory decremented,
- bookings by coupon vs coupon usage counters,
- payout owed vs payout sent,
- refund requested vs refund completed,
- chargebacks opened vs chargebacks resolved.

## High-Risk Gaps
1. Dashboard metrics can still be misleading if they are derived from incomplete operational data.
2. There is no canonical settlement ledger yet, so balances can only be approximated.
3. Refunds and chargebacks do not yet have a dedicated accounting lifecycle.
4. Payouts to creators / organizers are not yet guarded by idempotent settlement batches.
5. Tax handling is not yet separated from business revenue.
6. Any client-side totals are non-authoritative and should not drive settlements.

## Production-Safe Roadmap

### Phase 1: Truth & Safety
- keep checkout and booking finalization server-authoritative
- remove all random / guessed dashboard numbers
- stop using client-side revenue calculations for money decisions
- add canonical settlement fields to bookings and payment records

### Phase 2: Ledger Foundation
- add ledger tables and immutable postings
- materialize balances for operational speed
- create payout, refund, and chargeback records
- make every money-changing action idempotent

### Phase 3: Reconciliation & Controls
- daily Razorpay reconciliation job
- payout batching and retry logic
- settlement audit reports in admin
- exception queue for mismatches and partial failures

### Phase 4: Scale & Compliance
- tax reporting support
- multi-role payout policies
- partner commission settlements
- period close / month-end accounting snapshots

## Bottom Line
EasyEntry is already close to a safe payment flow, but it is not yet a full financial system. The next required step is a canonical ledger with idempotent settlements, refunds, chargebacks, and reconciliation. Until that exists, dashboard revenue is operationally useful but not accounting-grade.
