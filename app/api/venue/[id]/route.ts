import { NextRequest, NextResponse } from 'next/server';
import { getVenueById } from '@/lib/venue-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venue = getVenueById(id);
    
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }
    
    return NextResponse.json({ venue });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch venue' }, { status: 500 });
  }
}
