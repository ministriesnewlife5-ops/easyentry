import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client singleton
// Uses service role key for admin-level operations (bypasses RLS)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceKey) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

// Singleton pattern for server-side Supabase client
let supabaseClient: any = null;

export function getSupabaseServerClient(): any {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

// Export singleton instance
export const supabase = getSupabaseServerClient();

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
  amenities: string[] | null;
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
  status: string;
  social_links: Record<string, string> | null;
  request_id: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
};
