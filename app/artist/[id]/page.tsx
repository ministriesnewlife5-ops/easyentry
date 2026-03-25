'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  MapPin, Languages, Award, Music, Star, 
  CheckCircle2, Play, Calendar, Briefcase, Globe, 
  Heart, Share2, MessageCircle, Instagram, Youtube, 
  Twitter, Facebook, ArrowLeft, X
} from 'lucide-react';
import { useState } from 'react';

interface ArtistData {
  id: number;
  name: string;
  realName: string;
  role: string;
  verified: boolean;
  location: string;
  openToTravel: boolean;
  rating: number;
  reviews: number;
  memberSince: string;
  responseTime: string;
  hourlyRate: string;
  availability: string;
  languages: string[];
  genres: string[];
  eventsPerformed: number;
  experience: string;
  bio: string;
  profileImage: string;
  coverImage: string;
  videos: { id: string; thumbnail: string; title: string; duration: string }[];
  performances: { id: string; image: string; title: string }[];
  awards: { id: string; title: string; year: string; description: string }[];
  eventTypes: string[];
  socialLinks: {
    instagram: string;
    youtube: string;
    twitter: string;
    facebook: string;
  };
}

const artistsData: Record<string, ArtistData> = {
  '1': {
    id: 1,
    name: 'DJ GOUTHAM',
    realName: 'Goutham Raj',
    role: 'DJ',
    verified: true,
    location: 'Chennai, Tamil Nadu',
    openToTravel: true,
    rating: 4.9,
    reviews: 128,
    memberSince: '5+ years',
    responseTime: '< 1 hour',
    hourlyRate: '35,000+',
    availability: 'Available',
    languages: ['Tamil', 'English', 'Hindi'],
    genres: ['Commercial', 'Bollywood', 'EDM'],
    eventsPerformed: 450,
    experience: '10+ Years',
    bio: 'DJ GOUTHAM is a household name in Chennai\'s nightlife scene. With over a decade of experience, he has headlined the city\'s most iconic venues including Gatsby 2000 and Pasha. Known for his high-energy commercial sets and seamless Bollywood fusion.',
    profileImage: 'https://images.unsplash.com/photo-1574391884720-2e45599e9633?auto=format&fit=crop&q=80&w=400',
    coverImage: 'https://images.unsplash.com/photo-1574391884720-2e45599e9633?auto=format&fit=crop&q=80&w=1200',
    videos: [
      { id: '1', thumbnail: 'https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=400', title: 'Live at Gatsby 2000', duration: '3:45' },
      { id: '2', thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=400', title: 'Pasha Anniversary Night', duration: '5:20' },
      { id: '3', thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=400', title: 'ECR Beach Festival', duration: '4:15' },
      { id: '4', thumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=400', title: 'OMR Club Night', duration: '6:30' },
    ],
    performances: [
      { id: '1', image: 'https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=400', title: 'Gatsby 2000' },
      { id: '2', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=400', title: 'Pasha - The Park' },
      { id: '3', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=400', title: 'The Leather Bar' },
      { id: '4', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=400', title: 'High - Radisson Blu' },
    ],
    awards: [
      { id: '1', title: 'Best Commercial DJ', year: '2023', description: 'Chennai Nightlife Awards' },
      { id: '2', title: 'Most Popular DJ', year: '2022', description: 'Times Food & Nightlife Awards' },
    ],
    eventTypes: [
      'Club Shows',
      'Corporate Events',
      'Weddings', 
      'Private Parties',
      'Festivals',
    ],
    socialLinks: {
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
      twitter: 'https://twitter.com',
      facebook: 'https://facebook.com',
    },
  },
};

export default function ArtistViewProfile() {
  const params = useParams();
  const artistId = params.id as string;
  const artist = artistsData[artistId];
  const [showContactModal, setShowContactModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const shareToWhatsApp = () => {
    if (!artist) return;
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out ${artist.name}'s profile! ` + url)}`, '_blank');
    setShowShareMenu(false);
  };

  const shareToInstagram = () => {
    if (!artist) return;
    const url = window.location.href;
    navigator.clipboard.writeText(`Check out ${artist.name}'s profile! ${url}`);
    alert("Link copied! You can now paste it in Instagram.");
    window.open('https://instagram.com', '_blank');
    setShowShareMenu(false);
  };

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Artist Not Found</h1>
          <Link href="/artist" className="text-[#E5A823] hover:text-[#F5C542]">
            Back to Artists
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
            src={artist.coverImage} 
            alt={artist.name}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#E5A823]/10 to-[#EB4D4B]/10" />
        </div>
        
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <Link 
            href="/artist"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D0D0D]/60 backdrop-blur-md rounded-full text-[#F5F5DC] hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
        
        {/* Top Actions */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button className="p-2 bg-[#0D0D0D]/60 backdrop-blur-md rounded-full hover:bg-[#E5A823] transition-colors">
            <Heart className="w-5 h-5" />
          </button>
          
          <div className="relative flex items-center">
            <AnimatePresence>
              {showShareMenu && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  className="flex items-center gap-2 pr-2"
                >
                  <button
                    onClick={shareToWhatsApp}
                    className="p-2 bg-[#25D366] backdrop-blur-md rounded-full hover:scale-110 transition-transform shadow-lg text-white"
                    title="Share to WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  </button>
                  <button
                    onClick={shareToInstagram}
                    className="p-2 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 backdrop-blur-md rounded-full hover:scale-110 transition-transform shadow-lg text-white"
                    title="Share to Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button onClick={() => setShowShareMenu(!showShareMenu)} className="p-2 bg-[#0D0D0D]/60 backdrop-blur-md rounded-full hover:bg-[#E5A823] transition-colors relative z-10">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-20 relative z-10">
          
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Artist Header Card */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile Image */}
                <div className="relative -mt-16 md:-mt-24 flex-shrink-0">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-[#2A2A2A] border-4 border-[#1A1A1A] overflow-hidden shadow-2xl">
                    <img 
                      src={artist.profileImage} 
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {artist.verified && (
                    <div className="absolute -bottom-2 -right-2 p-1.5 bg-[#E5A823] rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-[#0D0D0D]" />
                    </div>
                  )}
                </div>

                {/* Artist Info */}
                <div className="flex-1 pt-2 md:pt-4">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-[#F5F5DC] flex items-center gap-2">
                        {artist.name}
                        {artist.verified && (
                          <span className="text-sm font-medium text-[#E5A823] bg-[#E5A823]/10 px-2 py-0.5 rounded-full">
                            Verified
                          </span>
                        )}
                      </h1>
                      <p className="text-[#F5F5DC]/60 mt-1">{artist.role}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-[#E5A823]">
                          <Star className="w-5 h-5 fill-[#E5A823]" />
                          <span className="text-xl font-bold">{artist.rating}</span>
                        </div>
                        <p className="text-xs text-[#F5F5DC]/50">({artist.reviews} reviews)</p>
                      </div>
                    </div>
                  </div>

                  {/* Location & Travel */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-1.5 text-[#F5F5DC]/70">
                      <MapPin className="w-4 h-4 text-[#E5A823]" />
                      {artist.location}
                    </div>
                    {artist.openToTravel && (
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Open to Travel
                      </span>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-6 pt-6 border-t border-[#2A2A2A]">
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">{artist.experience}</p>
                      <p className="text-xs text-[#F5F5DC]/50">Experience</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">{artist.eventsPerformed}+</p>
                      <p className="text-xs text-[#F5F5DC]/50">Events</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">{artist.memberSince}</p>
                      <p className="text-xs text-[#F5F5DC]/50">Member</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">{artist.responseTime}</p>
                      <p className="text-xs text-[#F5F5DC]/50">Response</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">{artist.languages.length}</p>
                      <p className="text-xs text-[#F5F5DC]/50">Languages</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-[#E5A823]">{artist.awards.length}</p>
                      <p className="text-xs text-[#F5F5DC]/50">Awards</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#E5A823]" />
                About Artist
              </h2>
              <p className="text-[#F5F5DC]/80 leading-relaxed">
                {artist.bio}
              </p>
            </div>

            {/* Videos Section */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-[#E5A823]" />
                Video Glimpses
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {artist.videos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative aspect-video rounded-xl overflow-hidden bg-[#2A2A2A] group cursor-pointer"
                  >
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#E5A823] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 text-[#0D0D0D] ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-[#0D0D0D]/80 rounded text-xs text-[#F5F5DC]">
                      {video.duration}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Past Performances */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <h2 className="text-xl font-bold mb-4">Past Performances</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {artist.performances.map((perf, index) => (
                  <motion.div
                    key={perf.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#2A2A2A] group cursor-pointer"
                  >
                    <img 
                      src={perf.image} 
                      alt={perf.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-sm font-medium text-[#F5F5DC]">{perf.title}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Awards Section */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#E5A823]" />
                Awards & Recognition
              </h2>
              <div className="space-y-3">
                {artist.awards.map((award, index) => (
                  <motion.div
                    key={award.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-4 p-4 bg-[#2A2A2A] rounded-xl"
                  >
                    <div className="p-2 bg-[#E5A823]/20 rounded-lg flex-shrink-0">
                      <Award className="w-5 h-5 text-[#E5A823]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#F5F5DC]">{award.title}</h3>
                        <span className="text-xs text-[#E5A823] bg-[#E5A823]/10 px-2 py-0.5 rounded">
                          {award.year}
                        </span>
                      </div>
                      <p className="text-sm text-[#F5F5DC]/60 mt-1">{award.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Event Types */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
              <h2 className="text-xl font-bold mb-4">Performs At</h2>
              <div className="flex flex-wrap gap-2">
                {artist.eventTypes.map((type) => (
                  <span
                    key={type}
                    className="px-4 py-2 bg-[#2A2A2A] text-[#F5F5DC]/80 rounded-full text-sm"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Booking Card */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                {/* Rate & Availability */}
                <div className="mb-6">
                  <p className="text-sm text-[#F5F5DC]/60 mb-1">Starting from</p>
                  <p className="text-3xl font-bold text-[#E5A823]">₹ {artist.hourlyRate}</p>
                  <p className="text-xs text-[#F5F5DC]/50">per event</p>
                </div>

                <div className="flex items-center gap-2 mb-6 p-3 bg-green-500/10 rounded-xl">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-green-400 font-medium">
                    {artist.availability}
                  </span>
                </div>

                {/* Action Buttons */}
                <button 
                  onClick={() => setShowContactModal(true)}
                  className="w-full py-4 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#E5A823]/20 transition-shadow mb-3"
                >
                  <Calendar className="w-5 h-5" />
                  Book Now
                </button>

                <button className="w-full py-3 bg-[#2A2A2A] text-[#F5F5DC] font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-[#3A3A3A] transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  Send Message
                </button>

                {/* Trust Badge */}
                <div className="mt-6 p-4 bg-[#0D0D0D] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-medium text-[#F5F5DC]">Easy Entry Verified</span>
                  </div>
                  <p className="text-xs text-[#F5F5DC]/50">
                    This artist has been verified by our team
                  </p>
                </div>
              </div>

              {/* Languages & Genres */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Languages className="w-4 h-4 text-[#E5A823]" />
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {artist.languages.map((lang) => (
                    <span key={lang} className="px-3 py-1 bg-[#2A2A2A] rounded-full text-sm text-[#F5F5DC]/80">
                      {lang}
                    </span>
                  ))}
                </div>

                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#E5A823]" />
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {artist.genres.map((genre) => (
                    <span key={genre} className="px-3 py-1 bg-[#E5A823]/10 text-[#E5A823] rounded-full text-sm">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="font-semibold mb-4">Follow</h3>
                <div className="flex gap-3">
                  <a href={artist.socialLinks.instagram} className="p-3 bg-[#2A2A2A] rounded-xl hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a href={artist.socialLinks.youtube} className="p-3 bg-[#2A2A2A] rounded-xl hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors">
                    <Youtube className="w-5 h-5" />
                  </a>
                  <a href={artist.socialLinks.twitter} className="p-3 bg-[#2A2A2A] rounded-xl hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a href={artist.socialLinks.facebook} className="p-3 bg-[#2A2A2A] rounded-xl hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors">
                    <Facebook className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Safety Note */}
              <div className="p-4 bg-[#E5A823]/5 border border-[#E5A823]/20 rounded-xl">
                <p className="text-xs text-[#E5A823]/80">
                  <Star className="w-3 h-3 inline mr-1" />
                  Pay only 5% as advance to confirm booking. Balance payable post event.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1A1A] rounded-2xl p-8 max-w-md w-full border border-[#2A2A2A] relative"
          >
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[#2A2A2A] rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[#F5F5DC]/60" />
            </button>

            <h2 className="text-2xl font-bold mb-2">Book {artist.name}</h2>
            <p className="text-[#F5F5DC]/60 mb-6">Fill in your details and we will connect you with the artist</p>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
              />
              <input
                type="date"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
              />
              <textarea
                placeholder="Event Details"
                rows={3}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] resize-none"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 py-3 bg-[#2A2A2A] text-[#F5F5DC] font-medium rounded-xl hover:bg-[#3A3A3A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-xl"
              >
                Send Request
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
