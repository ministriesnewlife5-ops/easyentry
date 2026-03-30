import { NextResponse } from 'next/server';
import { getAllVenues } from '@/lib/venue-store';

export async function GET() {
  try {
    const venues = await getAllVenues();
    
    // Strip out sensitive contact information from all venues
    const publicVenues = venues.map(venue => {
      const { 
        firstPointContact, 
        fnbManagerContact, 
        financeContact,
        gstNumber,
        gstCertificate,
        panCard,
        panCardDocument,
        ...publicVenue 
      } = venue;
      return publicVenue;
    });

    return NextResponse.json({ venues: publicVenues });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 });
  }
}
