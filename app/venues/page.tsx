'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Users, Globe, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

type Venue = {
  id: string;
  venueName: string;
  venueType: string;
  location: string;
  capacity: string;
  bio: string;
  imageUrl: string | null;
  website: string;
};

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/venues');
      const data = await response.json();
      
      if (response.ok) {
        setVenues(data.venues);
      } else {
        setError(data.error || 'Failed to fetch venues');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5A823]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchVenues}
            className="px-4 py-2 bg-[#E5A823] text-[#0D0D0D] rounded-lg font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      {/* Header */}
      <div className="bg-[#0D0D0D] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold text-[#E5A823] mb-2">Venues</h1>
            <p className="text-[#F5F5DC]/70">Discover the best clubs, bars, and event spaces in Chennai</p>
          </motion.div>
        </div>
      </div>

      {/* Venues Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {venues.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 text-[#F5F5DC]/30 mx-auto mb-4" />
            <p className="text-[#F5F5DC]/50 text-lg">No venues available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {venues.map((venue, index) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
              >
                <Link href={`/venue/${venue.id}`}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    className="group bg-[#1A1A1A] rounded-2xl overflow-hidden border border-[#2A2A2A] hover:border-[#E5A823]/50 transition-all cursor-pointer"
                  >
                    {/* Venue Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={venue.imageUrl || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=800'}
                        alt={venue.venueName}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent" />
                      <div className="absolute top-3 right-3">
                        <span className="px-3 py-1 bg-[#E5A823] text-[#0D0D0D] text-xs font-bold rounded-full">
                          {venue.venueType || 'Venue'}
                        </span>
                      </div>
                    </div>

                    {/* Venue Info */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-[#F5F5DC] group-hover:text-[#E5A823] transition-colors mb-2">
                        {venue.venueName}
                      </h3>

                      <div className="space-y-2 text-sm text-[#F5F5DC]/60">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#E5A823]" />
                          <span className="truncate">{venue.location || 'Chennai, Tamil Nadu'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#E5A823]" />
                          <span>Capacity: {venue.capacity || 'N/A'}</span>
                        </div>
                        {venue.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-[#E5A823]" />
                            <span className="truncate">{venue.website.replace('https://', '')}</span>
                          </div>
                        )}
                      </div>

                      <p className="mt-3 text-sm text-[#F5F5DC]/50 line-clamp-2">
                        {venue.bio || 'No description available'}
                      </p>

                      {/* View Details */}
                      <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex items-center justify-between">
                        <span className="text-sm font-medium text-[#E5A823]">View Profile</span>
                        <ArrowRight className="w-4 h-4 text-[#E5A823] group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
