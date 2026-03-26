import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getEventRequestsByOutlet } from '@/lib/event-request-store';
import { getAllPublishedEvents } from '@/lib/public-events-store';

type OutletEventLifecycle = 'waiting_approval' | 'upcoming' | 'completed';

type OutletEventSummary = {
  requestId: string;
  publicEventId?: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  category: string;
  price: string;
  image: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  lifecycle: OutletEventLifecycle;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
  isPublished: boolean;
  publicEventUrl?: string;
};

function getEventCutoffTimestamp(dateValue: string) {
  const endOfDay = new Date(`${dateValue}T23:59:59`);

  if (!Number.isNaN(endOfDay.getTime())) {
    return endOfDay.getTime();
  }

  const fallback = new Date(dateValue);
  return Number.isNaN(fallback.getTime()) ? Number.POSITIVE_INFINITY : fallback.getTime();
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== 'outlet') {
      return NextResponse.json({ error: 'Unauthorized - Outlet provider access required' }, { status: 403 });
    }

    const outletRequests = getEventRequestsByOutlet(token.sub || '');
    const publishedEvents = getAllPublishedEvents();
    const publishedByRequestId = new Map(
      publishedEvents
        .filter((event) => event.sourceRequestId)
        .map((event) => [event.sourceRequestId as string, event])
    );

    const now = Date.now();
    const upcomingEvents: OutletEventSummary[] = [];
    const completedEvents: OutletEventSummary[] = [];
    const waitingApprovalEvents: OutletEventSummary[] = [];

    outletRequests.forEach((requestItem) => {
      if (requestItem.status === 'rejected') {
        return;
      }

      const publishedEvent = publishedByRequestId.get(requestItem.id);
      const eventSummary: OutletEventSummary = {
        requestId: requestItem.id,
        publicEventId: publishedEvent?.id,
        title: requestItem.eventData.title,
        subtitle: requestItem.eventData.subtitle,
        date: requestItem.eventData.date,
        time: requestItem.eventData.time,
        venue: requestItem.eventData.venue,
        category: requestItem.eventData.category,
        price: requestItem.eventData.price,
        image: requestItem.eventData.image,
        description: requestItem.eventData.description,
        status: requestItem.status,
        lifecycle: 'waiting_approval',
        submittedAt: requestItem.submittedAt,
        reviewedAt: requestItem.reviewedAt,
        reviewedBy: requestItem.reviewedBy,
        rejectionReason: requestItem.rejectionReason,
        isPublished: Boolean(publishedEvent),
        publicEventUrl: publishedEvent ? `/events/${publishedEvent.id}` : undefined,
      };

      if (requestItem.status === 'pending') {
        waitingApprovalEvents.push(eventSummary);
        return;
      }

      const lifecycle: OutletEventLifecycle =
        getEventCutoffTimestamp(requestItem.eventData.date) < now ? 'completed' : 'upcoming';
      const nextEvent: OutletEventSummary = {
        ...eventSummary,
        lifecycle,
      };

      if (lifecycle === 'completed') {
        completedEvents.push(nextEvent);
      } else {
        upcomingEvents.push(nextEvent);
      }
    });

    const sortByDateDesc = (items: OutletEventSummary[]) =>
      items.sort((left, right) => getEventCutoffTimestamp(right.date) - getEventCutoffTimestamp(left.date));

    const sortByDateAsc = (items: OutletEventSummary[]) =>
      items.sort((left, right) => getEventCutoffTimestamp(left.date) - getEventCutoffTimestamp(right.date));

    return NextResponse.json({
      upcomingEvents: sortByDateAsc(upcomingEvents),
      completedEvents: sortByDateDesc(completedEvents),
      waitingApprovalEvents: sortByDateDesc(waitingApprovalEvents),
    });
  } catch (error) {
    console.error('Failed to fetch outlet events:', error);
    return NextResponse.json({ error: 'Failed to fetch outlet events' }, { status: 500 });
  }
}
