-- EasyEntry additional Supabase tables
-- Run this after supabase-schema.sql on fresh environments.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Artist profiles
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

-- ============================================
-- Promoter profiles
-- ============================================
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

-- ============================================
-- Browse filters
-- ============================================
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

-- ============================================
-- Promo banners
-- ============================================
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

-- ============================================
-- Ads banners
-- ============================================
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

-- ============================================
-- User wishlists
-- ============================================
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

-- ============================================
-- Hosted events (draft/pending hosted event list)
-- ============================================
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

-- ============================================
-- Ticket categories for published events
-- ============================================
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
-- Ticket bookings (user purchase history)
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
  payment_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (payment_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_bookings_user_booked_at ON ticket_bookings(user_id, booked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_bookings_event_id ON ticket_bookings(event_id);
