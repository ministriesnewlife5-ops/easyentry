import { NextRequest, NextResponse } from 'next/server';
import { getAllVenues, getVenueByUserId, updateVenueByUserId, VenueProfile } from '@/lib/venue-store';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    // If user is authenticated, try to get their venue profile
    if (token?.sub) {
      const userVenue = getVenueByUserId(token.sub);
      if (userVenue) {
        return NextResponse.json({ venue: userVenue });
      }
    }
    
    return NextResponse.json({ venue: null });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch venue profile' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only outlet providers can create venue profiles
    if (token.role !== 'outlet' && token.role !== 'admin') {
      return NextResponse.json({ error: 'Only outlet providers can create venue profiles' }, { status: 403 });
    }
    
    const body = await request.json();
    
    const venue = updateVenueByUserId(token.sub, {
      ...body,
      userId: token.sub,
    });
    
    return NextResponse.json({ venue }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create venue profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only outlet providers can update venue profiles
    if (token.role !== 'outlet' && token.role !== 'admin') {
      return NextResponse.json({ error: 'Only outlet providers can update venue profiles' }, { status: 403 });
    }
    
    const body = await request.json();
    
    const venue = updateVenueByUserId(token.sub, body);
    
    if (!venue) {
      return NextResponse.json({ error: 'Failed to update venue profile' }, { status: 500 });
    }
    
    return NextResponse.json({ venue });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update venue profile' }, { status: 500 });
  }
}
