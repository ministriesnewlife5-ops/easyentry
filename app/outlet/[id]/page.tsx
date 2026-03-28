'use client';

import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  MapPin, Star, CheckCircle2, Calendar, 
  Briefcase, Globe, Heart, Share2, 
  Instagram, Twitter, Facebook, ArrowLeft,
  Building2, Users, Clock, Zap, Music, Phone, Mail, Loader2, DollarSign
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface VenueProfile {
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
}

export default function OutletViewProfile() {
  const params = useParams();
  const outletId = params.id as string;
  const { data: session } = useSession();
  
  const [outlet, setOutlet] = useState<VenueProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOutlet = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/venue/${outletId}`);
        const data = await response.json();

        if (response.ok && data.venue) {
          setOutlet(data.venue);
        } else {
          setError(data.error || 'Outlet not found');
        }
      } catch (err) {
        setError('Failed to fetch outlet details');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (outletId) {
      fetchOutlet();
    }
  }, [outletId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5A823]" />
      </div>
    );
  }

  if (error || !outlet) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{error || 'Outlet Not Found'}</h1>
          <Link href="/events" className="text-[#E5A823] hover:text-[#F5C542]">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = session?.user?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      {/* Cover Image */}
      <div className="relative h-72 md:h-96 w-full">
        <div className="absolute inset-0 bg-[#1A1A1A]">
          {outlet.coverImage ? (
            <img 
              src={outlet.coverImage} 
              alt={outlet.venueName}
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full bg-[#1A1A1A]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/50 to-transparent" />
        </div>
        
        <div className="absolute top-4 left-4 z-10">
          <Link 
            href="/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D0D0D]/60 backdrop-blur-md rounded-full text-[#F5F5DC] hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-20 relative z-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative -mt-16 md:-mt-24 flex-shrink-0">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-[#2A2A2A] border-4 border-[#1A1A1A] overflow-hidden shadow-2xl">
                    {outlet.imageUrl ? (
                      <img 
                        src={outlet.imageUrl} 
                        alt={outlet.venueName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#2A2A2A]">
                        <Building2 className="w-12 h-12 text-[#E5A823]/50" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 p-1.5 bg-[#E5A823] rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-[#0D0D0D]" />
                  </div>
                </div>

                <div className="flex-1 pt-2 md:pt-4">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-[#F5F5DC] flex items-center gap-2">
                        {outlet.venueName}
                        <span className="text-sm font-medium text-[#E5A823] bg-[#E5A823]/10 px-2 py-0.5 rounded-full">
                          Verified Outlet
                        </span>
                      </h1>
                      <p className="text-[#F5F5DC]/60 mt-1">{outlet.venueType}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-[#E5A823]">
                          <Star className="w-5 h-5 fill-[#E5A823]" />
                          <span className="text-xl font-bold">4.9</span>
                        </div>
                        <p className="text-xs text-[#F5F5DC]/50">(0 reviews)</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-1.5 text-[#F5F5DC]/70">
                      <MapPin className="w-4 h-4 text-[#E5A823]" />
                      {outlet.location}
                    </div>
                    {outlet.website && (
                      <div className="flex items-center gap-1.5 text-[#F5F5DC]/70">
                        <Globe className="w-4 h-4 text-[#E5A823]" />
                        <a href={outlet.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#E5A823] transition-colors">
                          {outlet.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#2A2A2A]">
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">{outlet.capacity || 'N/A'}</p>
                      <p className="text-xs text-[#F5F5DC]/50">Capacity</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">0+</p>
                      <p className="text-xs text-[#F5F5DC]/50">Events Hosted</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">2024</p>
                      <p className="text-xs text-[#F5F5DC]/50">Member Since</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">&lt; 30 mins</p>
                      <p className="text-xs text-[#F5F5DC]/50">Response Time</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#E5A823]" />
                About Outlet
              </h2>
              <p className="text-[#F5F5DC]/80 leading-relaxed">
                {outlet.bio || 'No description available.'}
              </p>
            </div>

            {/* Admin Only: Contacts Section */}
            {isAdmin && (
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border-2 border-[#E5A823]/30">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#E5A823]">
                  <Phone className="w-5 h-5" />
                  Venue Contacts (Admin Only)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {outlet.firstPointContact && (
                    <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#3A3A3A]">
                      <p className="text-[#E5A823] font-bold text-sm mb-2">First Point Contact</p>
                      <p className="font-medium">{outlet.firstPointContact.name}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/60">
                          <Mail className="w-3 h-3" /> {outlet.firstPointContact.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/60">
                          <Phone className="w-3 h-3" /> {outlet.firstPointContact.phone}
                        </div>
                      </div>
                    </div>
                  )}

                  {outlet.fnbManagerContact && (
                    <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#3A3A3A]">
                      <p className="text-[#E5A823] font-bold text-sm mb-2">F&B Manager</p>
                      <p className="font-medium">{outlet.fnbManagerContact.name}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/60">
                          <Mail className="w-3 h-3" /> {outlet.fnbManagerContact.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/60">
                          <Phone className="w-3 h-3" /> {outlet.fnbManagerContact.phone}
                        </div>
                      </div>
                    </div>
                  )}

                  {outlet.financeContact && (
                    <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#3A3A3A]">
                      <p className="text-[#E5A823] font-bold text-sm mb-2">Finance Contact</p>
                      <p className="font-medium">{outlet.financeContact.name}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/60">
                          <Mail className="w-3 h-3" /> {outlet.financeContact.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/60">
                          <Phone className="w-3 h-3" /> {outlet.financeContact.phone}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {outlet.venueImages && outlet.venueImages.length > 0 && (
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#E5A823]" />
                  Venue Gallery
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {outlet.venueImages.map((image, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-[#2A2A2A]">
                      <img src={image} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <button className="w-full py-3 bg-[#E5A823] text-[#0D0D0D] font-bold rounded-xl hover:bg-[#F5C542] transition-colors mb-4">
                Inquire for Booking
              </button>
              <div className="flex justify-center gap-4">
                {outlet.instagram && (
                  <a href={outlet.instagram.startsWith('@') ? `https://instagram.com/${outlet.instagram.slice(1)}` : outlet.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#2A2A2A] rounded-full hover:text-[#E5A823] transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {outlet.twitter && (
                  <a href={outlet.twitter.startsWith('@') ? `https://twitter.com/${outlet.twitter.slice(1)}` : outlet.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#2A2A2A] rounded-full hover:text-[#E5A823] transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {outlet.facebook && (
                  <a href={outlet.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#2A2A2A] rounded-full hover:text-[#E5A823] transition-colors">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
