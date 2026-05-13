import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSupabaseServerClient } from '@/lib/supabase';
import { normalizeRole } from '@/lib/roles';
import {
  getAllPublishedEvents,
  getPublishedEventById,
  updatePublishedEvent,
  type PublicEvent,
  type PublicEventCouponRule,
} from '@/lib/public-events-store';

type EligibleRole = 'artist' | 'promoter';

type PromoterIdentity = {
  name?: string;
  companyName?: string;
};

function normalizeCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function toSourceType(role: string): EligibleRole | null {
  const normalized = normalizeRole(role);
  if (normalized === 'ARTIST') {
    return 'artist';
  }
  if (normalized === 'PROMOTER') {
    return 'promoter';
  }
  return null;
}

function toMoney(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isArtistTagged(event: PublicEvent, userId: string): boolean {
  return Boolean(event.taggedArtists?.some((artist) => artist.id === userId));
}

function normalizeName(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function isPromoterOwnedEvent(event: PublicEvent, identity: PromoterIdentity, userId: string): boolean {
  const promoterName = normalizeName(event.promoterName);
  const candidateNames = [identity.name, identity.companyName]
    .map((value) => normalizeName(value))
    .filter(Boolean);

  const hasOwnCode = Boolean(
    event.couponRules?.some(
      (rule) => rule.sourceType === 'promoter' && String(rule.sourceId || '') === userId
    )
  );

  return hasOwnCode || candidateNames.some((value) => value === promoterName);
}

function canManageEventForRole(
  event: PublicEvent,
  role: EligibleRole,
  userId: string,
  userName?: string | null,
  promoterIdentity?: PromoterIdentity
): boolean {
  if (role === 'artist') {
    return isArtistTagged(event, userId);
  }

  return isPromoterOwnedEvent(event, promoterIdentity || { name: userName || undefined }, userId);
}

function collectOwnCodes(events: PublicEvent[], sourceType: EligibleRole, userId: string) {
  const rows: Array<{
    eventId: string;
    eventTitle: string;
    code: string;
    discountPercent: number;
    createdByName?: string;
  }> = [];

  for (const event of events) {
    for (const rule of event.couponRules || []) {
      if (rule.sourceType !== sourceType) continue;
      if (String(rule.sourceId || '') !== userId) continue;

      rows.push({
        eventId: event.id,
        eventTitle: event.title,
        code: rule.code,
        discountPercent: Number(rule.discountPercent || 0),
        createdByName: rule.sourceName,
      });
    }
  }

  return rows;
}

function calculateBookingShare(
  ticketCategories: Array<Record<string, unknown>>,
  sourceType: EligibleRole
): number {
  if (sourceType !== 'artist' && sourceType !== 'promoter') {
    return 0;
  }

  return ticketCategories.reduce((sum, ticket) => {
    const qty = Math.max(0, Number(ticket.quantity || 0));
    const price = Math.max(0, Number(ticket.price || 0));
    const sharePercent =
      sourceType === 'artist'
        ? Math.max(0, Number(ticket.artistShare || 0))
        : Math.max(0, Number(ticket.influencerShare || 0));

    if (!Number.isFinite(qty) || !Number.isFinite(price) || !Number.isFinite(sharePercent)) {
      return sum;
    }

    return sum + qty * price * (sharePercent / 100);
  }, 0);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sourceType = toSourceType(session.user.role);
    if (!sourceType) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseServerClient();
    let promoterIdentity: PromoterIdentity | undefined;
    if (sourceType === 'promoter') {
      const { data: promoterProfile } = await supabase
        .from('promoter_profiles')
        .select('company_name')
        .eq('user_id', userId)
        .single();

      promoterIdentity = {
        name: session.user.name || undefined,
        companyName: typeof promoterProfile?.company_name === 'string' ? promoterProfile.company_name : undefined,
      };
    }

    const events = await getAllPublishedEvents();
    const manageableEvents = events.filter((event) =>
      canManageEventForRole(event, sourceType, userId, session.user.name, promoterIdentity)
    );

    const promoCodes = collectOwnCodes(events, sourceType, userId);

    const { data: bookingsData, error: bookingError } = await supabase
      .from('ticket_bookings')
      .select('id, coupon_code, event_title, booked_at, ticket_categories, amount_paid')
      .eq('status', 'confirmed')
      .eq('coupon_source_id', userId)
      .eq('coupon_source_type', sourceType)
      .order('booked_at', { ascending: false });

    if (bookingError) {
      throw new Error(`Failed to read booking earnings: ${bookingError.message}`);
    }

    const bookings = (bookingsData as Array<Record<string, unknown>> | null) || [];

    let totalShareAmount = 0;
    let totalBookedAmount = 0;
    const byCode = new Map<string, { code: string; bookings: number; shareAmount: number; bookedAmount: number }>();

    for (const booking of bookings) {
      const ticketCategories = Array.isArray(booking.ticket_categories)
        ? (booking.ticket_categories as Array<Record<string, unknown>>)
        : [];
      const shareAmount = calculateBookingShare(ticketCategories, sourceType);
      const bookedAmount = toMoney(booking.amount_paid);
      const code = normalizeCode(booking.coupon_code);

      totalShareAmount += shareAmount;
      totalBookedAmount += bookedAmount;

      if (code) {
        const current = byCode.get(code) || {
          code,
          bookings: 0,
          shareAmount: 0,
          bookedAmount: 0,
        };
        current.bookings += 1;
        current.shareAmount += shareAmount;
        current.bookedAmount += bookedAmount;
        byCode.set(code, current);
      }
    }

    return NextResponse.json({
      sourceType,
      events: manageableEvents.map((event) => ({
        id: event.id,
        title: event.title,
        venue: event.venue,
        date: event.date,
      })),
      promoCodes,
      earnings: {
        totalShareAmount,
        totalBookedAmount,
        totalBookings: bookings.length,
        byCode: Array.from(byCode.values()).sort((a, b) => b.shareAmount - a.shareAmount),
      },
    });
  } catch (error) {
    console.error('Failed to fetch promo code summary:', error);
    return NextResponse.json({ error: 'Failed to fetch promo code summary' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sourceType = toSourceType(session.user.role);
    if (!sourceType) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    const code = normalizeCode(body.promoCode || body.code);
    const discountPercent = Number(body.discountPercent || 0);

    if (!eventId) {
      return NextResponse.json({ error: 'Event is required' }, { status: 400 });
    }

    if (!code || !/^[A-Z0-9_-]{3,24}$/.test(code)) {
      return NextResponse.json(
        { error: 'Promo code must be 3-24 characters (A-Z, 0-9, _ or -)' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      return NextResponse.json({ error: 'Discount percent must be between 1 and 100' }, { status: 400 });
    }

    const event = await getPublishedEventById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const supabase = getSupabaseServerClient();
    let promoterIdentity: PromoterIdentity | undefined;
    if (sourceType === 'promoter') {
      const { data: promoterProfile } = await supabase
        .from('promoter_profiles')
        .select('company_name')
        .eq('user_id', session.user.id)
        .single();

      promoterIdentity = {
        name: session.user.name || undefined,
        companyName: typeof promoterProfile?.company_name === 'string' ? promoterProfile.company_name : undefined,
      };
    }

    if (!canManageEventForRole(event, sourceType, session.user.id, session.user.name, promoterIdentity)) {
      return NextResponse.json({ error: 'You are not allowed to create a promo for this event' }, { status: 403 });
    }

    const existingRules = Array.isArray(event.couponRules) ? event.couponRules : [];
    const codeAlreadyExists = existingRules.some((rule) => normalizeCode(rule.code) === code);
    if (codeAlreadyExists) {
      return NextResponse.json({ error: 'This promo code already exists for the event' }, { status: 400 });
    }

    const newRule: PublicEventCouponRule = {
      code,
      discountPercent,
      sourceType,
      sourceId: session.user.id,
      sourceName: session.user.name || undefined,
    };

    const nextRules = [...existingRules, newRule];

    const updated = await updatePublishedEvent(event.id, {
      couponRules: nextRules,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to save promo code' }, { status: 500 });
    }

    return NextResponse.json({ success: true, couponRule: newRule, eventId: event.id });
  } catch (error) {
    console.error('Failed to create promo code:', error);
    return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 });
  }
}
