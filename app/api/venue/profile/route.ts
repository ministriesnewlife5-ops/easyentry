import { NextRequest, NextResponse } from 'next/server';
import { getVenueByUserId, updateVenueByUserId } from '@/lib/venue-store';
import { getToken } from 'next-auth/jwt';

// Max size in bytes for a single base64 image stored in DB (300KB each)
const MAX_IMAGE_SIZE = 300 * 1024;

// Truncate or reject oversized base64 strings
function sanitizeImage(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('data:')) return value; // already a URL, keep it
  const base64Part = value.split(',')[1] || '';
  const sizeBytes = Math.ceil((base64Part.length * 3) / 4);
  if (sizeBytes > MAX_IMAGE_SIZE) {
    // Too large to store — return null so it doesn't crash
    console.warn(`Image too large (${Math.round(sizeBytes / 1024)}KB), skipping`);
    return null;
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (token?.sub) {
      const userVenue = await getVenueByUserId(token.sub);
      if (userVenue) {
        return NextResponse.json({ venue: userVenue });
      }
    }
    return NextResponse.json({ venue: null });
  } catch (error) {
    console.error('GET /api/venue/profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch venue profile' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (token.role !== 'outlet' && token.role !== 'admin') {
      return NextResponse.json({ error: 'Only outlet providers can create venue profiles' }, { status: 403 });
    }

    const body = await request.json();

    // Sanitize all images — strip oversized base64 to avoid Supabase payload crash
    const imageUrl = sanitizeImage(body.imageUrl);
    const coverImage = sanitizeImage(body.coverImage);
    const venueImages = (body.venueImages || [])
      .map((img: string) => sanitizeImage(img))
      .filter(Boolean) as string[];

    // Strip raw base64 PDF documents — just store a flag or filename
    const gstCertificate =
      typeof body.gstCertificate === 'string' && body.gstCertificate.startsWith('data:')
        ? 'uploaded'
        : body.gstCertificate || '';
    const panCardDocument =
      typeof body.panCardDocument === 'string' && body.panCardDocument.startsWith('data:')
        ? 'uploaded'
        : body.panCardDocument || '';

    const venue = await updateVenueByUserId(token.sub, {
      ...body,
      userId: token.sub,
      imageUrl,
      coverImage,
      venueImages,
      gstCertificate,
      panCardDocument,
    });

    return NextResponse.json({ venue }, { status: 201 });
  } catch (error) {
    console.error('POST /api/venue/profile error:', error);
    return NextResponse.json({
      error: 'Failed to create venue profile',
      details: String(error),
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (token.role !== 'outlet' && token.role !== 'admin') {
      return NextResponse.json({ error: 'Only outlet providers can update venue profiles' }, { status: 403 });
    }

    const body = await request.json();
    const venue = await updateVenueByUserId(token.sub, body);

    if (!venue) {
      return NextResponse.json({ error: 'Failed to update venue profile' }, { status: 500 });
    }

    return NextResponse.json({ venue });
  } catch (error) {
    console.error('PUT /api/venue/profile error:', error);
    return NextResponse.json({ error: 'Failed to update venue profile' }, { status: 500 });
  }
}
