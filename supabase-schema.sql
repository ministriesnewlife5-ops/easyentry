-- EasyEntry Supabase Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. APP_USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  name VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. OTP_RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS otp_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add archive columns to app_users if they don't exist
ALTER TABLE app_users 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_records(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_records(expires_at);

-- ============================================
-- 3. APP_SETTINGS TABLE (for browse filters and other settings)
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster settings lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- ============================================
-- 4. VENUE_PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS venue_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location TEXT,
  capacity INTEGER,
  description TEXT,
  amenities JSONB,
  images TEXT[],
  owner_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure amenities supports object JSON payloads used by venue API/store
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'venue_profiles'
      AND column_name = 'amenities'
      AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE venue_profiles
      ALTER COLUMN amenities TYPE JSONB
      USING CASE
        WHEN amenities IS NULL THEN '{}'::jsonb
        ELSE to_jsonb(amenities)
      END;
  END IF;
END $$;

-- ============================================
-- 4. EVENT_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE SET NULL,
  event_type VARCHAR(100),
  expected_attendance INTEGER,
  budget DECIMAL(12, 2),
  requirements TEXT[],
  attachments TEXT[],
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for event request lookups
CREATE INDEX IF NOT EXISTS idx_event_requests_user ON event_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_status ON event_requests(status);
CREATE INDEX IF NOT EXISTS idx_event_requests_date ON event_requests(date);

-- ============================================
-- 5. PUBLISHED_EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS published_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME,
  description TEXT,
  venue_id UUID REFERENCES venue_profiles(id) ON DELETE SET NULL,
  organizer_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  event_type VARCHAR(100),
  category VARCHAR(100),
  image_url TEXT,
  gallery_images TEXT[],
  ticket_price DECIMAL(10, 2),
  ticket_url TEXT,
  max_attendance INTEGER,
  registered_attendees INTEGER DEFAULT 0,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  status VARCHAR(50) DEFAULT 'upcoming',
  social_links JSONB,
  request_id UUID REFERENCES event_requests(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for published event lookups
CREATE INDEX IF NOT EXISTS idx_published_events_date ON published_events(date);
CREATE INDEX IF NOT EXISTS idx_published_events_status ON published_events(status);
CREATE INDEX IF NOT EXISTS idx_published_events_venue ON published_events(venue_id);
CREATE INDEX IF NOT EXISTS idx_published_events_featured ON published_events(is_featured) WHERE is_featured = TRUE;

-- ============================================
-- 6. ADDITIONAL APP TABLES USED BY THE APP
-- ============================================

CREATE TABLE IF NOT EXISTS artist_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  genre TEXT,
  experience_years INTEGER,
  portfolio_url TEXT,
  bio TEXT,
  social_media TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON artist_profiles(user_id);

CREATE TABLE IF NOT EXISTS promoter_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website TEXT,
  experience_years INTEGER,
  notable_events TEXT,
  bio TEXT,
  social_media TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_promoter_profiles_user_id ON promoter_profiles(user_id);

CREATE TABLE IF NOT EXISTS browse_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'Default Filters',
  main_filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  location_filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_browse_filters_active ON browse_filters(is_active);
CREATE INDEX IF NOT EXISTS idx_browse_filters_default ON browse_filters(is_default);

CREATE TABLE IF NOT EXISTS promo_banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_text TEXT,
  cta_link TEXT,
  gradient_from TEXT,
  gradient_to TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_banners_active_order ON promo_banners(is_active, display_order);

CREATE TABLE IF NOT EXISTS ads_banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_text TEXT,
  cta_link TEXT,
  position TEXT NOT NULL DEFAULT 'home_top',
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_banners_position_active_order ON ads_banners(position, is_active, display_order);

CREATE TABLE IF NOT EXISTS user_wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_title TEXT,
  event_date TEXT,
  event_venue TEXT,
  event_price TEXT,
  event_image TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_added ON user_wishlists(user_id, added_at DESC);

CREATE TABLE IF NOT EXISTS hosted_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE,
  venue TEXT,
  price TEXT,
  category TEXT,
  image_url TEXT,
  image_color TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hosted_events_user_created ON hosted_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ticket_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES published_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quantity INTEGER,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_categories_event_id ON ticket_categories(event_id);

-- ============================================
-- 6. TICKET_BOOKINGS TABLE (user purchase history)
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  user_email TEXT,
  user_name TEXT,
  event_id UUID REFERENCES published_events(id) ON DELETE SET NULL,
  event_title TEXT,
  event_date DATE,
  event_venue TEXT,
  event_image TEXT,
  ticket_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_tickets INTEGER NOT NULL DEFAULT 0,
  amount_paid NUMERIC(10, 2) NOT NULL,
  payment_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_bookings_user_booked_at ON ticket_bookings(user_id, booked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_bookings_event_id ON ticket_bookings(event_id);

-- Add archive columns to published_events if they don't exist
ALTER TABLE published_events 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE browse_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosted_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bookings ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for event files
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-files', 'event-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (allow authenticated uploads)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-files');

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'event-files');

-- ============================================
-- SEED DATA: 5 Default Users
-- Password: "Password123" (bcrypt hashed with 10 rounds)
-- Hash: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- ============================================

INSERT INTO app_users (email, hashed_password, role, name, is_verified) VALUES
  ('admin@easyentry.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Admin User', TRUE),
  ('demo@easyentry.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'Demo User', TRUE),
  ('outlet@easyentry.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'outlet_provider', 'Outlet Provider', TRUE),
  ('artist@easyentry.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'artist', 'Artist', TRUE),
  ('influencer@easyentry.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'influencer', 'Influencer', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_app_users_updated_at ON app_users;
CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_venue_profiles_updated_at ON venue_profiles;
CREATE TRIGGER update_venue_profiles_updated_at BEFORE UPDATE ON venue_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_requests_updated_at ON event_requests;
CREATE TRIGGER update_event_requests_updated_at BEFORE UPDATE ON event_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_published_events_updated_at ON published_events;
CREATE TRIGGER update_published_events_updated_at BEFORE UPDATE ON published_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed test users with hashed passwords (Password123)
-- Hashes generated with bcrypt (cost factor 10)
INSERT INTO app_users (email, hashed_password, role, name, is_verified) VALUES
  ('admin@easyentry.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Admin User', true),
  ('artist@easyentry.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'artist', 'Test Artist', true),
  ('promoter@easyentry.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'promoter', 'Test Promoter', true),
  ('outlet@easyentry.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'outlet', 'Test Outlet', true),
  ('user@easyentry.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'Test User', true)
ON CONFLICT (email) DO NOTHING;
