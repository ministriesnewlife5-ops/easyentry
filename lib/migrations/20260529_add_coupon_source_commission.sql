-- Migration: add coupon_source_commission to ticket_bookings
ALTER TABLE ticket_bookings
  ADD COLUMN IF NOT EXISTS coupon_source_commission NUMERIC(10,2) DEFAULT 0;

-- Backfill existing rows with 0 to be explicit (no-op if already 0)
UPDATE ticket_bookings SET coupon_source_commission = COALESCE(coupon_source_commission, 0) WHERE coupon_source_commission IS NULL;
