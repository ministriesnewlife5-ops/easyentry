import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createUser } from '@/lib/auth-store';
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
      fullName,
      email,
      phone,
      password,
    } = body;

    // Validation
    if (!fullName || !email || !password) {
      return NextResponse.json({
        error: 'Missing required fields: fullName, email, password'
      }, { status: 400 });
    }

    const role = 'sub_admin';

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

    // Create sub-admin user
    const user = await createUser(email, hashedPassword, role as any, fullName);

    // Verify user immediately since admin is creating
    await supabase
      .from('app_users')
      .update({ is_verified: true })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Sub-admin onboarded successfully',
      user: {
        id: user.id,
        email: user.email,
        role,
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
