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

const globalStore = globalThis as unknown as {
  venueProfiles?: VenueProfile[];
};

let venueIdCounter = 1;

const initialVenues: VenueProfile[] = [];

export const venueProfiles = globalStore.venueProfiles ?? [...initialVenues];

if (!globalStore.venueProfiles) {
  globalStore.venueProfiles = venueProfiles;
}

export function getAllVenues(): VenueProfile[] {
  return [...venueProfiles];
}

export function getVenueById(id: string): VenueProfile | undefined {
  return venueProfiles.find((v) => v.id === id);
}

export function getVenueByUserId(userId: string): VenueProfile | undefined {
  return venueProfiles.find((v) => v.userId === userId);
}

export function createVenue(venue: VenueInput): VenueProfile {
  const newVenue: VenueProfile = {
    ...venue,
    id: String(venueIdCounter++),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  venueProfiles.push(newVenue);
  return newVenue;
}

export function updateVenue(id: string, updates: Partial<VenueInput>): VenueProfile | null {
  const index = venueProfiles.findIndex((v) => v.id === id);
  if (index === -1) return null;
  
  venueProfiles[index] = {
    ...venueProfiles[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return venueProfiles[index];
}

export function updateVenueByUserId(userId: string, updates: Partial<VenueInput>): VenueProfile | null {
  const index = venueProfiles.findIndex((v) => v.userId === userId);
  if (index === -1) {
    // Create new venue for this user
    const newVenue: VenueProfile = {
      id: String(venueIdCounter++),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    venueProfiles.push(newVenue);
    return newVenue;
  }
  
  venueProfiles[index] = {
    ...venueProfiles[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return venueProfiles[index];
}

export function deleteVenue(id: string): boolean {
  const index = venueProfiles.findIndex((v) => v.id === id);
  if (index === -1) return false;
  venueProfiles.splice(index, 1);
  return true;
}
