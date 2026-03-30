import { NextResponse } from 'next/server';
import { getAllPublishedEvents, getPublishedEventCards } from '@/lib/public-events-store';

export async function GET() {
  try {
    return NextResponse.json({
      events: await getPublishedEventCards(),
      detailedEvents: await getAllPublishedEvents(),
    });
  } catch (error) {
    console.error('Failed to fetch published events:', error);
    return NextResponse.json({ error: 'Failed to fetch published events' }, { status: 500 });
  }
}
