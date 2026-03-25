'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Music, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';

const promoSlides = [
  {
    id: 1,
    tag: 'New Feature',
    title: "Find Chennai's hottest shows",
    description: 'Discover the best DJ nights at Gatsby, Pasha, and more. Connect your music for personalized alerts.',
    image: 'https://images.unsplash.com/photo-1574391884720-2e45599e9633?auto=format&fit=crop&q=80&w=800',
    buttons: [
      { label: 'SPOTIFY', color: 'bg-white text-black' },
    ]
  },
  {
    id: 2,
    tag: 'Exclusive',
    title: 'Experience Madras Nightlife',
    description: 'From ECR raves to rooftop parties in OMR, find your vibe in the city.',
    image: 'https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=800',
    buttons: [
      { label: 'EXPLORE EVENTS', color: 'bg-[#E5A823] text-black' }
    ]
  }
];

// Pre-defined particle data to avoid hydration mismatch
const particles = [
  { left: 15, x: 120, y: 180, size: 28, icon: 'music', delay: 0, duration: 6 },
  { left: 35, x: 280, y: 220, size: 32, icon: 'sparkles', delay: 1.2, duration: 7 },
  { left: 55, x: 420, y: 150, size: 25, icon: 'music', delay: 2.1, duration: 5.5 },
  { left: 75, x: 380, y: 280, size: 30, icon: 'sparkles', delay: 0.8, duration: 6.5 },
  { left: 25, x: 200, y: 320, size: 35, icon: 'music', delay: 1.5, duration: 7.2 },
  { left: 45, x: 350, y: 190, size: 27, icon: 'sparkles', delay: 2.5, duration: 5.8 },
  { left: 65, x: 480, y: 240, size: 33, icon: 'music', delay: 0.5, duration: 6.8 },
  { left: 85, x: 150, y: 260, size: 29, icon: 'sparkles', delay: 1.8, duration: 5.2 },
];

export default function PromoBanner() {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  useEffect(() => {
    setMounted(true);
  }, []);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % promoSlides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + promoSlides.length) % promoSlides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, 8000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  if (!mounted) {
    return (
      <div className="w-full py-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D0D0D] via-[#2A2A2A] to-[#0D0D0D] border border-[#2A2A2A] p-8 md:p-12 shadow-2xl h-[400px] lg:h-[380px]">
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 h-full min-h-[400px] lg:min-h-[380px]">
            <div className="flex flex-col items-start max-w-xl">
              <span className="text-[#E5A823] text-sm font-bold tracking-wider uppercase mb-4">{promoSlides[0].tag}</span>
              <h2 className="text-3xl md:text-5xl font-black text-[#F5F5DC] mb-4">{promoSlides[0].title}</h2>
              <p className="text-[#F5F5DC]/70 text-lg mb-8">{promoSlides[0].description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className="w-full py-8 relative group">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D0D0D] via-[#2A2A2A] to-[#0D0D0D] border border-[#2A2A2A] shadow-2xl min-h-[400px] lg:min-h-[380px]">
        {/* Animated Background Gradient */}
        <motion.div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(229,168,35,0.1),transparent_70%)]"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Particles */}
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute text-[#E5A823]/20 pointer-events-none"
            initial={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
            animate={{ 
              y: [null, -150],
              opacity: [0, 0.4, 0],
              rotate: [0, 30, -30, 0],
              scale: [0.5, 1.2, 0.5]
            }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
            style={{ left: `${p.left}%` }}
          >
            {p.icon === 'music' ? <Music size={p.size} /> : <Sparkles size={p.size} />}
          </motion.div>
        ))}

        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="relative z-10 w-full h-full p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-8"
          >
            <div className="flex flex-col items-start max-w-xl text-left">
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[#E5A823] text-sm font-bold tracking-wider uppercase mb-4"
              >
                {promoSlides[currentIndex].tag}
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-5xl font-black text-[#F5F5DC] mb-4 leading-tight"
              >
                {promoSlides[currentIndex].title}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-[#F5F5DC]/70 text-lg mb-8"
              >
                {promoSlides[currentIndex].description}
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
              >
                {promoSlides[currentIndex].buttons.map((btn, idx) => (
                  <button 
                    key={idx}
                    className={`flex items-center justify-center gap-3 px-8 py-4 ${btn.color} rounded-full font-black hover:scale-105 transition-transform`}
                  >
                    {btn.label}
                  </button>
                ))}
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="relative w-full lg:w-[450px] h-[280px] lg:h-[320px] flex-shrink-0"
            >
              <Image 
                src={promoSlides[currentIndex].image} 
                alt={promoSlides[currentIndex].title} 
                fill 
                className="object-cover rounded-2xl shadow-2xl border border-[#2A2A2A]" 
                sizes="(max-width: 1024px) 100vw, 600px" 
                priority 
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={(e) => { e.stopPropagation(); prevSlide(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); nextSlide(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        >
          <ChevronRight size={24} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {promoSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? 'bg-[#E5A823] w-6' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
