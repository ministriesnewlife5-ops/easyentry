/// <reference types="node" />
import { supabase, type VenueProfile as DbVenueProfile } from './supabase';

export type VenueProfile = {
  id: string;
  userId: string;
  venueName: string;
  venueType: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  capacity: string;
  website: string;
  instagram: string;
  twitter: string;
  facebook: string;
  imageUrl: string | null;
  coverImage: string | null;
  venueImages: string[];
  createdAt: string;
  updatedAt: string;
  firstPointContact?: { name: string; email: string; phone: string };
  fnbManagerContact?: { name: string; email: string; phone: string };
  financeContact?: { name: string; email: string; phone: string };
  gstNumber?: string;
  gstCertificate?: string;
  panCard?: string;
  panCardDocument?: string;
  termsAccepted?: string;
};

type VenueInput = Omit<VenueProfile, 'id' | 'createdAt' | 'updatedAt'>;

// Map database venue to legacy VenueProfile
function mapDbToLegacy(record: Record<string, unknown>): VenueProfile {
  const images = (record.images as string[]) || [];

  return {
    id: record.id as string,
    userId: (record.owner_id as string) || '',
    venueName: (record.name as string) || '',
    venueType: '',
    email: '',
    phone: '',
    location: (record.location as string) || '',
    bio: (record.description as string) || '',
    capacity: (record.capacity as number)?.toString() || '',
    website: '',
    instagram: '',
    twitter: '',
    facebook: '',
    imageUrl: images[0] || null,
    coverImage: images[1] || null,
    venueImages: images,
    createdAt: (record.created_at as string) || new Date().toISOString(),
    updatedAt: (record.updated_at as string) || new Date().toISOString(),
  };
}

// Map legacy VenueProfile to database schema
function mapLegacyToDb(venue: Partial<VenueProfile>): Record<string, unknown> {
  const images: string[] = [];
  if (venue.imageUrl) images.push(venue.imageUrl);
  if (venue.coverImage) images.push(venue.coverImage);
  if (venue.venueImages) images.push(...venue.venueImages);

  return {
    name: venue.venueName || '',
    location: venue.location || null,
    capacity: venue.capacity ? parseInt(venue.capacity) : null,
    description: venue.bio || null,
    amenities: null,
    images: images.length > 0 ? [...new Set(images)] : null,
    owner_id: venue.userId || null,
    is_active: true,
  };
}

/**
 * Get all venue profiles
 */
export async function getAllVenues(): Promise<VenueProfile[]> {
  const { data, error } = await supabase
    .from('venue_profiles')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to get venues: ${error.message}`);
  }

  return (data as Record<string, unknown>[])?.map(mapDbToLegacy) || [];
}

/**
 * Get a venue by ID
 */
export async function getVenueById(id: string): Promise<VenueProfile | undefined> {
  const { data, error } = await supabase
    .from('venue_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return undefined;
    }
    throw new Error(`Failed to get venue: ${error.message}`);
  }

  return mapDbToLegacy(data as Record<string, unknown>);
}

/**
 * Get venue by user/owner ID
 */
export async function getVenueByUserId(userId: string): Promise<VenueProfile | undefined> {
  const { data, error } = await supabase
    .from('venue_profiles')
    .select('*')
    .eq('owner_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return undefined;
    }
    throw new Error(`Failed to get venue by user: ${error.message}`);
  }

  return mapDbToLegacy(data as Record<string, unknown>);
}

/**
 * Create a new venue
 */
export async function createVenue(venue: VenueInput): Promise<VenueProfile> {
  const dbData = mapLegacyToDb(venue);

  const { data, error } = await supabase
    .from('venue_profiles')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create venue: ${error.message}`);
  }

  return mapDbToLegacy(data as Record<string, unknown>);
}

/**
 * Update a venue by ID
 */
export async function updateVenue(
  id: string,
  updates: Partial<VenueInput>
): Promise<VenueProfile | null> {
  const { data: existing } = await supabase
    .from('venue_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!existing) return null;

  const currentProfile = mapDbToLegacy(existing as Record<string, unknown>);
  const updatedProfile = { ...currentProfile, ...updates };
  const dbData = mapLegacyToDb(updatedProfile);

  // Remove fields that shouldn't be updated directly
  delete dbData.owner_id;

  const { data, error } = await supabase
    .from('venue_profiles')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update venue: ${error.message}`);
  }

  return mapDbToLegacy(data as Record<string, unknown>);
}

/**
 * Update or create venue by user ID
 */
export async function updateVenueByUserId(
  userId: string,
  updates: Partial<VenueInput>
): Promise<VenueProfile | null> {
  const { data: existing } = await supabase
    .from('venue_profiles')
    .select('*')
    .eq('owner_id', userId)
    .single();

  if (!existing) {
    // Create new venue
    const newVenue: Partial<VenueProfile> = {
      userId,
      venueName: updates.venueName || '',
      venueType: updates.venueType || '',
      email: updates.email || '',
      phone: updates.phone || '',
      location: updates.location || '',
      bio: updates.bio || '',
      capacity: updates.capacity || '',
      website: updates.website || '',
      instagram: updates.instagram || '',
      twitter: updates.twitter || '',
      facebook: updates.facebook || '',
      imageUrl: updates.imageUrl || null,
      coverImage: updates.coverImage || null,
      venueImages: updates.venueImages || [],
    };
    return createVenue(newVenue as VenueInput);
  }

  const currentProfile = mapDbToLegacy(existing as Record<string, unknown>);
  const updatedProfile = { ...currentProfile, ...updates };
  const dbData = mapLegacyToDb(updatedProfile);

  const { data, error } = await supabase
    .from('venue_profiles')
    .update(dbData)
    .eq('owner_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update venue: ${error.message}`);
  }

  return mapDbToLegacy(data as Record<string, unknown>);
}

/**
 * Delete a venue
 */
export async function deleteVenue(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('venue_profiles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete venue:', error.message);
    return false;
  }

  return true;
}

// Extended Supabase-specific functions
export type CreateVenueInput = {
  name: string;
  location?: string;
  capacity?: number;
  description?: string;
  amenities?: string[];
  images?: string[];
  ownerId?: string;
};

export type UpdateVenueDbInput = Partial<CreateVenueInput> & {
  isActive?: boolean;
};

/**
 * Get all venues including inactive (admin)
 */
export async function getAllVenuesAdmin(): Promise<DbVenueProfile[]> {
  const { data, error } = await supabase
    .from('venue_profiles')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to get all venues: ${error.message}`);
  }

  return data as DbVenueProfile[];
}

/**
 * Get venues by owner ID
 */
export async function getVenuesByOwner(ownerId: string): Promise<DbVenueProfile[]> {
  const { data, error } = await supabase
    .from('venue_profiles')
    .select('*')
    .eq('owner_id', ownerId)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to get owner venues: ${error.message}`);
  }

  return data as DbVenueProfile[];
}

/**
 * Create venue (raw DB format)
 */
export async function createVenueDb(input: CreateVenueInput): Promise<DbVenueProfile> {
  const { data, error } = await supabase
    .from('venue_profiles')
    .insert({
      name: input.name,
      location: input.location || null,
      capacity: input.capacity || null,
      description: input.description || null,
      amenities: input.amenities || null,
      images: input.images || null,
      owner_id: input.ownerId || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create venue: ${error.message}`);
  }

  return data as DbVenueProfile;
}

/**
 * Soft delete a venue
 */
export async function softDeleteVenue(id: string): Promise<void> {
  const { error } = await supabase
    .from('venue_profiles')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete venue: ${error.message}`);
  }
}

/**
 * Search venues
 */
export async function searchVenues(query: string): Promise<DbVenueProfile[]> {
  const { data, error } = await supabase
    .from('venue_profiles')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,location.ilike.%${query}%`)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to search venues: ${error.message}`);
  }

  return data as DbVenueProfile[];
}

/**
 * Get venues by capacity range
 */
export async function getVenuesByCapacity(
  minCapacity?: number,
  maxCapacity?: number
): Promise<DbVenueProfile[]> {
  let query = supabase
    .from('venue_profiles')
    .select('*')
    .eq('is_active', true);

  if (minCapacity !== undefined) {
    query = query.gte('capacity', minCapacity);
  }

  if (maxCapacity !== undefined) {
    query = query.lte('capacity', maxCapacity);
  }

  const { data, error } = await query.order('capacity', { ascending: true });

  if (error) {
    throw new Error(`Failed to get venues by capacity: ${error.message}`);
  }

  return data as DbVenueProfile[];
}
