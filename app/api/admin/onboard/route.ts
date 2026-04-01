import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createUser } from '@/lib/auth-store';
import { createVenue } from '@/lib/venue-store';
import bcrypt from 'bcryptjs';

// POST /api/admin/onboard - Admin creates users with specific roles
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      role,
      fullName,
      email,
      phone,
      password,
      socialMedia,
      bio,
      // Artist specific
      stageName,
      genre,
      experience,
      portfolio,
      // Promoter specific
      companyName,
      website,
      experienceYears,
      // Outlet specific
      venueName,
      venueType,
      location,
      capacity,
    } = body;

    // Validation
    if (!role || !fullName || !email || !password) {
      return NextResponse.json({ 
        error: 'Missing required fields: role, fullName, email, password' 
      }, { status: 400 });
    }

    // Role-specific validation
    if (role === 'artist' && !stageName) {
      return NextResponse.json({ error: 'Stage name is required for artists' }, { status: 400 });
    }
    if (role === 'promoter' && !companyName) {
      return NextResponse.json({ error: 'Company name is required for promoters' }, { status: 400 });
    }
    if (role === 'outlet' && (!venueName || !location)) {
      return NextResponse.json({ error: 'Venue name and location are required for outlet providers' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['artist', 'promoter', 'outlet'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be artist, promoter, or outlet' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('app_users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user based on role
    const user = await createUser(email, hashedPassword, role as any, fullName);

    // Verify user immediately since admin is creating
    await supabase
      .from('app_users')
      .update({ is_verified: true })
      .eq('id', user.id);

    // Create role-specific profile
    if (role === 'artist') {
      const { error: artistError } = await supabase
        .from('artist_profiles')
        .insert({
          user_id: user.id,
          stage_name: stageName,
          genre: genre || null,
          experience_years: experience ? parseInt(experience) : null,
          portfolio_url: portfolio || null,
          bio: bio || null,
          social_media: socialMedia || null,
          phone: phone || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (artistError) {
        console.error('Error creating artist profile:', artistError);
      }
    } else if (role === 'promoter') {
      const { error: promoterError } = await supabase
        .from('promoter_profiles')
        .insert({
          user_id: user.id,
          company_name: companyName,
          website: website || null,
          experience_years: experienceYears ? parseInt(experienceYears) : null,
          notable_events: portfolio || null,
          bio: bio || null,
          social_media: socialMedia || null,
          phone: phone || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (promoterError) {
        console.error('Error creating promoter profile:', promoterError);
      }
    } else if (role === 'outlet') {
      try {
        await createVenue({
          userId: user.id,
          venueName: venueName,
          venueType: venueType || '',
          email: email,
          phone: phone || '',
          location: location,
          capacity: capacity || '',
          bio: bio || '',
          website: website || '',
          instagram: socialMedia || '',
          twitter: '',
          facebook: '',
          imageUrl: null,
          coverImage: null,
          venueImages: [],
        });
      } catch (venueError) {
        console.error('Error creating venue profile:', venueError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${role === 'outlet' ? 'Outlet provider' : role} onboarded successfully`,
      user: {
        id: user.id,
        email: user.email,
        role: role,
        name: fullName,
      }
    });

  } catch (error) {
    console.error('Error in onboard POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
