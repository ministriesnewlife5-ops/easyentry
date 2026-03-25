'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import BrowseFilters from '@/components/ui/BrowseFilters';
import PromoBanner from '@/components/ui/PromoBanner';
import EventCard from '@/components/ui/EventCard';
import { ArrowRight } from 'lucide-react';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { getHostedEvents } from '@/lib/hosted-events';

// DJ Lighting Animation Component
const DJLightingEffects = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
      {/* Rotating Spotlights from Top */}
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 left-1/4 w-32 h-32"
      >
        <div className="absolute top-0 w-2 h-2 bg-white rounded-full blur-sm" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-96 bg-gradient-to-b from-[#E5A823] via-[#E5A823]/50 to-transparent opacity-60 blur-sm" />
      </motion.div>
      
      <motion.div
        animate={{ rotate: [0, -360] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 right-1/3 w-32 h-32"
      >
        <div className="absolute top-0 w-2 h-2 bg-white rounded-full blur-sm" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-96 bg-gradient-to-b from-[#EB4D4B] via-[#EB4D4B]/50 to-transparent opacity-60 blur-sm" />
      </motion.div>
      
      <motion.div
        animate={{ rotate: [-30, 30, -30] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32"
      >
        <div className="absolute top-0 w-3 h-3 bg-white rounded-full blur-md" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-[30rem] bg-gradient-to-b from-[#E5A823] via-[#F5C542]/60 to-transparent opacity-80 blur-md" />
      </motion.div>

      {/* Side Stage Lights */}
      <motion.div
        animate={{ 
          opacity: [0.3, 0.8, 0.3],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-10 w-20 h-20"
      >
        <div className="w-full h-full rounded-full bg-[#E5A823] blur-[40px] opacity-50" />
      </motion.div>
      
      <motion.div
        animate={{ 
          opacity: [0.3, 0.8, 0.3],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-1/2 right-10 w-20 h-20"
      >
        <div className="w-full h-full rounded-full bg-[#EB4D4B] blur-[40px] opacity-50" />
      </motion.div>

      {/* Moving Light Beams */}
      <motion.div
        animate={{ 
          x: ["-10%", "110%"],
          opacity: [0, 0.6, 0]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-0 w-32 h-[500px] bg-gradient-to-r from-transparent via-[#E5A823]/30 to-transparent -rotate-12 blur-sm"
      />
      
      <motion.div
        animate={{ 
          x: ["110%", "-10%"],
          opacity: [0, 0.6, 0]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-1/3 right-0 w-32 h-[500px] bg-gradient-to-r from-transparent via-[#EB4D4B]/30 to-transparent rotate-12 blur-sm"
      />

      {/* Strobe Effects */}
      <motion.div
        animate={{ opacity: [0, 0.3, 0, 0.5, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        className="absolute inset-0 bg-[#E5A823]/10 mix-blend-overlay"
      />
      
      <motion.div
        animate={{ opacity: [0, 0.2, 0, 0.4, 0] }}
        transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 4, delay: 1 }}
        className="absolute inset-0 bg-[#EB4D4B]/10 mix-blend-overlay"
      />

      {/* Laser Beams */}
      <motion.div
        animate={{ 
          height: ["0%", "100%", "0%"],
          opacity: [0, 0.8, 0]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-1/3 w-0.5 bg-gradient-to-b from-[#E5A823] to-transparent blur-sm"
      />
      
      <motion.div
        animate={{ 
          height: ["0%", "100%", "0%"],
          opacity: [0, 0.8, 0]
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute top-0 right-1/3 w-0.5 bg-gradient-to-b from-[#EB4D4B] to-transparent blur-sm"
      />
    </div>
  );
};

const events = [
  {
    id: 1,
    title: 'Namma Chennai Night with DJ Goutham',
    date: '2026-07-01',
    venue: 'Gatsby 2000',
    price: '₹1500',
    imageColor: 'bg-red-900',
    category: 'Commercial',
    imageUrl: 'https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 2,
    title: 'Electronic City Beats | Night 2',
    date: '2026-05-30',
    venue: 'Pasha - The Park',
    price: '₹2000',
    imageColor: 'bg-green-900',
    category: 'EDM',
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 3,
    title: 'The Great Indian Party',
    date: '2026-03-14',
    venue: 'High - Radisson Blu',
    price: '₹1200',
    imageColor: 'bg-pink-600',
    category: 'Bollywood',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 4,
    title: 'Techno Night at OMR',
    date: '2026-04-18',
    venue: 'The Leather Bar',
    price: '₹1800',
    imageColor: 'bg-red-700',
    category: 'Techno',
    imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 5,
    title: 'Live Fusion Night',
    date: '2026-06-12',
    venue: 'Illusions - The Madras Pub',
    price: '₹1000',
    imageColor: 'bg-blue-800',
    category: 'Live',
    imageUrl: 'https://images.unsplash.com/photo-1459749411177-d4a428c3feae?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 6,
    title: 'South Side Groove Tour',
    date: '2026-07-05',
    venue: 'Q Bar - Hilton',
    price: '₹2500',
    imageColor: 'bg-yellow-700',
    category: 'Funk',
    imageUrl: 'https://images.unsplash.com/photo-1574391884720-2e45599e9633?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 7,
    title: 'The Underground Session',
    date: '2026-09-19',
    venue: 'The Slate Hotels',
    price: '₹1500',
    imageColor: 'bg-purple-900',
    category: 'Techno',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 8,
    title: 'Retro Night Specials',
    date: '2026-10-22',
    venue: '10 Downing Street',
    price: '₹800',
    imageColor: 'bg-indigo-800',
    category: 'Indie',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97d890?auto=format&fit=crop&q=80&w=800'
  }
];

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [displayEvents] = useState(() => {
    const hostedEvents = getHostedEvents();
    return hostedEvents.length ? [...hostedEvents, ...events] : events;
  });
  const { scrollY } = useScroll();
  
  // Parallax effect for hero
  const heroY = useTransform(scrollY, [0, 800], [0, 300]);
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 800], [1, 1.1]);
  const textY = useTransform(scrollY, [0, 400], [0, -100]);

  const scrollToContent = () => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFilterStateChange = (hasActive: boolean) => {
    setHasActiveFilters(hasActive);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      <BrowseFilters onFilterStateChange={handleFilterStateChange} />

      {!hasActiveFilters && (
      <section className="relative h-screen w-full overflow-hidden">
        {/* DJ Lighting Effects */}
        <DJLightingEffects />
        
        {/* Parallax Background Image */}
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ y: heroY, scale: heroScale }}
        >
          <img 
            src="/dj background.png" 
            alt="DJ Background"
            className="w-full h-full object-cover"
          />
          {/* Gradient Overlays - Brand Colors */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0D]/60 via-[#0D0D0D]/40 to-[#0D0D0D]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#E5A823]/20 via-transparent to-[#EB4D4B]/10" />
        </motion.div>

        {/* Hero Content */}
        <motion.div 
          className="relative z-10 h-full flex flex-col items-start justify-center px-6 md:px-12 lg:px-20"
          style={{ y: textY, opacity: heroOpacity }}
        >
          {/* Main Text */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-left"
          >
            {/* YOUR NIGHT - Velvet Gold */}
            <motion.h1 
              className="text-3xl md:text-5xl lg:text-6xl font-black leading-none"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5A823] via-[#F5C542] to-[#E5A823] drop-shadow-[0_0_30px_rgba(229,168,35,0.5)]">
                YOUR NIGHT
              </span>
            </motion.h1>
            
            {/* STARTS - Velvet Gold */}
            <motion.h1 
              className="text-3xl md:text-5xl lg:text-6xl font-black leading-none mt-2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5A823] via-[#F5C542] to-[#E5A823] drop-shadow-[0_0_30px_rgba(229,168,35,0.5)]">
                STARTS
              </span>
            </motion.h1>
            
            {/* HERE - Neon Coral */}
            <motion.h1 
              className="text-3xl md:text-5xl lg:text-6xl font-black leading-none mt-2"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EB4D4B] via-[#FF6B6B] to-[#E5A823] drop-shadow-[0_0_30px_rgba(235,77,75,0.5)]">
                HERE
              </span>
            </motion.h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="mt-6 text-base md:text-lg text-[#F5F5DC]/70 max-w-md text-left"
          >
            Discover live gigs, DJ nights & unforgettable events at the best pubs and restaurants near you.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(229, 168, 35, 0.5)" }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToContent}
              className="px-8 py-4 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-black text-sm uppercase tracking-wider rounded-full flex items-center gap-2"
            >
              Browse Events
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-[#F5F5DC]/10 backdrop-blur-md border border-[#F5F5DC]/30 text-[#F5F5DC] font-bold text-sm uppercase tracking-wider rounded-full hover:bg-[#F5F5DC]/20 transition-colors"
              >
                Host an Event
              </motion.button>
            </Link>
          </motion.div>

        </motion.div>
      </section>
      )}

      {/* Content Section - Appears after scrolling */}
      <section ref={containerRef} className="relative z-20 bg-[#0D0D0D]">
        <div className="container mx-auto px-4 pt-8 pb-20">
          {/* Promo Banner */}
          {!hasActiveFilters && (
            <div className="mt-8">
              <PromoBanner />
            </div>
          )}
          
          {/* Popular Events Grid */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 text-[#F5F5DC] drop-shadow-lg">
              Popular Events <span className="text-[#F5F5DC]/50">in Chennai</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <EventCard 
                    {...event} 
                    layout="vertical"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
