-- ============================================================
-- EasyEntry: Add commission + ticket detail columns to event_requests
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE event_requests
  ADD COLUMN IF NOT EXISTS outlet_name         TEXT,
  ADD COLUMN IF NOT EXISTS outlet_email        TEXT,
  ADD COLUMN IF NOT EXISTS event_data          JSONB,
  ADD COLUMN IF NOT EXISTS ticket_categories   JSONB,
  ADD COLUMN IF NOT EXISTS commission_percent  NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_total_revenue    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS estimated_total_commission NUMERIC(12,2);

-- Refresh PostgREST schema cache so the API sees the new columns immediately
NOTIFY pgrst, 'reload schema';

-- Optional: index for faster outlet lookups
CREATE INDEX IF NOT EXISTS idx_event_requests_user_id
  ON event_requests (user_id);

-- Optional: index for status filtering
CREATE INDEX IF NOT EXISTS idx_event_requests_status
  ON event_requests (status);
