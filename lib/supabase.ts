import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client singleton (lazy-initialized)
// Uses service role key for admin-level operations (bypasses RLS)

let supabaseClient: any = null;

export function getSupabaseServerClient(): any {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
    }

    if (!supabaseServiceKey) {
      throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
    }

    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

// Provide a lazy proxy so `import { supabase } from '@/lib/supabase'` still works
// without constructing the client at module import time. The real client is
// created when a property is first accessed, which preserves current call-sites.
export const supabase: any = new Proxy({}, {
  get(_, prop) {
    const client = getSupabaseServerClient();
    // forward access
    return (client as any)[prop];
  },
  apply(_, thisArg, args) {
    const client = getSupabaseServerClient();
    return (client as any).apply(thisArg, args);
  }
});

// Types for database tables
export type AppUser = {
  id: string;
  email: string;
  hashed_password: string;
  role: string;
  name: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type OtpRecord = {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  is_used: boolean;
  created_at: string;
};

export type VenueProfile = {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  description: string | null;
  amenities: Record<string, unknown> | null;
  images: string[] | null;
  owner_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EventRequest = {
  id: string;
  title: string;
  date: string;
  description: string | null;
  status: string;
  user_id: string | null;
  venue_id: string | null;
  event_type: string | null;
  expected_attendance: number | null;
  budget: number | null;
  requirements: string[] | null;
  attachments: string[] | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PublishedEvent = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  description: string | null;
  venue_id: string | null;
  organizer_id: string | null;
  event_type: string | null;
  category: string | null;
  image_url: string | null;
  gallery_images: string[] | null;
  ticket_price: number | null;
  ticket_url: string | null;
  max_attendance: number | null;
  registered_attendees: number;
  tags: string[] | null;
  is_featured: boolean;
  is_public: boolean;
  pay_at_venue_enabled: boolean;
  status: string;
  social_links: Record<string, unknown> | null;
  request_id: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
};
