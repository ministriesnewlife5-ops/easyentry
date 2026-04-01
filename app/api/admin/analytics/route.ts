import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// GET /api/admin/analytics?month=1&year=2026
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const supabase = getSupabaseServerClient();

    // Build date filter
    let dateFilter = '';
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endMonth = parseInt(month) + 1;
      const endYear = endMonth > 12 ? parseInt(year) + 1 : parseInt(year);
      const endMonthStr = (endMonth > 12 ? 1 : endMonth).toString().padStart(2, '0');
      const endDate = `${endYear}-${endMonthStr}-01`;
      dateFilter = `date.gte.${startDate},date.lt.${endDate}`;
    } else if (year) {
      dateFilter = `date.gte.${year}-01-01,date.lt.${parseInt(year) + 1}-01-01`;
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
    });
  } catch (error) {
    console.error('Error in analytics GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
