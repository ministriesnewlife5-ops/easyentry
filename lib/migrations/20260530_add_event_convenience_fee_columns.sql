-- Migration: add per-event convenience fee columns
-- Run this in your Supabase SQL Editor

ALTER TABLE published_events
  ADD COLUMN IF NOT EXISTS convenience_fee NUMERIC(10,2) DEFAULT 0;

ALTER TABLE published_events
  ADD COLUMN IF NOT EXISTS pay_at_venue_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE event_requests
  ADD COLUMN IF NOT EXISTS convenience_fee NUMERIC(10,2) DEFAULT 0;

ALTER TABLE event_requests
  ADD COLUMN IF NOT EXISTS pay_at_venue_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE ticket_bookings
  ADD COLUMN IF NOT EXISTS convenience_fee_amount NUMERIC(10,2) DEFAULT 0;

ALTER TABLE ticket_bookings
  ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10,2) DEFAULT 0;

ALTER TABLE ticket_bookings
  ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'online';

NOTIFY pgrst, 'reload schema';
