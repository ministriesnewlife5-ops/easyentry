-- Global Coupons Table
-- Stores coupons created by artists and promoters that work across ALL events

CREATE TABLE IF NOT EXISTS global_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(24) NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('artist', 'promoter')),
  source_id UUID NOT NULL,
  source_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_global_coupon_per_source UNIQUE(code, source_type, source_id),
  CONSTRAINT valid_date_range CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at)
);

-- Indexes for better query performance
CREATE INDEX idx_global_coupons_code ON global_coupons(code);
CREATE INDEX idx_global_coupons_source ON global_coupons(source_type, source_id);
CREATE INDEX idx_global_coupons_active ON global_coupons(is_active) WHERE is_active = true;
CREATE INDEX idx_global_coupons_source_active ON global_coupons(source_type, source_id, is_active);

-- View for easy coupon validation at checkout
CREATE OR REPLACE VIEW global_coupons_valid AS
SELECT 
  id,
  code,
  discount_percent,
  source_type,
  source_id,
  source_name,
  max_uses,
  usage_count,
  (usage_count < COALESCE(max_uses, 999999999)) as can_use
FROM global_coupons
WHERE 
  is_active = true
  AND (starts_at IS NULL OR starts_at <= NOW())
  AND (ends_at IS NULL OR ends_at > NOW());

-- Atomic usage increment helper
-- Returns true when increment succeeds, false when coupon is missing,
-- inactive, out of date range, or max usage has been reached.
CREATE OR REPLACE FUNCTION increment_global_coupon_usage(coupon_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE global_coupons
  SET
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE
    id = coupon_id
    AND is_active = true
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at > NOW())
    AND (max_uses IS NULL OR usage_count < max_uses);

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

-- Comment for documentation
COMMENT ON TABLE global_coupons IS 'Global coupons created by artists and promoters, applicable to all events they perform in or promote';
COMMENT ON COLUMN global_coupons.code IS 'Unique coupon code (3-24 chars, uppercase)';
COMMENT ON COLUMN global_coupons.discount_percent IS 'Discount percentage (1-100)';
COMMENT ON COLUMN global_coupons.source_type IS 'Creator type: artist or promoter';
COMMENT ON COLUMN global_coupons.source_id IS 'User ID of coupon creator';
COMMENT ON COLUMN global_coupons.is_active IS 'Whether coupon is currently active';
COMMENT ON COLUMN global_coupons.max_uses IS 'Maximum number of times coupon can be used (NULL = unlimited)';
COMMENT ON COLUMN global_coupons.usage_count IS 'Number of times coupon has been used';
