import { NextRequest, NextResponse } from 'next/server';
import { getVenueById } from '@/lib/venue-store';
import { getToken } from 'next-auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venue = await getVenueById(id);
    
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const isAdmin = token?.role === 'admin';

    // If not admin, strip out sensitive contact information
    if (!isAdmin) {
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
      return NextResponse.json({ venue: publicVenue });
    }
    
    return NextResponse.json({ venue });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch venue' }, { status: 500 });
  }
}
