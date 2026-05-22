/**
 * Admin Settlement Dashboard API
 * 
 * GET /api/admin/settlements/dashboard
 * 
 * Returns financial summary for admin dashboard:
 * - Total gross collected
 * - Platform earned revenue
 * - Pending organizer payouts
 * - Pending promoter payouts
 * - Refunded amount
 * - Chargeback exposure
 * 
 * Requires: admin role
 * Query params:
 *   - date_from: ISO date (default: 30 days ago)
 *   - date_to: ISO date (default: today)
 *   - include_breakdowns: boolean (default: false) - include daily breakdown
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface SettlementDashboard {
  period: {
    from: string;
    to: string;
  };
  financials: {
    gross_collected: number;
    platform_fee_earned: number;
    pending_organizer_payouts: number;
    pending_promoter_payouts: number;
    refunded_amount: number;
    chargeback_exposure: number;
    net_cash_available: number;
  };
  settlement_summary: {
    total_pending_settlements: number;
    pending_organizer_count: number;
    pending_promoter_count: number;
    paid_settlements_count: number;
  };
  payout_summary: {
    pending_payouts_count: number;
    pending_amount: number;
    completed_payouts_count: number;
    completed_amount: number;
    failed_payouts_count: number;
    failed_amount: number;
  };
  refund_summary: {
    pending_refunds_count: number;
    pending_refund_amount: number;
    completed_refunds_count: number;
    completed_refund_amount: number;
    failed_refunds_count: number;
    failed_refund_amount: number;
  };
  chargeback_summary: {
    open_disputes_count: number;
    open_amount: number;
    investigating_count: number;
    investigating_amount: number;
    won_count: number;
    won_amount: number;
    lost_count: number;
    lost_amount: number;
  };
  daily_breakdown?: {
    date: string;
    gross_collected: number;
    fees_earned: number;
    settlement_created: number;
    refunds_issued: number;
    chargebacks_received: number;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const includeBreakdowns = searchParams.get('include_breakdowns') === 'true';

    // Default to last 30 days
    const endDate = dateTo ? new Date(dateTo) : new Date();
    const startDate = dateFrom ? new Date(dateFrom) : new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);

    const dateFromStr = startDate.toISOString().split('T')[0];
    const dateToStr = endDate.toISOString().split('T')[0];

    // Query 1: Gross collected from bookings
    const { data: bookingData, error: bookingError } = await supabase.rpc(
      'get_financial_summary',
      {
        date_from: dateFromStr,
        date_to: dateToStr
      }
    );

    if (bookingError) {
      console.error('Error fetching booking summary:', bookingError);
    }

    // Query 2: Settlement summary
    const { data: settlementData } = await supabase
      .from('settlements')
      .select('status, settlement_type, amount_owed, amount_paid')
      .gte('created_at', dateFromStr)
      .lte('created_at', dateToStr);

    // Query 3: Refund summary
    const { data: refundData } = await supabase
      .from('refunds')
      .select('status, amount')
      .gte('created_at', dateFromStr)
      .lte('created_at', dateToStr);

    // Query 4: Chargeback summary
    const { data: chargebackData } = await supabase
      .from('chargebacks')
      .select('status, outcome, amount')
      .gte('created_at', dateFromStr)
      .lte('created_at', dateToStr);

    // Query 5: Payout summary
    const { data: payoutData } = await supabase
      .from('payouts')
      .select('status, amount')
      .gte('created_at', dateFromStr)
      .lte('created_at', dateToStr);

    // Query 6: Ledger balances (for cash and revenue)
    const { data: ledgerBalances } = await supabase
      .from('ledger_balances')
      .select('account_code, balance');

    // Process ledger data
    const ledgerMap = new Map(
      (ledgerBalances || []).map((row: any) => [row.account_code, row.balance])
    );

    const platformCash = ledgerMap.get('CASH_INR') || 0;
    const platformRevenue = ledgerMap.get('REVENUE_PLATFORM_FEE') || 0;
    const organizerPayable = ledgerMap.get('PAYABLE_ORGANIZER') || 0;
    const promoterPayable = ledgerMap.get('PAYABLE_PROMOTER') || 0;
    const gstPayable = ledgerMap.get('PAYABLE_GST') || 0;
    const refundReserve = ledgerMap.get('RESERVE_REFUND') || 0;

    // Calculate gross collected from bookings or ledger
    const grossCollected =
      (bookingData?.gross_collected as number) || platformCash;

    // Calculate settlement totals
    let pendingOrganizerPayouts = 0;
    let pendingPromoterPayouts = 0;
    let totalPendingSettlements = 0;
    let pendingOrganizerCount = 0;
    let pendingPromoterCount = 0;
    let paidSettlementsCount = 0;

    (settlementData || []).forEach((settlement: any) => {
      if (settlement.status === 'pending') {
        totalPendingSettlements += settlement.amount_owed;
        if (settlement.settlement_type === 'organizer') {
          pendingOrganizerPayouts += settlement.amount_owed;
          pendingOrganizerCount++;
        } else if (settlement.settlement_type === 'promoter') {
          pendingPromoterPayouts += settlement.amount_owed;
          pendingPromoterCount++;
        }
      } else if (settlement.status === 'paid') {
        paidSettlementsCount++;
      }
    });

    // Calculate refund totals
    let pendingRefundsAmount = 0;
    let completedRefundsAmount = 0;
    let failedRefundsAmount = 0;
    let pendingRefundsCount = 0;
    let completedRefundsCount = 0;
    let failedRefundsCount = 0;

    (refundData || []).forEach((refund: any) => {
      if (refund.status === 'pending' || refund.status === 'processing') {
        pendingRefundsAmount += refund.amount;
        pendingRefundsCount++;
      } else if (refund.status === 'completed') {
        completedRefundsAmount += refund.amount;
        completedRefundsCount++;
      } else if (refund.status === 'failed') {
        failedRefundsAmount += refund.amount;
        failedRefundsCount++;
      }
    });

    // Calculate chargeback totals
    let openDisputesAmount = 0;
    let investigatingAmount = 0;
    let wonAmount = 0;
    let lostAmount = 0;
    let openDisputesCount = 0;
    let investigatingCount = 0;
    let wonCount = 0;
    let lostCount = 0;

    (chargebackData || []).forEach((chargeback: any) => {
      if (chargeback.status === 'opened') {
        openDisputesAmount += chargeback.amount;
        openDisputesCount++;
      } else if (chargeback.status === 'investigating') {
        investigatingAmount += chargeback.amount;
        investigatingCount++;
      } else if (chargeback.outcome === 'won') {
        wonAmount += chargeback.amount;
        wonCount++;
      } else if (chargeback.outcome === 'lost') {
        lostAmount += chargeback.amount;
        lostCount++;
      }
    });

    // Calculate payout totals
    let pendingPayoutsAmount = 0;
    let completedPayoutsAmount = 0;
    let failedPayoutsAmount = 0;
    let pendingPayoutsCount = 0;
    let completedPayoutsCount = 0;
    let failedPayoutsCount = 0;

    (payoutData || []).forEach((payout: any) => {
      if (payout.status === 'pending' || payout.status === 'executing') {
        pendingPayoutsAmount += payout.amount;
        pendingPayoutsCount++;
      } else if (payout.status === 'completed') {
        completedPayoutsAmount += payout.amount;
        completedPayoutsCount++;
      } else if (payout.status === 'failed') {
        failedPayoutsAmount += payout.amount;
        failedPayoutsCount++;
      }
    });

    // Calculate net cash available
    // Cash = CASH_INR - PAYABLE_ORGANIZER - PAYABLE_PROMOTER - PAYABLE_GST - pending refunds
    const netCashAvailable =
      platformCash -
      organizerPayable -
      promoterPayable -
      gstPayable -
      pendingRefundsAmount;

    // Build response
    const dashboard: SettlementDashboard = {
      period: {
        from: dateFromStr,
        to: dateToStr
      },
      financials: {
        gross_collected: Math.round(grossCollected * 100) / 100,
        platform_fee_earned: Math.round(platformRevenue * 100) / 100,
        pending_organizer_payouts: Math.round(pendingOrganizerPayouts * 100) / 100,
        pending_promoter_payouts: Math.round(pendingPromoterPayouts * 100) / 100,
        refunded_amount: Math.round(completedRefundsAmount * 100) / 100,
        chargeback_exposure: Math.round((openDisputesAmount + investigatingAmount) * 100) / 100,
        net_cash_available: Math.round(netCashAvailable * 100) / 100
      },
      settlement_summary: {
        total_pending_settlements: Math.round(totalPendingSettlements * 100) / 100,
        pending_organizer_count: pendingOrganizerCount,
        pending_promoter_count: pendingPromoterCount,
        paid_settlements_count: paidSettlementsCount
      },
      payout_summary: {
        pending_payouts_count: pendingPayoutsCount,
        pending_amount: Math.round(pendingPayoutsAmount * 100) / 100,
        completed_payouts_count: completedPayoutsCount,
        completed_amount: Math.round(completedPayoutsAmount * 100) / 100,
        failed_payouts_count: failedPayoutsCount,
        failed_amount: Math.round(failedPayoutsAmount * 100) / 100
      },
      refund_summary: {
        pending_refunds_count: pendingRefundsCount,
        pending_refund_amount: Math.round(pendingRefundsAmount * 100) / 100,
        completed_refunds_count: completedRefundsCount,
        completed_refund_amount: Math.round(completedRefundsAmount * 100) / 100,
        failed_refunds_count: failedRefundsCount,
        failed_refund_amount: Math.round(failedRefundsAmount * 100) / 100
      },
      chargeback_summary: {
        open_disputes_count: openDisputesCount,
        open_amount: Math.round(openDisputesAmount * 100) / 100,
        investigating_count: investigatingCount,
        investigating_amount: Math.round(investigatingAmount * 100) / 100,
        won_count: wonCount,
        won_amount: Math.round(wonAmount * 100) / 100,
        lost_count: lostCount,
        lost_amount: Math.round(lostAmount * 100) / 100
      }
    };

    // Add daily breakdown if requested
    if (includeBreakdowns) {
      const dailyData: { [key: string]: any } = {};

      // Aggregate by date
      (bookingData as any)?.daily_summary?.forEach((row: any) => {
        if (!dailyData[row.date]) {
          dailyData[row.date] = {
            date: row.date,
            gross_collected: 0,
            fees_earned: 0,
            settlement_created: 0,
            refunds_issued: 0,
            chargebacks_received: 0
          };
        }
        dailyData[row.date].gross_collected += row.gross_collected;
        dailyData[row.date].fees_earned += row.fees_earned;
      });

      dashboard.daily_breakdown = Object.values(dailyData);
    }

    return NextResponse.json(dashboard, { status: 200 });
  } catch (error) {
    console.error('Error in settlement dashboard API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settlement dashboard data' },
      { status: 500 }
    );
  }
}
