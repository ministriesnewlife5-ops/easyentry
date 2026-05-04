// FILE: app/api/payment/create-order/route.ts
// INTEGRATION POINT FOR GLOBAL COUPONS
// Add this code to the POST handler

import { getGlobalCouponByCode, validateGlobalCoupon } from '@/lib/global-coupons-store';

// ============================================================================
// STEP 1: Add global coupon lookup after event coupon parsing
// ============================================================================

// Around line 150-200, after parsing event's couponRules, add:

async function getApplicableCoupon(
  couponCode: string,
  eventId: string,
  supabase: ReturnType<typeof getSupabaseServerClient>
) {
  const normalizedCode = normalizeCode(couponCode);
  if (!normalizedCode) return null;

  // FIRST: Check event-specific coupons (existing logic)
  const event = await getPublishedEventById(eventId);
  if (event) {
    const eventRules = parseCouponRules(event.social_links);
    const eventRule = eventRules.find((rule) => normalizeCode(rule.code) === normalizedCode);
    
    if (eventRule) {
      const status = getCouponStatus(eventRule);
      if (status.valid) {
        return {
          type: 'event-specific' as const,
          code: eventRule.code,
          discountPercent: eventRule.discountPercent,
          sourceType: eventRule.sourceType,
          sourceId: eventRule.sourceId,
          sourceName: eventRule.sourceName,
        };
      } else if (status.reason) {
        throw new Error(status.reason);
      }
    }
  }

  // SECOND: Check global coupons (new logic)
  const globalCoupon = await getGlobalCouponByCode(normalizedCode);
  if (globalCoupon) {
    const status = validateGlobalCoupon(globalCoupon);
    if (status.valid) {
      return {
        type: 'global' as const,
        code: globalCoupon.code,
        discountPercent: globalCoupon.discountPercent,
        sourceType: globalCoupon.sourceType,
        sourceId: globalCoupon.sourceId,
        sourceName: globalCoupon.sourceName,
        couponId: globalCoupon.id,
      };
    } else if (status.reason) {
      throw new Error(status.reason);
    }
  }

  return null;
}

// ============================================================================
// STEP 2: Update coupon application logic in POST handler
// ============================================================================

// In the POST handler, replace the coupon lookup section:

// BEFORE:
// const couponRule = parseAndValidateCoupon(eventRules, body.couponCode);
// if (couponRule && !getCouponStatus(couponRule).valid) { ... }

// AFTER:
try {
  let applicableCoupon = null;
  if (body.couponCode) {
    applicableCoupon = await getApplicableCoupon(body.couponCode, eventId, supabase);
    if (!applicableCoupon) {
      return NextResponse.json(
        { error: 'Invalid or expired coupon code' },
        { status: 400 }
      );
    }
  }

  // Apply coupon discount (same logic for both types)
  const couponAudit = applicableCoupon ? {
    code: applicableCoupon.code,
    discountPercent: applicableCoupon.discountPercent,
    sourceType: applicableCoupon.sourceType,
    sourceId: applicableCoupon.sourceId,
    sourceName: applicableCoupon.sourceName,
  } : null;

  // Calculate discount amount (existing logic unchanged)
  let discountAmount = 0;
  if (couponAudit) {
    discountAmount = Math.min(
      subtotal * (couponAudit.discountPercent / 100),
      subtotal
    );
  }

  const finalAmount = Math.max(subtotal - discountAmount + convenienceFees, 0);

  // Create Razorpay order with finalAmount
  const razorpayOrder = await razorpayClient.orders.create({
    amount: Math.round(finalAmount * 100),
    currency: 'INR',
    receipt: `order_${eventId}_${Date.now()}`,
  });

  // Increment global coupon usage (if applicable)
  if (applicableCoupon?.type === 'global' && applicableCoupon.couponId) {
    await incrementGlobalCouponUsage(applicableCoupon.couponId);
  }

  return NextResponse.json({
    success: true,
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    couponAudit,
    estimatedDiscount: discountAmount,
    estimatedAmount: finalAmount,
  });

} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Failed to process coupon';
  return NextResponse.json({ error: errorMessage }, { status: 400 });
}

// ============================================================================
// STEP 3: Update payment verification to persist global coupon audit
// ============================================================================

// In POST /api/payment/verify, when inserting ticket_bookings:

// BEFORE:
// const { data: booking } = await supabase.from('ticket_bookings').insert({
//   event_id: eventId,
//   user_id: userId,
//   status: 'confirmed',
//   amount_paid: finalAmount,
//   ...
// });

// AFTER:
const { data: booking } = await supabase.from('ticket_bookings').insert({
  event_id: eventId,
  user_id: userId,
  status: 'confirmed',
  amount_paid: finalAmount,
  // Global coupon audit fields
  coupon_code: couponAudit?.code || null,
  coupon_source_type: couponAudit?.sourceType || null,
  coupon_source_id: couponAudit?.sourceId || null,
  coupon_source_name: couponAudit?.sourceName || null,
  coupon_discount_percent: couponAudit?.discountPercent || null,
  coupon_discount_amount: discountAmount || null,
  // ... rest of booking fields
});

// ============================================================================
// STEP 4: Add necessary imports
// ============================================================================

// At the top of the file, add:
import { getGlobalCouponByCode, validateGlobalCoupon, incrementGlobalCouponUsage } from '@/lib/global-coupons-store';

// ============================================================================
// CHECKLIST
// ============================================================================

/*
 * ✅ Import global coupon helpers
 * ✅ Add getApplicableCoupon() function
 * ✅ Update coupon lookup to check both event-specific and global
 * ✅ Apply discount (same for both types)
 * ✅ Increment global coupon usage count
 * ✅ Persist coupon audit fields in ticket_bookings
 * ✅ Test with event-specific coupon (should still work)
 * ✅ Test with global coupon (new)
 * ✅ Test with both types (global should work on any event)
 * ✅ Test coupon expiry (event and global)
 * ✅ Test max uses limit (event and global)
 * ✅ Verify earnings calculation includes global coupons
 */
