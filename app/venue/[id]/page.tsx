'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  MapPin, Globe, Users, Mail, Phone, 
  Instagram, Facebook, ArrowLeft, Building2,
  Calendar, Music, Star, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

type Venue = {
  id: string;
  venueName: string;
  venueType: string;
  location: string;
  capacity: string;
  bio: string;
  imageUrl: string | null;
  coverImage: string | null;
  email: string;
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  twitter: string;
};

// Sample upcoming events at this venue
const upcomingEvents = [
  { id: 1, title: 'Friday Night Live', date: '2026-04-15', time: '20:00', price: '₹1500' },
  { id: 2, title: 'DJ Night Special', date: '2026-04-16', time: '21:00', price: '₹2000' },
  { id: 3, title: 'Comedy Open Mic', date: '2026-04-18', time: '19:30', price: '₹500' },
];

export default function VenueProfilePage() {
  const params = useParams();
  const venueId = params.id as string;
  const [activeTab, setActiveTab] = useState<'about' | 'events'>('about');
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (venueId) {
      fetchVenue();
    }
  }, [venueId]);

  const fetchVenue = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/venue/${venueId}`);
      const data = await response.json();
      
      if (response.ok) {
        setVenue(data.venue);
      } else {
        setError(data.error || 'Failed to fetch venue');
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

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-[#E5A823] mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{error ? 'Error' : 'Venue Not Found'}</h1>
          <p className="text-[#F5F5DC]/60 mb-6">{error || 'The venue you are looking for does not exist.'}</p>
          <Link href="/venues">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-[#E5A823] text-[#0D0D0D] font-bold rounded-full"
            >
              Back to Venues
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      {/* Cover Image */}
      <div className="relative h-72 md:h-96">
        <img
          src={venue.coverImage || venue.imageUrl || 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&q=80&w=1200'}
          alt={venue.venueName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/50 to-transparent" />
        
        {/* Back Button */}
        <Link href="/venues">
          <motion.button
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
            className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 bg-[#0D0D0D]/80 backdrop-blur-sm rounded-full text-[#F5F5DC] hover:bg-[#0D0D0D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Venues
          </motion.button>
        </Link>

        {/* Venue Type Badge */}
        <div className="absolute top-6 right-6">
          <span className="px-4 py-2 bg-[#E5A823] text-[#0D0D0D] font-bold rounded-full">
            {venue.venueType || 'Venue'}
          </span>
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative -mt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          {/* Venue Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative w-40 h-40 rounded-2xl overflow-hidden border-4 border-[#0D0D0D] bg-[#1A1A1A]"
          >
            <img
              src={venue.imageUrl || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=800'}
              alt={venue.venueName}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Venue Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1 pb-4"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-[#F5F5DC] mb-2">{venue.venueName}</h1>
            <div className="flex flex-wrap items-center gap-4 text-[#F5F5DC]/70">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#E5A823]" />
                <span>{venue.location || 'Chennai, Tamil Nadu'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-[#E5A823]" />
                <span>Capacity: {venue.capacity || 'N/A'}</span>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex gap-3 pb-4"
          >
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-[#E5A823] text-[#0D0D0D] font-bold rounded-full flex items-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Visit Website
                </motion.button>
              </a>
            )}
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex gap-8 border-b border-[#2A2A2A]">
          {[
            { id: 'about', label: 'About', icon: Building2 },
            { id: 'events', label: 'Upcoming Events', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#E5A823] text-[#E5A823]'
                  : 'border-transparent text-[#F5F5DC]/60 hover:text-[#F5F5DC]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'about' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* About Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#E5A823]" />
                  About {venue.venueName}
                </h2>
                <p className="text-[#F5F5DC]/80 leading-relaxed">{venue.bio || 'No description available.'}</p>
              </div>

              {/* Events Preview */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Music className="w-5 h-5 text-[#E5A823]" />
                    Featured Events
                  </h2>
                  <button 
                    onClick={() => setActiveTab('events')}
                    className="text-sm text-[#E5A823] hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {upcomingEvents.slice(0, 2).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-[#2A2A2A] rounded-xl">
                      <div>
                        <h3 className="font-bold text-[#F5F5DC]">{event.title}</h3>
                        <p className="text-sm text-[#F5F5DC]/60">{event.date} • {event.time}</p>
                      </div>
                      <span className="text-[#E5A823] font-bold">{event.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact & Social Sidebar */}
            <div className="space-y-6">
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h2 className="text-lg font-bold mb-4">Contact Information</h2>
                <div className="space-y-4">
                  {venue.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2A2A2A] rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4 text-[#E5A823]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#F5F5DC]/50">Email</p>
                        <p className="text-sm text-[#F5F5DC]">{venue.email}</p>
                      </div>
                    </div>
                  )}
                  {venue.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2A2A2A] rounded-full flex items-center justify-center">
                        <Phone className="w-4 h-4 text-[#E5A823]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#F5F5DC]/50">Phone</p>
                        <p className="text-sm text-[#F5F5DC]">{venue.phone}</p>
                      </div>
                    </div>
                  )}
                  {venue.website && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2A2A2A] rounded-full flex items-center justify-center">
                        <Globe className="w-4 h-4 text-[#E5A823]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#F5F5DC]/50">Website</p>
                        <a 
                          href={venue.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-[#E5A823] hover:underline"
                        >
                          {venue.website.replace('https://', '')}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h2 className="text-lg font-bold mb-4">Social Media</h2>
                <div className="flex gap-3">
                  {venue.instagram && (
                    <a
                      href={`https://instagram.com/${venue.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-[#2A2A2A] rounded-full flex items-center justify-center hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {venue.facebook && (
                    <a
                      href={`https://facebook.com/${venue.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-[#2A2A2A] rounded-full flex items-center justify-center hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h2 className="text-lg font-bold mb-4">Quick Stats</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-[#2A2A2A] rounded-xl">
                    <Users className="w-6 h-6 text-[#E5A823] mx-auto mb-2" />
                    <p className="text-2xl font-bold">{venue.capacity || 'N/A'}</p>
                    <p className="text-xs text-[#F5F5DC]/50">Capacity</p>
                  </div>
                  <div className="text-center p-4 bg-[#2A2A2A] rounded-xl">
                    <Star className="w-6 h-6 text-[#E5A823] mx-auto mb-2" />
                    <p className="text-2xl font-bold">4.8</p>
                    <p className="text-xs text-[#F5F5DC]/50">Rating</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'events' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold mb-6">Upcoming Events at {venue.venueName}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] hover:border-[#E5A823]/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-[#E5A823]/20 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-[#E5A823]" />
                    </div>
                    <span className="px-3 py-1 bg-[#E5A823] text-[#0D0D0D] text-sm font-bold rounded-full">
                      {event.price}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#F5F5DC] mb-2">{event.title}</h3>
                  <p className="text-sm text-[#F5F5DC]/60 mb-4">{event.date} • {event.time}</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-xl"
                  >
                    Book Tickets
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
