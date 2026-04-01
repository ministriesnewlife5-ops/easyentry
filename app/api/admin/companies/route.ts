import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

type Company = {
  id: string;
  name: string;
  type: 'outlet' | 'promoter';
  location?: string;
  email?: string;
  ownerId?: string;
};

// GET /api/admin/companies - Get all outlets and promoters for dropdown
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || typeof session.user.id !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    
    // Get all outlet providers (venues with profiles)
    const { data: outlets, error: outletsError } = await supabase
      .from('venue_profiles')
      .select('id, name, location, owner_id')
      .eq('is_active', true)
      .order('name');

    if (outletsError) {
      console.error('Error fetching outlets:', outletsError);
    }

    // Get all promoter users
    const { data: promoters, error: promotersError } = await supabase
      .from('app_users')
      .select('id, name, email')
      .eq('role', 'promoter')
      .order('name');

    if (promotersError) {
      console.error('Error fetching promoters:', promotersError);
    }

    // Format outlets
    const formattedOutlets: Company[] = (outlets || []).map((outlet: any) => ({
      id: outlet.id,
      name: outlet.name,
      type: 'outlet' as const,
      location: outlet.location,
      ownerId: outlet.owner_id,
    }));

    // Format promoters
    const formattedPromoters: Company[] = (promoters || []).map((promoter: any) => ({
      id: promoter.id,
      name: promoter.name || promoter.email,
      type: 'promoter' as const,
      email: promoter.email,
    }));

    // Combine and sort by name
    const allCompanies = [...formattedOutlets, ...formattedPromoters].sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({ companies: allCompanies });
  } catch (error) {
    console.error('Error in companies GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
