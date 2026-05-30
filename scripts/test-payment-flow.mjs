#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

const EVENT_ID = 'aa219a44-99df-4bc0-9b4a-cb1536c1db4b';
const QUANTITY = 1;
const PRICE = 100; // as requested
function fmt(n) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

function computeBreakdown({
  basePrice,
  artistSharePercent,
  influencerSharePercent,
  gstPercent,
  platformFeePercent,
  paymentGatewayFeePercent,
  convenienceFeePerTicket,
  quantity,
  coupon,
}) {
  let commissionPercent = 0;
  if (coupon) {
    if (String(coupon.source_type) === 'artist') commissionPercent = artistSharePercent;
    else if (String(coupon.source_type) === 'promoter') commissionPercent = influencerSharePercent;
  }

  const couponDiscount = coupon ? (basePrice * commissionPercent) / 100 : 0;
  const customerPaysBeforeFees = Math.max(0, basePrice - couponDiscount);
  const paymentGatewayFee = customerPaysBeforeFees * (Number(paymentGatewayFeePercent || 0) / 100);
  const platformFee = customerPaysBeforeFees * (Number(platformFeePercent || 0) / 100);
  const gstAmount = (basePrice * gstPercent) / 100;
  const convenienceFeeAmount = Number(convenienceFeePerTicket || 0) * Number(quantity || 0);
  const customerPaid = customerPaysBeforeFees + platformFee + paymentGatewayFee + gstAmount + convenienceFeeAmount;
  const artistCommission = coupon && String(coupon.source_type) === 'artist' ? couponDiscount : 0;
  const influencerCommission = coupon && String(coupon.source_type) === 'promoter' ? couponDiscount : 0;
  const organizerAmount = customerPaysBeforeFees - platformFee;

  return {
    commissionPercent,
    couponDiscount,
    customerPaysBeforeFees,
    platformFee,
    paymentGatewayFee,
    gstAmount,
    convenienceFeePerTicket,
    convenienceFeeAmount,
    customerPaid,
    artistCommission,
    influencerCommission,
    organizerAmount,
  };
}

function printBreakdown(label, breakdown, basePrice) {
  console.log(`\n--- ${label} ---`);
  console.log('Base price:', fmt(basePrice));
  console.log('Coupon discount:', fmt(breakdown.couponDiscount));
  console.log('Subtotal (base - discount):', fmt(breakdown.customerPaysBeforeFees));
  console.log('Payment gateway fee (Razorpay):', fmt(breakdown.paymentGatewayFee));
  console.log('Platform fee:', fmt(breakdown.platformFee));
  console.log('Convenience fee (per ticket):', fmt(breakdown.convenienceFeePerTicket || 0));
  console.log('Convenience fee amount:', fmt(breakdown.convenienceFeeAmount || 0));
  console.log('GST:', fmt(breakdown.gstAmount));
  console.log('Customer paid (final):', fmt(breakdown.customerPaid));
  console.log('Promoter/Artist commission (discount amount):', fmt(breakdown.couponDiscount));
  console.log('Artist commission:', fmt(breakdown.artistCommission));
  console.log('Promoter commission:', fmt(breakdown.influencerCommission));
  console.log('Organizer amount:', fmt(breakdown.organizerAmount));
  console.log('Platform keeps:', fmt(breakdown.platformFee));
  console.log('Razorpay gets:', fmt(breakdown.paymentGatewayFee));
  console.log('GST liability held:', fmt(breakdown.gstAmount));
}

(async function main() {
  try {
    console.log('\n=== EasyEntry: test-payment-flow ===\n');

    // Find a test customer
    let { data: user, error: userErr } = await supabase
      .from('app_users')
      .select('id, email, name')
      .eq('role', 'customer')
      .limit(1)
      .maybeSingle();

    if (userErr) throw userErr;
    if (!user) {
      // fallback to any user
      const { data: anyUser } = await supabase.from('app_users').select('id, email, name').limit(1);
      user = (anyUser && anyUser[0]) || null;
    }

    if (!user) {
      console.error('No users found in app_users. Create a test user first.');
      process.exit(1);
    }

    console.log('Using user:', user.id, user.email || 'no-email');

    // Fetch published event to ensure it exists and obtain canonical id
    const { data: event, error: eventErr } = await supabase
      .from('published_events')
      .select('*')
      .eq('id', EVENT_ID)
      .maybeSingle();

    if (eventErr || !event) {
      console.error('Event not found:', EVENT_ID);
      process.exit(1);
    }

    console.log('Using event:', event.id, event.title || 'no-title');
    const convenienceFeePerTicket = Number(event.convenience_fee || 0);
    console.log('Event convenience fee per ticket:', fmt(convenienceFeePerTicket));

    // Fetch first active global coupon
    const { data: coupons, error: couponErr } = await supabase
      .from('global_coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1);

    if (couponErr) throw couponErr;
    const coupon = (coupons && coupons[0]) || null;

    if (coupon) console.log('Found coupon:', coupon.code, `(${coupon.discount_percent}% )`);
    else console.log('No active coupon found; proceeding without coupon');

    // Read coupon usage_count before
    let couponBefore = null;
    if (coupon && coupon.id) {
      const { data: cb } = await supabase.from('global_coupons').select('id, code, usage_count, max_uses').eq('id', coupon.id).single();
      couponBefore = cb || null;
      console.log('Coupon usage before:', couponBefore?.usage_count ?? 'N/A');
    }

    // Try to find a GENERAL ticket category for the event; fallback to synthetic
    const { data: cats, error: catsErr } = await supabase
      .from('ticket_categories')
      .select('*')
      .eq('event_id', event.id)
      .limit(10);

    if (catsErr) throw catsErr;

    let category = null;
    if (cats && cats.length > 0) {
      category = cats.find(c => String(c.name).toUpperCase().includes('GENERAL')) || cats[0];
    }

    if (!category) {
      console.warn('No ticket category found for event; using fallback values (price 100)');
      category = {
        id: null,
        name: 'GENERAL',
        price: PRICE,
        artist_share: 50,
        influencer_share: 0,
        gst_percent: 0,
        platform_fee: 5,
        payment_gateway_fee: 2,
      };
    }

    const artistSharePercent = Number(category.artist_share || 0);
    const influencerSharePercent = Number(category.influencer_share || 0);
    const gstPercent = Number(category.gst_percent || 0);
    const platformFeePercent = Number(category.platform_fee ?? 0);
    const paymentGatewayFeePercent = Number(category.payment_gateway_fee ?? 0);

    // Compute amounts
    const basePrice = PRICE * QUANTITY;
    const breakdown = computeBreakdown({
      basePrice,
      artistSharePercent,
      influencerSharePercent,
      gstPercent: 0,
      platformFeePercent,
      paymentGatewayFeePercent,
      convenienceFeePerTicket,
      quantity: QUANTITY,
      coupon,
    });

    console.log('\n--- Money breakdown (computed) ---');
    printBreakdown('WITHOUT GST', breakdown, basePrice);

    // Show raw ticket category row for debugging
    if (category) console.log('\nRaw ticket category row:', category);

    // Insert ticket_booking record
    const ticketCategoriesPayload = [
      {
        id: category.id,
        name: category.name,
        quantity: QUANTITY,
        price: PRICE,
        artist_share: artistSharePercent,
        influencer_share: influencerSharePercent,
        gst_percent: gstPercent,
      },
    ];

    const paymentId = `test_payment_${Date.now()}`;
    const orderId = `test_order_${Date.now()}`;

    const bookingPayload = {
      user_id: user.id,
      user_email: user.email || null,
      user_name: user.name || null,
      event_id: EVENT_ID,
      event_title: event.title || null,
      event_date: event.date || null,
      event_venue: (event && event.social_links && event.social_links.venue) || '',
      ticket_categories: ticketCategoriesPayload,
      total_tickets: QUANTITY,
      amount_paid: breakdown.customerPaid,
      convenience_fee_amount: breakdown.convenienceFeeAmount,
      coupon_code: coupon ? coupon.code : null,
      coupon_source_type: coupon ? coupon.source_type : null,
      coupon_source_id: coupon ? coupon.source_id : null,
      coupon_source_name: coupon ? coupon.source_name : null,
      // Record the actual percent used for discount (based on ticket category share)
      coupon_discount_percent: coupon ? breakdown.commissionPercent : null,
      coupon_discount_amount: breakdown.couponDiscount,
      // Commission earned by coupon source (artist/promoter)
      coupon_source_commission: coupon ? breakdown.couponDiscount : 0,
      payment_id: paymentId,
      order_id: orderId,
      status: 'confirmed',
      booked_at: new Date().toISOString(),
    };

    const { data: insertedBooking, error: insertErr } = await supabase
      .from('ticket_bookings')
      .insert([bookingPayload])
      .select('*')
      .single();

    if (insertErr) {
      console.error('Failed to insert ticket_booking:', insertErr);
      process.exit(1);
    }

    console.log('\nInserted booking:');
    console.log(insertedBooking);

    // If coupon exists, increment usage_count
    if (coupon && coupon.id) {
      const prev = (couponBefore && couponBefore.usage_count) ? Number(couponBefore.usage_count) : 0;
      const newCount = prev + 1;
      const { data: updatedCoupon, error: updErr } = await supabase
        .from('global_coupons')
        .update({ usage_count: newCount })
        .eq('id', coupon.id)
        .select('id, code, usage_count, max_uses')
        .single();

      if (updErr) {
        console.error('Failed to update coupon usage_count:', updErr);
      } else {
        console.log('\nCoupon usage updated: before=', prev, 'after=', updatedCoupon.usage_count);
      }
    }

    // Final summary
    console.log('\n=== SUMMARY ===');
    console.log('Booking ID:', insertedBooking.id);
    console.log('Customer paid:', fmt(insertedBooking.amount_paid));
    console.log('Coupon used:', insertedBooking.coupon_code || 'None');
    console.log('Coupon discount amount:', fmt(insertedBooking.coupon_discount_amount || 0));
    console.log('Artist commission:', fmt(breakdown.artistCommission));
    console.log('Organizer amount:', fmt(breakdown.organizerAmount));
    console.log('Razorpay fee:', fmt(breakdown.paymentGatewayFee));
    console.log('Platform fee:', fmt(breakdown.platformFee));
    console.log('GST:', fmt(breakdown.gstAmount));

    // GST validation case: reuse the same booking inputs, but simulate GST at 18%
    const gst18Breakdown = computeBreakdown({
      basePrice,
      artistSharePercent,
      influencerSharePercent,
      gstPercent: 18,
      platformFeePercent,
      paymentGatewayFeePercent,
      convenienceFeePerTicket,
      quantity: QUANTITY,
      coupon,
    });

    printBreakdown('WITH GST (18%)', gst18Breakdown, basePrice);
    console.log('GST formula check:', `${fmt(basePrice)} × 18% = ${fmt(gst18Breakdown.gstAmount)}`);
    console.log('Customer pays formula check:', `(${fmt(basePrice)} - ${fmt(gst18Breakdown.couponDiscount)}) + ${fmt(gst18Breakdown.platformFee)} + ${fmt(gst18Breakdown.paymentGatewayFee)} + ${fmt(gst18Breakdown.gstAmount)} = ${fmt(gst18Breakdown.customerPaid)}`);

    console.log('\nDone.');
    process.exit(0);
  } catch (err) {
    console.error('Error running test-payment-flow.mjs:', err);
    process.exit(1);
  }
})();
