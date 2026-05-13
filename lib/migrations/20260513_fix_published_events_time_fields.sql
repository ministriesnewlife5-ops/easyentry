-- Migration: add start_time, end_time, and event_time_label to published_events
-- Run this on the Postgres / Supabase DB

ALTER TABLE IF EXISTS published_events
  ADD COLUMN IF NOT EXISTS start_time TIME;

ALTER TABLE IF EXISTS published_events
  ADD COLUMN IF NOT EXISTS end_time TIME;

ALTER TABLE IF EXISTS published_events
  ADD COLUMN IF NOT EXISTS event_time_label TEXT;

-- Backfill start_time from existing time column when available
UPDATE published_events
SET start_time = time::time
WHERE start_time IS NULL AND time IS NOT NULL;

-- Note: existing rows that failed due to invalid time ranges must be retried from application logs / source requests.
