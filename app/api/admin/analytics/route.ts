import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getAllPublishedEvents } from '@/lib/public-events-store';

// GET /api/admin/analytics?month=1&year=2026
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' && session.user.role !== 'sub_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const supabase = getSupabaseServerClient();
    await getAllPublishedEvents();

    // Build date filter
    let dateFilter = '';
    let bookingStartDate: string | undefined;
    let bookingEndDate: string | undefined;
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endMonth = parseInt(month) + 1;
      const endYear = endMonth > 12 ? parseInt(year) + 1 : parseInt(year);
      const endMonthStr = (endMonth > 12 ? 1 : endMonth).toString().padStart(2, '0');
      const endDate = `${endYear}-${endMonthStr}-01`;
      dateFilter = `date.gte.${startDate},date.lt.${endDate}`;
      bookingStartDate = `${startDate}T00:00:00.000Z`;
      bookingEndDate = `${endDate}T00:00:00.000Z`;
    } else if (year) {
      dateFilter = `date.gte.${year}-01-01,date.lt.${parseInt(year) + 1}-01-01`;
      bookingStartDate = `${year}-01-01T00:00:00.000Z`;
      bookingEndDate = `${parseInt(year) + 1}-01-01T00:00:00.000Z`;
    }

    // 1. Total Events Count
    let eventsQuery = supabase
      .from('published_events')
      .select('*', { count: 'exact' });
    
    if (dateFilter) {
      eventsQuery = eventsQuery.or(dateFilter);
    }
    
    const { count: totalEvents, error: eventsError } = await eventsQuery;

    if (eventsError) {
      console.error('Error fetching total events:', eventsError);
    }

    // 2. Events by Outlet/Promoter
    const { data: eventsByHost, error: hostError } = await supabase
      .from('published_events')
      .select('promoter_name, venue_id, organizer_id');

    if (hostError) {
      console.error('Error fetching events by host:', hostError);
    }

    // Count events by promoter name
    const promoterCounts: Record<string, number> = {};
    eventsByHost?.forEach((event: { promoter_name?: string }) => {
      const name = event.promoter_name || 'Unknown';
      promoterCounts[name] = (promoterCounts[name] || 0) + 1;
    });

    // 3. Most Popular Venues
    const { data: venueEvents, error: venueError } = await supabase
      .from('published_events')
      .select('venue_id, venue:venue_id(name)');

    if (venueError) {
      console.error('Error fetching venue events:', venueError);
    }

    // Count events by venue
    const venueCounts: Record<string, { id: string; name: string; count: number }> = {};
    venueEvents?.forEach((event: any) => {
      const venueId = event.venue_id;
      const venueName = event.venue?.name || 'Unknown Venue';
      if (!venueCounts[venueId]) {
        venueCounts[venueId] = { id: venueId, name: venueName, count: 0 };
      }
      venueCounts[venueId].count++;
    });

    const popularVenues = Object.values(venueCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Ticket Sales Data
    const { data: ticketData, error: ticketError } = await supabase
      .from('ticket_categories')
      .select('event_id, price, quantity, events:event_id(title, date)');

    if (ticketError) {
      console.error('Error fetching ticket data:', ticketError);
    }

    let totalTicketsSold = 0;
    let totalRevenue = 0;
    const ticketSalesByEvent: Record<string, { title: string; date: string; sold: number; revenue: number }> = {};

    ticketData?.forEach((ticket: any) => {
      const eventId = ticket.event_id;
      const quantity = ticket.quantity || 0;
      const price = ticket.price || 0;
      const revenue = quantity * price;

      totalTicketsSold += quantity;
      totalRevenue += revenue;

      if (!ticketSalesByEvent[eventId]) {
        ticketSalesByEvent[eventId] = {
          title: ticket.events?.title || 'Unknown Event',
          date: ticket.events?.date || '',
          sold: 0,
          revenue: 0,
        };
      }
      ticketSalesByEvent[eventId].sold += quantity;
      ticketSalesByEvent[eventId].revenue += revenue;
    });

    const topSellingEvents = Object.entries(ticketSalesByEvent)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 5. Events by Month (for chart)
    const { data: monthlyEvents, error: monthlyError } = await supabase
      .from('published_events')
      .select('date');

    if (monthlyError) {
      console.error('Error fetching monthly events:', monthlyError);
    }

    const monthCounts: Record<string, number> = {};
    monthlyEvents?.forEach((event: any) => {
      const date = new Date(event.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    const eventsByMonth = Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 6. Coupon Analytics
    let couponBookingsQuery = supabase
      .from('ticket_bookings')
      .select('event_id, event_title, total_tickets, amount_paid, coupon_code, coupon_source_type, coupon_source_name, coupon_discount_amount');

    if (bookingStartDate) {
      couponBookingsQuery = couponBookingsQuery.gte('booked_at', bookingStartDate);
    }
    if (bookingEndDate) {
      couponBookingsQuery = couponBookingsQuery.lt('booked_at', bookingEndDate);
    }

    const { data: couponBookings, error: couponError } = await couponBookingsQuery;

    if (couponError) {
      console.error('Error fetching coupon analytics data:', couponError);
    }

    const allBookings = couponBookings || [];
    const bookingsWithCoupons = allBookings.filter((booking: any) => Boolean(booking.coupon_code));

    const couponMetrics = {
      totalBookings: allBookings.length,
      couponBookings: bookingsWithCoupons.length,
      couponConversionRate: allBookings.length > 0
        ? Number(((bookingsWithCoupons.length / allBookings.length) * 100).toFixed(2))
        : 0,
      totalCouponDiscount: bookingsWithCoupons.reduce((sum: number, booking: any) => sum + Number(booking.coupon_discount_amount || 0), 0),
    };

    const byCode: Record<string, { code: string; uses: number; tickets: number; revenue: number; discount: number; sourceType?: string; sourceName?: string }> = {};
    for (const booking of bookingsWithCoupons as any[]) {
      const code = String(booking.coupon_code || '').toUpperCase();
      if (!code) continue;
      if (!byCode[code]) {
        byCode[code] = {
          code,
          uses: 0,
          tickets: 0,
          revenue: 0,
          discount: 0,
          sourceType: booking.coupon_source_type || undefined,
          sourceName: booking.coupon_source_name || undefined,
        };
      }
      byCode[code].uses += 1;
      byCode[code].tickets += Number(booking.total_tickets || 0);
      byCode[code].revenue += Number(booking.amount_paid || 0);
      byCode[code].discount += Number(booking.coupon_discount_amount || 0);
    }

    const couponTopCodes = Object.values(byCode)
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 10);

    const bySource: Record<string, { source: string; uses: number; discount: number; revenue: number }> = {};
    for (const booking of bookingsWithCoupons as any[]) {
      const sourceType = String(booking.coupon_source_type || 'unknown');
      if (!bySource[sourceType]) {
        bySource[sourceType] = { source: sourceType, uses: 0, discount: 0, revenue: 0 };
      }
      bySource[sourceType].uses += 1;
      bySource[sourceType].discount += Number(booking.coupon_discount_amount || 0);
      bySource[sourceType].revenue += Number(booking.amount_paid || 0);
    }

    const couponBySource = Object.values(bySource).sort((a, b) => b.uses - a.uses);

    return NextResponse.json({
      totalEvents: totalEvents || 0,
      eventsByPromoter: Object.entries(promoterCounts).map(([name, count]) => ({ name, count })),
      popularVenues,
      ticketSales: {
        totalTicketsSold,
        totalRevenue,
        topSellingEvents,
      },
      eventsByMonth,
      couponAnalytics: {
        ...couponMetrics,
        topCodes: couponTopCodes,
        bySource: couponBySource,
      },
    });
  } catch (error) {
    console.error('Error in analytics GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
