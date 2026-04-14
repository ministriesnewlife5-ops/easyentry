import { NextRequest, NextResponse } from 'next/server';
import { getPublishedEventById } from '@/lib/public-events-store';
import { updatePublishedEvent } from '@/lib/public-events-store';
import { getEventRequestById, updateEventRequest } from '@/lib/event-request-store';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

type EventCouponRule = {
  code: string;
  discountPercent: number;
  sourceType: 'outlet' | 'artist' | 'promoter' | 'influencer';
  sourceId?: string;
  sourceName?: string;
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCouponRules(value: unknown): { rules?: EventCouponRule[]; error?: string } {
  if (value == null) return {};
  if (!Array.isArray(value)) return { error: 'couponRules must be an array.' };

  const rules: EventCouponRule[] = [];

  for (const rawRule of value as Array<Record<string, unknown>>) {
    const code = normalizeText(rawRule.code).toUpperCase();
    const discountPercent = Number(rawRule.discountPercent || 0);
    const sourceType = normalizeText(rawRule.sourceType);
    const startsAt = normalizeText(rawRule.startsAt);
    const endsAt = normalizeText(rawRule.endsAt);
    const maxUses = rawRule.maxUses == null ? undefined : Number(rawRule.maxUses);

    if (!code) return { error: 'Each coupon rule must have a coupon code.' };
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      return { error: `Coupon ${code} must have discount percent between 1 and 100.` };
    }
    if (!['outlet', 'artist', 'promoter', 'influencer'].includes(sourceType)) {
      return { error: `Coupon ${code} has an invalid source type.` };
    }
    if (startsAt && Number.isNaN(new Date(startsAt).getTime())) {
      return { error: `Coupon ${code} has an invalid start time.` };
    }
    if (endsAt && Number.isNaN(new Date(endsAt).getTime())) {
      return { error: `Coupon ${code} has an invalid end time.` };
    }
    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return { error: `Coupon ${code} end time must be after start time.` };
    }
    if (maxUses != null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
      return { error: `Coupon ${code} max uses must be a positive integer.` };
    }

    rules.push({
      code,
      discountPercent,
      sourceType: sourceType as EventCouponRule['sourceType'],
      sourceId: normalizeText(rawRule.sourceId) || undefined,
      sourceName: normalizeText(rawRule.sourceName) || undefined,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      maxUses,
    });
  }

  return { rules };
}

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
    const parsedCouponRules = parseCouponRules(body.couponRules);
    if (parsedCouponRules.error) {
      return NextResponse.json({ error: parsedCouponRules.error }, { status: 400 });
    }

    const updates = {
      title: typeof body.title === 'string' ? body.title : undefined,
      subtitle: typeof body.subtitle === 'string' ? body.subtitle : undefined,
      date: typeof body.date === 'string' ? body.date : undefined,
      time: typeof body.time === 'string' ? body.time : undefined,
      venue: typeof body.venue === 'string' ? body.venue : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      subcategory: typeof body.subcategory === 'string' ? body.subcategory : undefined,
      price: typeof body.price === 'string' ? body.price : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      fullDescription: typeof body.description === 'string' ? body.description : undefined,
      image: typeof body.image === 'string' ? body.image : undefined,
      couponRules: parsedCouponRules.rules,
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
            subcategory: updates.subcategory ?? sourceRequest.eventData.subcategory,
            price: updates.price ?? sourceRequest.eventData.price,
            description: updates.description ?? sourceRequest.eventData.description,
            fullDescription: updates.description ?? sourceRequest.eventData.fullDescription,
            image: updates.image ?? sourceRequest.eventData.image,
            couponRules: updates.couponRules ?? sourceRequest.eventData.couponRules,
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
