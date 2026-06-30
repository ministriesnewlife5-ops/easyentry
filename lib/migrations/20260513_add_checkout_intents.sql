-- Migration: add checkout_intents table and finalize_checkout_intent function
-- Run this on the Postgres / Supabase DB

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table to store canonical checkout intents (server-side authoritative)
CREATE TABLE IF NOT EXISTS checkout_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  ticket_categories JSONB NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NULL,
  coupon_code TEXT NULL,
  coupon_source_type TEXT NULL,
  coupon_source_id TEXT NULL,
  convenience_fee NUMERIC NOT NULL DEFAULT 0,
  final_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, cancelled, expired
  razorpay_order_id TEXT NULL,
  razorpay_payment_id TEXT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by razorpay order id
CREATE INDEX IF NOT EXISTS idx_checkout_intents_order_id ON checkout_intents(razorpay_order_id);

-- Function to finalize a checkout intent atomically.
-- This will: lock the intent row, verify state/expiry, check and decrement ticket inventory,
-- insert a booking row, optionally increment coupon usage, and mark the intent completed.
CREATE OR REPLACE FUNCTION finalize_checkout_intent(
  in_intent_id UUID,
  in_razorpay_order_id TEXT,
  in_razorpay_payment_id TEXT
) RETURNS TABLE(booking_id UUID) LANGUAGE plpgsql AS $$
DECLARE
  intent_row RECORD;
  ticket JSONB;
  qty INTEGER;
  cat_id TEXT;
  available INTEGER;
  booking_rec RECORD;
  coupon_row RECORD;
BEGIN
  -- Advisory lock using a numeric hash of a key string to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('easyentry_finalize_checkout')::bigint);

  SELECT * INTO intent_row FROM checkout_intents WHERE id = in_intent_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intent not found';
  END IF;

  IF intent_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Intent not pending';
  END IF;

  IF intent_row.expires_at < now() THEN
    RAISE EXCEPTION 'Intent expired';
  END IF;

  -- Check and decrement inventory for each ticket category
  FOR ticket IN SELECT * FROM jsonb_array_elements(intent_row.ticket_categories) LOOP
    cat_id := (ticket->>'id')::text;
    qty := COALESCE((ticket->>'quantity')::int, 0);
    IF qty <= 0 THEN
      CONTINUE;
    END IF;

    -- Try to lock the ticket_categories row for this event and category
    SELECT quantity INTO available FROM ticket_categories
      WHERE event_id = intent_row.event_id AND (id::text = cat_id OR name = ticket->>'name')
      FOR UPDATE;

    IF available IS NULL THEN
      -- If there's no inventory column, assume unlimited
      CONTINUE;
    END IF;

    IF available < qty THEN
      RAISE EXCEPTION 'Not enough inventory for ticket category %', cat_id;
    END IF;

    UPDATE ticket_categories
      SET quantity = quantity - qty
      WHERE event_id = intent_row.event_id AND (id::text = cat_id OR name = ticket->>'name');
  END LOOP;

  -- Insert booking record
  INSERT INTO ticket_bookings(
    user_id, user_email, user_name, event_id, event_title, event_date, event_venue, event_image,
    ticket_categories, total_tickets, amount_paid, coupon_code, coupon_source_type, coupon_source_id,
    coupon_discount_percent, coupon_discount_amount, coupon_source_commission, convenience_fee_amount, payment_id, order_id, status, booked_at
  )
  VALUES (
    intent_row.user_id,
    NULL,
    NULL,
    intent_row.event_id,
    NULL,
    NULL,
    NULL,
    NULL,
    intent_row.ticket_categories,
    (SELECT COALESCE(SUM((item->>'quantity')::int),0) FROM jsonb_array_elements(intent_row.ticket_categories) item),
    intent_row.final_amount,
    intent_row.coupon_code,
    intent_row.coupon_source_type,
    intent_row.coupon_source_id,
    intent_row.discount_percent,
    intent_row.discount_amount,
    COALESCE(intent_row.discount_amount, 0), -- coupon_source_commission: commission earned equals discount amount
    COALESCE(intent_row.convenience_fee, 0) * (SELECT COALESCE(SUM((item->>'quantity')::int),0) FROM jsonb_array_elements(intent_row.ticket_categories) item),
    in_razorpay_payment_id,
    in_razorpay_order_id,
    'confirmed',
    now()
  ) RETURNING id INTO booking_rec;

  -- If global coupon usage needs incrementing, do it here safely
  IF intent_row.coupon_code IS NOT NULL AND intent_row.coupon_source_type IS NOT NULL THEN
    -- Try to increment usage count for global_coupons if present
    UPDATE global_coupons
      SET usage_count = COALESCE(usage_count,0) + 1
      WHERE code = intent_row.coupon_code AND source_id = intent_row.coupon_source_id
      RETURNING id INTO coupon_row;

    IF coupon_row IS NOT NULL THEN
      -- Optionally check max_uses
      PERFORM 1 FROM global_coupons WHERE id = coupon_row.id AND (max_uses IS NULL OR usage_count <= max_uses);
      -- If constraint violated, raise
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Coupon usage limit exceeded';
      END IF;
    END IF;
  END IF;

  -- Mark intent completed
  UPDATE checkout_intents
    SET status = 'completed', razorpay_order_id = in_razorpay_order_id, razorpay_payment_id = in_razorpay_payment_id, updated_at = now()
    WHERE id = in_intent_id;

  -- Post ledger entries for the booking (only if ledger tables exist)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledger_transactions') THEN
    PERFORM post_booking_confirmed(
      booking_rec.id,
      in_razorpay_payment_id,
      intent_row.final_amount,
      COALESCE(intent_row.convenience_fee, 0) * (SELECT COALESCE(SUM((item->>'quantity')::int),0) FROM jsonb_array_elements(intent_row.ticket_categories) item),
      NULL, -- organizer_id (would need to be joined from event)
      0,    -- organizer_share (would need to be calculated)
      NULL, -- promoter_id (would need to be joined from event)
      0,    -- promoter_share (would need to be calculated)
      0     -- gst_amount (would need to be calculated from policy)
    );
  END IF;

  booking_id := booking_rec.id;
  RETURN NEXT;
END;
$$;
