import { getSupabaseServerClient } from '@/lib/supabase';

export interface GlobalCoupon {
  id: string;
  code: string;
  discountPercent: number;
  sourceType: 'artist' | 'promoter';
  sourceId: string;
  sourceName?: string;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
  usageCount: number;
}

// Raw DB row shape from `global_coupons` table
interface RawGlobalCouponRow {
  id: string;
  code: string;
  discount_percent: number;
  source_type: 'artist' | 'promoter';
  source_id: string;
  source_name?: string | null;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  max_uses?: number | null;
  usage_count: number;
  created_at?: string;
  updated_at?: string | null;
}

function normalizeCode(value?: string): string {
  return value?.trim().toUpperCase() || '';
}

function getCouponStatus(coupon: GlobalCoupon): { valid: boolean; reason?: string } {
  if (!coupon.isActive) {
    return { valid: false, reason: 'Coupon is inactive' };
  }

  const now = Date.now();

  if (coupon.startsAt) {
    const startsAt = new Date(coupon.startsAt).getTime();
    if (Number.isFinite(startsAt) && now < startsAt) {
      return { valid: false, reason: 'Coupon is not active yet' };
    }
  }

  if (coupon.endsAt) {
    const endsAt = new Date(coupon.endsAt).getTime();
    if (Number.isFinite(endsAt) && now > endsAt) {
      return { valid: false, reason: 'Coupon has expired' };
    }
  }

  if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
    return { valid: false, reason: 'Coupon usage limit reached' };
  }

  return { valid: true };
}

/**
 * Fetch a global coupon by code
 */
export async function getGlobalCouponByCode(code: string): Promise<GlobalCoupon | null> {
  try {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode) return null;

    const supabase = getSupabaseServerClient();
    const { data: coupon, error } = await supabase
      .from('global_coupons')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .single();

    if (error || !coupon) return null;

    return {
      id: coupon.id,
      code: coupon.code,
      discountPercent: coupon.discount_percent,
      sourceType: coupon.source_type,
      sourceId: coupon.source_id,
      sourceName: coupon.source_name,
      isActive: coupon.is_active,
      startsAt: coupon.starts_at,
      endsAt: coupon.ends_at,
      maxUses: coupon.max_uses,
      usageCount: coupon.usage_count,
    };
  } catch (error) {
    console.error('Failed to fetch global coupon:', error);
    return null;
  }
}

/**
 * Validate a global coupon for use
 */
export function validateGlobalCoupon(coupon: GlobalCoupon): { valid: boolean; reason?: string } {
  return getCouponStatus(coupon);
}

/**
 * Increment the usage count for a global coupon
 */
export async function incrementGlobalCouponUsage(couponId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc('increment_global_coupon_usage', {
      coupon_id: couponId,
    });

    if (error) {
      console.error('Failed to increment coupon usage via RPC:', error);
      return false;
    }

    return Boolean(data);
  } catch (error) {
    console.error('Failed to increment global coupon usage:', error);
    return false;
  }
}

/**
 * Get all global coupons for a specific artist/promoter
 */
export async function getGlobalCouponsByCreator(
  sourceId: string,
  sourceType: 'artist' | 'promoter'
): Promise<GlobalCoupon[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data: coupons, error } = await supabase
      .from('global_coupons')
      .select('*')
      .eq('source_id', sourceId)
      .eq('source_type', sourceType)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch creator coupons:', error);
      return [];
    }

    return (coupons || []).map((coupon: RawGlobalCouponRow) => ({
      id: coupon.id,
      code: coupon.code,
      discountPercent: coupon.discount_percent,
      sourceType: coupon.source_type,
      sourceId: coupon.source_id,
      sourceName: coupon.source_name,
      isActive: coupon.is_active,
      startsAt: coupon.starts_at,
      endsAt: coupon.ends_at,
      maxUses: coupon.max_uses,
      usageCount: coupon.usage_count,
    }));
  } catch (error) {
    console.error('Failed to fetch global coupons:', error);
    return [];
  }
}
