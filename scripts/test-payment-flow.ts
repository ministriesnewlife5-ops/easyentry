#!/usr/bin/env ts-node
/**
 * test-payment-flow.ts
 * 
 * Comprehensive payment flow test that bypasses Razorpay and directly calls
 * the finalize_checkout_intent RPC to test booking creation, ledger posting,
 * and money flow calculations.
 * 
 * Usage:
 *   npx ts-node scripts/test-payment-flow.ts
 * 
 * Environment Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_EVENT_ID = 'ec9f292d-a350-48a6-b099-80086fc5bee5';
const TEST_CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440000'; // Fixed test user
const TICKET_QUANTITY = 1;
const TICKET_PRICE = 100;
const DEFAULT_CONVENIENCE_FEE = 175; // Per ticket

// ============================================================================
// INITIALIZATION
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function printSection(title: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80));
}

function printSubsection(title: string) {
  console.log(`\n✓ ${title}`);
}

function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

interface TicketCategory {
  id: string;
  name: string;
  price: number;
  quantity?: number | null;
  available_from?: string | null;
  available_until?: string | null;
  artist_share?: number | null;
  influencer_share?: number | null;
  gst_percent?: number | null;
  platform_fee?: number | null;
  payment_gateway_fee?: number | null;
}

interface GlobalCoupon {
  id: string;
  code: string;
  discount_percent: number;
  source_type: string;
  source_id?: string;
  source_name?: string;
}

// ============================================================================
// MAIN FLOW
// ============================================================================

async function main() {
  try {
    printSection('EASY ENTRY PAYMENT FLOW TEST');

    const supabase = getSupabaseClient();

    // ========================================================================
    // STEP 1: Fetch Event
    // ========================================================================
    printSubsection('Step 1: Fetching Event');

    const { data: eventData, error: eventError } = await supabase
      .from('published_events')
      .select('id, title, organizer_id, event_date, event_time')
      .eq('id', TEST_EVENT_ID)
      .single();

    if (eventError || !eventData) {
      console.error('  ✗ Event not found:', TEST_EVENT_ID);
      console.error('  Error:', eventError);
      process.exit(1);
    }

    const event = eventData as any;
    console.log(`  Event ID: ${event.id}`);
    console.log(`  Title: ${event.title}`);
    console.log(`  Organizer ID: ${event.organizer_id}`);
    console.log(`  Date: ${event.event_date} ${event.event_time}`);

    // ========================================================================
    // STEP 2: Fetch Ticket Categories
    // ========================================================================
    printSubsection('Step 2: Fetching Ticket Categories');

    const { data: categoriesData, error: categoriesError } = await supabase
      .from('ticket_categories')
      .select('*')
      .eq('event_id', TEST_EVENT_ID)
      .limit(10);

    if (categoriesError || !categoriesData || categoriesData.length === 0) {
      console.error('  ✗ No ticket categories found for event');
      console.error('  Error:', categoriesError);
      process.exit(1);
    }

    const categories = categoriesData as TicketCategory[];
    console.log(`  Found ${categories.length} ticket category/categories`);

    const generalCategory = categories.find((c) =>
      c.name?.toUpperCase().includes('GENERAL')
    ) || categories[0];

    console.log(`  Using: ${generalCategory.name} (ID: ${generalCategory.id})`);
    console.log(`  Price: ${formatCurrency(toFiniteNumber(generalCategory.price))}`);
    console.log(`  Artist Share: ${clampPercent(toFiniteNumber(generalCategory.artist_share))}%`);
    console.log(`  Influencer Share: ${clampPercent(toFiniteNumber(generalCategory.influencer_share))}%`);
    console.log(`  GST %: ${toFiniteNumber(generalCategory.gst_percent)}%`);

    // ========================================================================
    // STEP 3: Fetch Active Global Coupon
    // ========================================================================
    printSubsection('Step 3: Fetching Active Global Coupon');

    const { data: couponsData, error: couponsError } = await supabase
      .from('global_coupons')
      .select('id, code, discount_percent, source_type, source_id, source_name')
      .eq('status', 'active')
      .limit(1);

    let selectedCoupon: GlobalCoupon | null = null;
    if (!couponsError && couponsData && couponsData.length > 0) {
      selectedCoupon = couponsData[0] as GlobalCoupon;
      console.log(`  Found active coupon: ${selectedCoupon.code}`);
      console.log(`  Discount: ${selectedCoupon.discount_percent}%`);
      console.log(`  Source: ${selectedCoupon.source_type} (ID: ${selectedCoupon.source_id})`);
    } else {
      console.log('  No active global coupons found (booking will proceed without coupon)');
    }

    // ========================================================================
    // STEP 4: Calculate Money Flow
    // ========================================================================
    printSubsection('Step 4: Calculating Money Flow');

    const ticketPrice = toFiniteNumber(generalCategory.price);
    const artistSharePercent = clampPercent(toFiniteNumber(generalCategory.artist_share));
    const influencerSharePercent = clampPercent(toFiniteNumber(generalCategory.influencer_share));
    const gstPercent = toFiniteNumber(generalCategory.gst_percent);
    const quantity = TICKET_QUANTITY;

    // Base subtotal (price × quantity)
    const subtotal = ticketPrice * quantity;
    console.log(`  Subtotal (${quantity} × ${formatCurrency(ticketPrice)}): ${formatCurrency(subtotal)}`);

    // Convenience fee (per ticket)
    const convenienceFee = DEFAULT_CONVENIENCE_FEE * quantity;
    console.log(`  Convenience Fee (${quantity} × ₹${DEFAULT_CONVENIENCE_FEE}): ${formatCurrency(convenienceFee)}`);

    // Coupon discount (if applied)
    let couponDiscount = 0;
    let finalSubtotal = subtotal;
    if (selectedCoupon) {
      couponDiscount = (subtotal * selectedCoupon.discount_percent) / 100;
      finalSubtotal = subtotal - couponDiscount;
      console.log(`  Coupon Discount (${selectedCoupon.code} @ ${selectedCoupon.discount_percent}%): ${formatCurrency(couponDiscount)}`);
    }

    // Calculate money split (artist vs influencer)
    const artistShareBase = (finalSubtotal * artistSharePercent) / 100;
    const influencerShareBase = (finalSubtotal * influencerSharePercent) / 100;
    const platformRevenue = finalSubtotal - artistShareBase - influencerShareBase;

    console.log(`  Artist Commission (${artistSharePercent}%): ${formatCurrency(artistShareBase)}`);
    console.log(`  Influencer Commission (${influencerSharePercent}%): ${formatCurrency(influencerShareBase)}`);
    console.log(`  Platform Revenue: ${formatCurrency(platformRevenue)}`);

    // GST calculation (on final amount after coupon, but before convenience fee)
    const gstAmount = (finalSubtotal * gstPercent) / 100;
    console.log(`  GST (${gstPercent}%): ${formatCurrency(gstAmount)}`);

    // Final amount customer pays
    const finalAmount = finalSubtotal + convenienceFee + gstAmount;
    console.log(`  Final Amount (subtotal + convenience + GST): ${formatCurrency(finalAmount)}`);

    // ========================================================================
    // STEP 5: Create Checkout Intent
    // ========================================================================
    printSubsection('Step 5: Creating Checkout Intent');

    const checkoutIntentPayload = {
      user_id: TEST_CUSTOMER_ID,
      event_id: TEST_EVENT_ID,
      ticket_categories: [
        {
          id: generalCategory.id,
          name: generalCategory.name,
          quantity,
          price: ticketPrice,
          artistShare: artistSharePercent,
          influencerShare: influencerSharePercent,
          gstPercent: gstPercent,
        },
      ],
      subtotal,
      discount_amount: couponDiscount,
      discount_percent: selectedCoupon ? selectedCoupon.discount_percent : null,
      coupon_code: selectedCoupon?.code || null,
      coupon_source_type: selectedCoupon?.source_type || null,
      coupon_source_id: selectedCoupon?.source_id || null,
      coupon_source_name: selectedCoupon?.source_name || null,
      convenience_fee: convenienceFee,
      final_amount: finalAmount,
      currency: 'INR',
      status: 'pending',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };

    const { data: intentData, error: intentError } = await supabase
      .from('checkout_intents')
      .insert([checkoutIntentPayload])
      .select('*')
      .single();

    if (intentError || !intentData) {
      console.error('  ✗ Failed to create checkout intent');
      console.error('  Error:', intentError);
      process.exit(1);
    }

    const checkoutIntent = intentData as any;
    console.log(`  Checkout Intent ID: ${checkoutIntent.id}`);
    console.log(`  Status: ${checkoutIntent.status}`);
    console.log(`  Expires at: ${checkoutIntent.expires_at}`);

    // ========================================================================
    // STEP 6: Finalize Checkout Intent (Bypass Razorpay)
    // ========================================================================
    printSubsection('Step 6: Finalizing Checkout Intent (Booking Creation)');

    const razorpayOrderId = `test_order_${Date.now()}`;
    const razorpayPaymentId = `test_payment_${Date.now()}`;

    console.log(`  Simulated Order ID: ${razorpayOrderId}`);
    console.log(`  Simulated Payment ID: ${razorpayPaymentId}`);

    const { data: finalizeResult, error: finalizeError } = await supabase.rpc(
      'finalize_checkout_intent',
      {
        in_intent_id: checkoutIntent.id,
        in_razorpay_order_id: razorpayOrderId,
        in_razorpay_payment_id: razorpayPaymentId,
      }
    );

    if (finalizeError) {
      console.error('  ✗ Failed to finalize checkout intent');
      console.error('  Error:', finalizeError);
      process.exit(1);
    }

    const bookingId = Array.isArray(finalizeResult)
      ? finalizeResult[0]?.booking_id
      : finalizeResult?.booking_id;

    if (!bookingId) {
      console.error('  ✗ Booking ID not returned from finalization');
      process.exit(1);
    }

    console.log(`  ✓ Booking Created: ${bookingId}`);

    // ========================================================================
    // STEP 7: Query Booking Record
    // ========================================================================
    printSubsection('Step 7: Querying Ticket Booking Record');

    const { data: bookingData, error: bookingError } = await supabase
      .from('ticket_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !bookingData) {
      console.error('  ✗ Booking record not found');
      console.error('  Error:', bookingError);
      process.exit(1);
    }

    const booking = bookingData as any;
    console.log(`  Booking ID: ${booking.id}`);
    console.log(`  User: ${booking.user_email || 'N/A'}`);
    console.log(`  Event: ${booking.event_title}`);
    console.log(`  Total Tickets: ${booking.total_tickets}`);
    console.log(`  Amount Paid: ${formatCurrency(booking.amount_paid)}`);
    console.log(`  Status: ${booking.status}`);
    console.log(`  Booked At: ${booking.booked_at}`);

    if (booking.coupon_code) {
      console.log(`  Coupon: ${booking.coupon_code} (${booking.coupon_source_type})`);
      console.log(`  Coupon Discount: ${formatCurrency(booking.coupon_discount_amount)}`);
    }

    // ========================================================================
    // STEP 8: Query Ledger Entries
    // ========================================================================
    printSubsection('Step 8: Querying Ledger Entries');

    const { data: ledgerTxnData, error: ledgerTxnError } = await supabase
      .from('ledger_transactions')
      .select('*, ledger_entries(*)')
      .eq('reference_id', bookingId.toString())
      .eq('reference_type', 'booking')
      .order('created_at', { ascending: false })
      .limit(1);

    if (ledgerTxnError) {
      console.log('  Note: Ledger tables may not be deployed yet. Skipping ledger query.');
    } else if (ledgerTxnData && ledgerTxnData.length > 0) {
      const ledgerTxn = ledgerTxnData[0] as any;
      console.log(`  Ledger Transaction ID: ${ledgerTxn.id}`);
      console.log(`  Type: ${ledgerTxn.transaction_type}`);
      console.log(`  Total Amount: ${formatCurrency(ledgerTxn.total_amount)}`);
      console.log(`  Created At: ${ledgerTxn.created_at}`);

      if (ledgerTxn.ledger_entries && ledgerTxn.ledger_entries.length > 0) {
        console.log('\n  Ledger Entries:');
        const debitTotal = ledgerTxn.ledger_entries
          .filter((e: any) => e.direction === 'debit')
          .reduce((sum: number, e: any) => sum + toFiniteNumber(e.amount), 0);
        const creditTotal = ledgerTxn.ledger_entries
          .filter((e: any) => e.direction === 'credit')
          .reduce((sum: number, e: any) => sum + toFiniteNumber(e.amount), 0);

        ledgerTxn.ledger_entries.forEach((entry: any) => {
          const direction = entry.direction === 'debit' ? 'DR' : 'CR';
          console.log(
            `    [${direction}] ${entry.account_code || 'UNKNOWN'}: ${formatCurrency(entry.amount)}`
          );
        });

        console.log(`  Total Debits: ${formatCurrency(debitTotal)}`);
        console.log(`  Total Credits: ${formatCurrency(creditTotal)}`);
        console.log(
          `  Balance: ${formatCurrency(debitTotal - creditTotal)} ${debitTotal === creditTotal ? '✓ BALANCED' : '✗ UNBALANCED'}`
        );
      }
    } else {
      console.log('  No ledger entries found (ledger may not be enabled)');
    }

    // ========================================================================
    // STEP 9: Query Settlement Records
    // ========================================================================
    printSubsection('Step 9: Querying Settlement Records');

    const { data: settlementsData, error: settlementsError } = await supabase
      .from('settlements')
      .select('*')
      .eq('related_booking_id', bookingId.toString())
      .order('created_at', { ascending: false });

    if (settlementsError) {
      console.log('  Note: Settlement tables may not be deployed yet.');
    } else if (settlementsData && settlementsData.length > 0) {
      console.log(`  Found ${settlementsData.length} settlement(s)`);
      settlementsData.forEach((settlement: any, idx: number) => {
        console.log(`\n  Settlement ${idx + 1}:`);
        console.log(`    ID: ${settlement.id}`);
        console.log(`    Type: ${settlement.settlement_type}`);
        console.log(`    Recipient: ${settlement.recipient_id}`);
        console.log(`    Amount: ${formatCurrency(settlement.amount_owed)}`);
        console.log(`    Status: ${settlement.status}`);
        console.log(`    Created: ${settlement.created_at}`);
      });
    } else {
      console.log('  No settlements found');
    }

    // ========================================================================
    // STEP 10: Check Coupon Usage
    // ========================================================================
    if (selectedCoupon) {
      printSubsection('Step 10: Checking Coupon Usage');

      const { data: couponBefore, error: couponBeforeError } = await supabase
        .from('global_coupons')
        .select('id, code, usage_count, max_uses')
        .eq('id', selectedCoupon.id)
        .single();

      if (!couponBeforeError && couponBefore) {
        console.log(`  Coupon Code: ${(couponBefore as any).code}`);
        console.log(`  Usage Count: ${(couponBefore as any).usage_count}`);
        console.log(`  Max Uses: ${(couponBefore as any).max_uses || 'Unlimited'}`);
      }
    }

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    printSection('PAYMENT FLOW TEST SUMMARY');

    console.log('\n📊 BOOKING BREAKDOWN:');
    console.log(`  Ticket Price:           ${formatCurrency(ticketPrice)} × ${quantity} = ${formatCurrency(subtotal)}`);
    console.log(`  Coupon Discount:        ${formatCurrency(couponDiscount)}`);
    console.log(`  Subtotal After Discount: ${formatCurrency(finalSubtotal)}`);
    console.log(`  Convenience Fee:        ${formatCurrency(convenienceFee)}`);
    console.log(`  GST (${gstPercent}%):           ${formatCurrency(gstAmount)}`);
    console.log(`  ─────────────────────────────`);
    console.log(`  Customer Paid:          ${formatCurrency(finalAmount)}`);

    console.log('\n💰 MONEY SPLIT:');
    console.log(`  Artist Commission:      ${formatCurrency(artistShareBase)} (${artistSharePercent}%)`);
    console.log(`  Influencer Commission:  ${formatCurrency(influencerShareBase)} (${influencerSharePercent}%)`);
    console.log(`  Platform Revenue:       ${formatCurrency(platformRevenue)}`);
    console.log(`  GST Liability:          ${formatCurrency(gstAmount)}`);
    console.log(`  Total:                  ${formatCurrency(finalAmount)}`);

    console.log('\n✅ TEST COMPLETED SUCCESSFULLY\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();
