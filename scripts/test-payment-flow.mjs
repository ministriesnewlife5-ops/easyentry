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

const EVENT_ID = 'ec9f292d-a350-48a6-b099-80086fc5bee5';
const QUANTITY = 1;
const PRICE = 100; // as requested
const CONVENIENCE_FEE_PER_TICKET = 175;

function fmt(n) {
  return `₹${Number(n || 0).toFixed(2)}`;
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
      .eq('event_id', EVENT_ID)
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
        platform_fee: CONVENIENCE_FEE_PER_TICKET,
      };
    }

    const artistSharePercent = Number(category.artist_share || 0);
    const influencerSharePercent = Number(category.influencer_share || 0);
    const gstPercent = Number(category.gst_percent || 0);
    const platformFeePerTicket = Number(category.platform_fee ?? CONVENIENCE_FEE_PER_TICKET);

    // Compute amounts
    const basePrice = PRICE * QUANTITY;
    const couponDiscount = coupon ? (basePrice * Number(coupon.discount_percent || 0)) / 100 : 0;
    const subtotalAfterDiscount = Math.max(0, basePrice - couponDiscount);
    const convenienceFee = platformFeePerTicket * QUANTITY;
    const gstAmount = (subtotalAfterDiscount * gstPercent) / 100;
    const customerPaid = subtotalAfterDiscount + convenienceFee + gstAmount;

    const artistCommission = (subtotalAfterDiscount * artistSharePercent) / 100;
    const influencerCommission = (subtotalAfterDiscount * influencerSharePercent) / 100;
    const organizerAmount = subtotalAfterDiscount - artistCommission - influencerCommission;
    const platformFee = convenienceFee;

    console.log('\n--- Money breakdown (computed) ---');
    console.log('Base price:', fmt(basePrice));
    console.log('Coupon discount:', fmt(couponDiscount));
    console.log('Subtotal after discount:', fmt(subtotalAfterDiscount));
    console.log('Convenience/platform fee:', fmt(convenienceFee));
    console.log('GST:', fmt(gstAmount));
    console.log('Customer paid:', fmt(customerPaid));
    console.log('Artist commission:', fmt(artistCommission));
    console.log('Influencer commission:', fmt(influencerCommission));
    console.log('Organizer amount:', fmt(organizerAmount));
    console.log('Platform revenue/fee:', fmt(platformFee));

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
      event_title: null,
      ticket_categories: ticketCategoriesPayload,
      total_tickets: QUANTITY,
      amount_paid: customerPaid,
      coupon_code: coupon ? coupon.code : null,
      coupon_source_type: coupon ? coupon.source_type : null,
      coupon_source_id: coupon ? coupon.source_id : null,
      coupon_source_name: coupon ? coupon.source_name : null,
      coupon_discount_percent: coupon ? coupon.discount_percent : null,
      coupon_discount_amount: couponDiscount,
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
    console.log('Artist commission:', fmt(artistCommission));
    console.log('Organizer amount:', fmt(organizerAmount));
    console.log('Platform fee:', fmt(platformFee));
    console.log('GST:', fmt(gstAmount));

    console.log('\nDone.');
    process.exit(0);
  } catch (err) {
    console.error('Error running test-payment-flow.mjs:', err);
    process.exit(1);
  }
})();
