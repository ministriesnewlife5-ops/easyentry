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
  createdAt: string;
  updatedAt: string;
};

type VenueInput = Omit<VenueProfile, 'id' | 'createdAt' | 'updatedAt'>;

const globalStore = globalThis as unknown as {
  venueProfiles?: VenueProfile[];
};

let venueIdCounter = 1;

const initialVenues: VenueProfile[] = [
  {
    id: '1',
    userId: '3',
    venueName: 'Gatsby 2000',
    venueType: 'Nightclub',
    email: 'contact@gatsby2000.com',
    phone: '+91 98765 43210',
    location: 'Chennai, Tamil Nadu',
    bio: 'A premier nightclub experience with state-of-the-art sound and lighting. Gatsby 2000 has been the heart of Chennai\'s nightlife for over a decade.',
    capacity: '500',
    website: 'https://gatsby2000.com',
    instagram: '@gatsby2000',
    twitter: '@gatsby2000',
    facebook: 'Gatsby2000Chennai',
    imageUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=800',
    coverImage: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&q=80&w=1200',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    userId: 'system',
    venueName: 'Pasha - The Park',
    venueType: 'Lounge & Bar',
    email: 'pasha@thepark.com',
    phone: '+91 98765 43211',
    location: 'Chennai, Tamil Nadu',
    bio: 'Sophisticated lounge with premium cocktails and live music. Pasha offers an elegant atmosphere perfect for after-work drinks.',
    capacity: '300',
    website: 'https://thepark.com/pasha',
    instagram: '@pashachennai',
    twitter: '',
    facebook: 'PashaChennai',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=800',
    coverImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1200',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    userId: 'system',
    venueName: 'High - Radisson Blu',
    venueType: 'Rooftop Bar',
    email: 'high@radisson.com',
    phone: '+91 98765 43212',
    location: 'Chennai, Tamil Nadu',
    bio: 'Stunning rooftop venue with panoramic city views and craft cocktails.',
    capacity: '200',
    website: 'https://radisson.com/high',
    instagram: '@highradisson',
    twitter: '',
    facebook: 'HighRadisson',
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800',
    coverImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1200',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    userId: 'system',
    venueName: 'The Leather Bar',
    venueType: 'Pub & Grill',
    email: 'info@theleatherbar.com',
    phone: '+91 98765 43213',
    location: 'Chennai, Tamil Nadu',
    bio: 'Classic pub atmosphere with leather furnishings and craft beers.',
    capacity: '250',
    website: 'https://theleatherbar.com',
    instagram: '@theleatherbar',
    twitter: '',
    facebook: 'TheLeatherBarChennai',
    imageUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&q=80&w=800',
    coverImage: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&q=80&w=1200',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    userId: 'system',
    venueName: '10 Downing Street',
    venueType: 'Pub',
    email: 'info@10dschennai.com',
    phone: '+91 98765 43214',
    location: 'Chennai, Tamil Nadu',
    bio: 'British-themed pub with live sports screening and pub grub.',
    capacity: '400',
    website: 'https://10dschennai.com',
    instagram: '@10dschennai',
    twitter: '',
    facebook: '10DSChennai',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=800',
    coverImage: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&q=80&w=1200',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    userId: 'system',
    venueName: 'Hilton Chennai Ballroom',
    venueType: 'Banquet Hall',
    email: 'events@hiltonchennai.com',
    phone: '+91 98765 43215',
    location: 'Chennai, Tamil Nadu',
    bio: 'Elegant ballroom space perfect for corporate events and weddings.',
    capacity: '800',
    website: 'https://hiltonchennai.com',
    instagram: '@hiltonchennai',
    twitter: '',
    facebook: 'HiltonChennai',
    imageUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=800',
    coverImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1200',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '7',
    userId: 'system',
    venueName: 'The Flying Elephant',
    venueType: 'Fine Dining',
    email: 'reservations@theflyingelephant.com',
    phone: '+91 98765 43216',
    location: 'Chennai, Tamil Nadu',
    bio: 'Upscale restaurant with private dining rooms for exclusive events.',
    capacity: '150',
    website: 'https://theflyingelephant.com',
    instagram: '@theflyingelephant',
    twitter: '',
    facebook: 'TheFlyingElephant',
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800',
    coverImage: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&q=80&w=1200',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '8',
    userId: 'system',
    venueName: 'Amber Lounge',
    venueType: 'Lounge',
    email: 'amber@hyatt.com',
    phone: '+91 98765 43217',
    location: 'Chennai, Tamil Nadu',
    bio: 'Intimate lounge setting with signature cocktails and small plates.',
    capacity: '120',
    website: 'https://hyatt.com/amber',
    instagram: '@amberloungechennai',
    twitter: '',
    facebook: 'AmberLoungeChennai',
    imageUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&q=80&w=800',
    coverImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1200',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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
