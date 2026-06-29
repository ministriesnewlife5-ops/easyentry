-- Migration: Add QR code support to ticket_bookings table
-- Run this in Supabase SQL Editor to store QR code data

-- Add QR code columns to ticket_bookings
ALTER TABLE ticket_bookings
ADD COLUMN IF NOT EXISTS qr_code_data JSONB,
ADD COLUMN IF NOT EXISTS qr_code_image TEXT, -- Base64 encoded QR code image
ADD COLUMN IF NOT EXISTS ticket_id TEXT UNIQUE, -- Unique ticket identifier
ADD COLUMN IF NOT EXISTS checksum TEXT; -- QR code verification checksum

-- Create index for quick ticket lookup by ticket_id
CREATE INDEX IF NOT EXISTS idx_ticket_bookings_ticket_id ON ticket_bookings(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_bookings_checksum ON ticket_bookings(checksum);

-- Add comments explaining the QR code fields
COMMENT ON COLUMN ticket_bookings.qr_code_data IS 'Complete QR code data as JSON object containing all ticket information';
COMMENT ON COLUMN ticket_bookings.qr_code_image IS 'Base64 encoded PNG image of the generated QR code';
COMMENT ON COLUMN ticket_bookings.ticket_id IS 'Unique ticket identifier in format EASY-timestamp-hash';
COMMENT ON COLUMN ticket_bookings.checksum IS 'SHA256 checksum for QR code verification (first 16 chars)';
