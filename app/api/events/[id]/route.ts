import { NextRequest, NextResponse } from 'next/server';
import { getPublishedEventById } from '@/lib/public-events-store';
import { updatePublishedEvent } from '@/lib/public-events-store';
import { getEventRequestById, updateEventRequest } from '@/lib/event-request-store';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await getPublishedEventById(id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existingEvent = await getPublishedEventById(id);

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'admin' || session.user.role === 'sub_admin';

    if (!isAdmin) {
      if (!existingEvent.sourceRequestId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const sourceRequest = await getEventRequestById(existingEvent.sourceRequestId);
      if (!sourceRequest || sourceRequest.outletUserId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();

    const updates = {
      title: typeof body.title === 'string' ? body.title : undefined,
      subtitle: typeof body.subtitle === 'string' ? body.subtitle : undefined,
      date: typeof body.date === 'string' ? body.date : undefined,
      time: typeof body.time === 'string' ? body.time : undefined,
      venue: typeof body.venue === 'string' ? body.venue : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      price: typeof body.price === 'string' ? body.price : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      fullDescription: typeof body.description === 'string' ? body.description : undefined,
      image: typeof body.image === 'string' ? body.image : undefined,
    };

    const updated = await updatePublishedEvent(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    if (updated.sourceRequestId) {
      const sourceRequest = await getEventRequestById(updated.sourceRequestId);
      if (sourceRequest) {
        await updateEventRequest(sourceRequest.id, {
          eventData: {
            ...sourceRequest.eventData,
            title: updates.title ?? sourceRequest.eventData.title,
            subtitle: updates.subtitle ?? sourceRequest.eventData.subtitle,
            date: updates.date ?? sourceRequest.eventData.date,
            time: updates.time ?? sourceRequest.eventData.time,
            venue: updates.venue ?? sourceRequest.eventData.venue,
            category: updates.category ?? sourceRequest.eventData.category,
            price: updates.price ?? sourceRequest.eventData.price,
            description: updates.description ?? sourceRequest.eventData.description,
            fullDescription: updates.description ?? sourceRequest.eventData.fullDescription,
            image: updates.image ?? sourceRequest.eventData.image,
          },
        });
      }
    }

    return NextResponse.json({ success: true, event: updated });
  } catch (error) {
    console.error('Failed to update event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}
