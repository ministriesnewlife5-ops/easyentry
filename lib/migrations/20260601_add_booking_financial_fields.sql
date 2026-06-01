-- Migration: add financial columns to ticket_bookings
-- Run this in your Supabase SQL Editor

ALTER TABLE ticket_bookings
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2) DEFAULT 0;

ALTER TABLE ticket_bookings
  ADD COLUMN IF NOT EXISTS artist_commission NUMERIC(10,2) DEFAULT 0;

ALTER TABLE ticket_bookings
  ADD COLUMN IF NOT EXISTS platform_revenue NUMERIC(10,2) DEFAULT 0;

ALTER TABLE ticket_bookings
  ADD COLUMN IF NOT EXISTS outlet_payout NUMERIC(10,2) DEFAULT 0;

ALTER TABLE ticket_bookings
  ADD COLUMN IF NOT EXISTS gateway_fee NUMERIC(10,2) DEFAULT 0;

NOTIFY pgrst, 'reload schema';
