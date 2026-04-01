import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// POST /api/admin/host-event - Admin creates and publishes event directly
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { eventData } = body;

    if (!eventData) {
      return NextResponse.json({ error: 'Event data is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    // Insert the event directly as published
    const { data: event, error: insertError } = await supabase
      .from('published_events')
      .insert({
        title: eventData.title,
        date: eventData.date,
        time: eventData.time,
        description: eventData.description,
        venue_id: eventData.hostCompanyType === 'outlet' ? eventData.hostCompanyId : null,
        organizer_id: eventData.hostCompanyType === 'promoter' ? eventData.hostCompanyId : null,
        promoter_name: eventData.hostCompanyName,
        event_type: eventData.category,
        category: eventData.category,
        image_url: eventData.image,
        gallery_images: eventData.mediaFiles,
        ticket_price: parseFloat(eventData.price?.replace('₹', '') || '0'),
        max_attendance: eventData.numberOfTickets,
        is_public: true,
        is_featured: false,
        status: 'published',
        social_links: {
          gatesOpen: eventData.gatesOpen,
          entryAge: eventData.entryAge,
          layout: eventData.layout,
          seating: eventData.seating,
          rules: eventData.rules,
        },
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating event:', insertError);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    // Insert ticket categories if provided
    if (eventData.ticketCategories?.length > 0) {
      const { error: ticketsError } = await supabase
        .from('ticket_categories')
        .insert(
          eventData.ticketCategories.map((cat: any) => ({
            event_id: event.id,
            name: cat.name,
            price: cat.price,
            quantity: cat.quantity,
            available_from: cat.availableFrom,
            available_until: cat.availableUntil,
            created_at: new Date().toISOString(),
          }))
        );

      if (ticketsError) {
        console.error('Error creating ticket categories:', ticketsError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      event,
      message: 'Event created and published successfully' 
    });
  } catch (error) {
    console.error('Error in host-event POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
