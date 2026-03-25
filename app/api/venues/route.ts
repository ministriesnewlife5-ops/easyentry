import { NextResponse } from 'next/server';
import { getAllVenues } from '@/lib/venue-store';

export async function GET() {
  try {
    const venues = getAllVenues();
    return NextResponse.json({ venues });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 });
  }
}
