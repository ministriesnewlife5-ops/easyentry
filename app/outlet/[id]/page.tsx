'use client';

import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  MapPin, Star, CheckCircle2, Calendar, 
  Briefcase, Globe, Heart, Share2, 
  Instagram, Twitter, Facebook, ArrowLeft,
  Building2, Users, Clock, Zap, Music
} from 'lucide-react';
import { useState } from 'react';

interface OutletData {
  id: number;
  name: string;
  venueName: string;
  venueType: string;
  verified: boolean;
  location: string;
  rating: number;
  reviews: number;
  memberSince: string;
  responseTime: string;
  capacity: string;
  eventsHosted: number;
  bio: string;
  profileImage: string;
  coverImage: string;
  amenities: string[];
  website: string;
  socialLinks: {
    instagram: string;
    twitter: string;
    facebook: string;
  };
}

const outletsData: Record<string, OutletData> = {
  '1': {
    id: 1,
    name: 'Pasha - The Park',
    venueName: 'Pasha',
    venueType: 'Nightclub / Lounge',
    verified: true,
    location: 'Nungambakkam, Chennai',
    rating: 4.9,
    reviews: 215,
    memberSince: '10+ years',
    responseTime: '< 30 mins',
    capacity: '350 - 500',
    eventsHosted: 1500,
    bio: 'Pasha is the crown jewel of Chennai nightlife. Located within The Park, Chennai, this iconic venue has been the epicenter of luxury clubbing for over a decade. Featuring state-of-the-art sound systems, a dedicated VIP lounge, and a unique Persian-inspired decor.',
    profileImage: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=400',
    coverImage: 'https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=1200',
    amenities: [
      'Valet Parking',
      'VIP Lounge',
      'Smoking Area',
      'Full Bar',
      'DJ Booth',
      'Dance Floor'
    ],
    website: 'https://theparkhotels.com/chennai/pasha',
    socialLinks: {
      instagram: 'https://instagram.com',
      twitter: 'https://twitter.com',
      facebook: 'https://facebook.com',
    },
  },
};

export default function OutletViewProfile() {
  const params = useParams();
  const outletId = params.id as string;
  const outlet = outletsData[outletId];

  if (!outlet) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Outlet Not Found</h1>
          <Link href="/events" className="text-[#E5A823] hover:text-[#F5C542]">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      {/* Cover Image */}
      <div className="relative h-72 md:h-96 w-full">
        <div className="absolute inset-0 bg-[#1A1A1A]">
          <img 
            src={outlet.coverImage} 
            alt={outlet.venueName}
            className="w-full h-full object-cover opacity-60"
          />
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
                    <img 
                      src={outlet.profileImage} 
                      alt={outlet.venueName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {outlet.verified && (
                    <div className="absolute -bottom-2 -right-2 p-1.5 bg-[#E5A823] rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-[#0D0D0D]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 pt-2 md:pt-4">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-[#F5F5DC] flex items-center gap-2">
                        {outlet.venueName}
                        {outlet.verified && (
                          <span className="text-sm font-medium text-[#E5A823] bg-[#E5A823]/10 px-2 py-0.5 rounded-full">
                            Verified Outlet
                          </span>
                        )}
                      </h1>
                      <p className="text-[#F5F5DC]/60 mt-1">{outlet.venueType}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-[#E5A823]">
                          <Star className="w-5 h-5 fill-[#E5A823]" />
                          <span className="text-xl font-bold">{outlet.rating}</span>
                        </div>
                        <p className="text-xs text-[#F5F5DC]/50">({outlet.reviews} reviews)</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-1.5 text-[#F5F5DC]/70">
                      <MapPin className="w-4 h-4 text-[#E5A823]" />
                      {outlet.location}
                    </div>
                    <div className="flex items-center gap-1.5 text-[#F5F5DC]/70">
                      <Globe className="w-4 h-4 text-[#E5A823]" />
                      {outlet.website}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#2A2A2A]">
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">{outlet.capacity}</p>
                      <p className="text-xs text-[#F5F5DC]/50">Capacity</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">{outlet.eventsHosted}+</p>
                      <p className="text-xs text-[#F5F5DC]/50">Events Hosted</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">{outlet.memberSince}</p>
                      <p className="text-xs text-[#F5F5DC]/50">Member Since</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">{outlet.responseTime}</p>
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
                {outlet.bio}
              </p>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#E5A823]" />
                Amenities
              </h2>
              <div className="flex flex-wrap gap-2">
                {outlet.amenities.map((amenity) => (
                  <span key={amenity} className="px-3 py-1 bg-[#2A2A2A] rounded-full text-sm text-[#F5F5DC]/80">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <button className="w-full py-3 bg-[#E5A823] text-[#0D0D0D] font-bold rounded-xl hover:bg-[#F5C542] transition-colors mb-4">
                Inquire for Booking
              </button>
              <div className="flex justify-center gap-4">
                <Link href={outlet.socialLinks.instagram} className="p-2 bg-[#2A2A2A] rounded-full hover:text-[#E5A823] transition-colors">
                  <Instagram className="w-5 h-5" />
                </Link>
                <Link href={outlet.socialLinks.twitter} className="p-2 bg-[#2A2A2A] rounded-full hover:text-[#E5A823] transition-colors">
                  <Twitter className="w-5 h-5" />
                </Link>
                <Link href={outlet.socialLinks.facebook} className="p-2 bg-[#2A2A2A] rounded-full hover:text-[#E5A823] transition-colors">
                  <Facebook className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
