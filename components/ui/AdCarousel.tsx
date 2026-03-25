'use client';

import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Zap, Star, Music, PartyPopper } from 'lucide-react';

const ads = [
  {
    id: 1,
    title: 'CHENNAI VIBES',
    subtitle: 'Namma Chennai, Namma Party.',
    description: 'Discover the hottest beach parties along ECR and underground club nights in the heart of the city.',
    bg: 'bg-gradient-to-br from-orange-800/80 to-yellow-600/80',
    image: 'https://images.unsplash.com/photo-1574391884720-2e45599e9633?auto=format&fit=crop&q=80&w=800',
    accent: 'bg-white text-orange-900'
  },
  {
    id: 2,
    title: 'GATSBY NIGHTS',
    subtitle: 'Exclusive VIP access at Crowne Plaza.',
    description: 'Experience the premium nightlife at Gatsby 2000. Book your tables for the weekend now!',
    bg: 'bg-gradient-to-br from-purple-800/80 to-indigo-600/80',
    image: 'https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=800',
    accent: 'bg-white text-purple-900'
  },
  {
    id: 3,
    title: 'PASHA LOUNGE',
    subtitle: 'The ultimate party destination at The Park.',
    description: 'Join us for the most happening celebrity nights and international DJ sets in Chennai.',
    bg: 'bg-gradient-to-br from-blue-800/80 to-cyan-600/80',
    image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=800',
    accent: 'bg-white text-blue-900'
  },
  {
    id: 4,
    title: 'ECR RAVES',
    subtitle: 'Sunrise sessions by the shore.',
    description: 'Limited early bird passes for the upcoming beach rave in Chennai. Experience the magic of the coast.',
    bg: 'bg-gradient-to-br from-teal-800/80 to-emerald-600/80',
    image: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97d890?auto=format&fit=crop&q=80&w=800',
    accent: 'bg-white text-teal-900'
  }
];

export default function AdCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Mouse tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = e.clientX - rect.left;
    const mouseYVal = e.clientY - rect.top;
    const xPct = mouseXVal / width - 0.5;
    const yPct = mouseYVal / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrentIndex((prev) => (prev + 1) % ads.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);

  return (
    <div className="w-full max-w-5xl mx-auto h-48 md:h-56 relative group perspective-1000">
      <motion.div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full h-full"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className={`absolute inset-0 w-full h-full rounded-3xl overflow-hidden`}
            style={{
                background: `linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.02) 100%)`,
                backdropFilter: 'blur(30px) saturate(180%)',
                WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
          >
            {/* Glass Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/20 pointer-events-none z-20" />
            
            {/* Animated Particles */}
            <div className="absolute inset-0 overflow-hidden">
              {isMounted && [...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute bg-white/20 rounded-full blur-md"
                  initial={{ 
                    x: Math.random() * 100 + "%", 
                    y: Math.random() * 100 + "%", 
                    scale: 0 
                  }}
                  animate={{ 
                    y: [null, Math.random() * -100 + "%"],
                    scale: [0, 1, 0],
                    opacity: [0, 0.5, 0]
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 2, 
                    repeat: Infinity,
                    delay: Math.random() * 2 
                  }}
                  style={{ 
                    width: Math.random() * 50 + 20 + "px",
                    height: Math.random() * 50 + 20 + "px"
                  }}
                />
              ))}
            </div>

            {/* Content Container */}
            <div className="relative z-30 h-full flex items-center justify-between pl-1 pr-8 md:pl-2 md:pr-16">

              {/* Left Content */}
              <div className="flex items-center gap-6 md:gap-8">
                {/* Glassmorphism Image Container */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="w-80 h-40 md:w-96 md:h-52 rounded-3xl overflow-hidden relative group/img"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05))',
                    backdropFilter: 'blur(20px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent z-10 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent z-10 pointer-events-none" />
                  <img 
                    src={ads[currentIndex].image} 
                    alt={ads[currentIndex].title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                  />
                </motion.div>
                
                <div className="text-left space-y-2">
                  <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg">
                    {ads[currentIndex].title}
                  </h3>
                  <p className="text-white/90 font-bold text-lg md:text-xl tracking-wide">
                    {ads[currentIndex].subtitle}
                  </p>
                </div>
              </div>

              {/* Glassmorphism CTA Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden md:flex items-center gap-2 px-5 py-2.5 font-bold text-sm rounded-full transition-all group/btn relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
                  backdropFilter: 'blur(20px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                  color: 'white'
                }}
              >
                <span className="relative z-10">EXPLORE</span>
                <ChevronRight className="group-hover/btn:translate-x-1 transition-transform relative z-10" />
                {/* Button shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Glassmorphism Navigation Controls */}
      <div className="absolute inset-y-0 -left-16 flex items-center">
        <button 
          onClick={prev}
          className="p-2 rounded-full text-white transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}
        >
          <ChevronLeft size={32} />
        </button>
      </div>
      <div className="absolute inset-y-0 -right-16 flex items-center">
        <button 
          onClick={next}
          className="p-2 rounded-full text-white transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Glassmorphism Progress Bar */}
      <div className="absolute -bottom-10 left-0 right-0 flex justify-center gap-3">
        {ads.map((_, i) => (
          <div 
            key={i} 
            className="relative h-1.5 w-12 rounded-full overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {i === currentIndex && (
              <motion.div 
                layoutId="progress"
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, #ff00ff, #bd00ff)',
                  boxShadow: '0 0 10px rgba(255, 0, 255, 0.5)'
                }}
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
