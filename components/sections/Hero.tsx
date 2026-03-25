'use client';

import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import AdCarousel from '../ui/AdCarousel';

export default function Hero() {
  const ref = useRef(null);
  const eyeRef = useRef<HTMLDivElement>(null);
  const eyeRef2 = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  // Mouse move effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Eye tracking values
  const eyeX = useMotionValue(0);
  const eyeY = useMotionValue(0);
  const eye2X = useMotionValue(0);
  const eye2Y = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 100 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);
  
  // Eye Pupil Spring
  const pupilX = useSpring(eyeX, { damping: 20, stiffness: 150 });
  const pupilY = useSpring(eyeY, { damping: 20, stiffness: 150 });
  const pupil2X = useSpring(eye2X, { damping: 20, stiffness: 150 });
  const pupil2Y = useSpring(eye2Y, { damping: 20, stiffness: 150 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      // Parallax Movement
      mouseX.set((clientX - centerX) * 0.05);
      mouseY.set((clientY - centerY) * 0.05);

      // Eye Tracking Logic
      if (eyeRef.current) {
        const rect = eyeRef.current.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;
        
        const dx = clientX - eyeCenterX;
        const dy = clientY - eyeCenterY;
        
        // Calculate angle and distance
        const angle = Math.atan2(dy, dx);
        // Limit movement radius (pupil stays inside eye)
        const maxRadius = 15; 
        const distance = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.15, maxRadius);
        
        eyeX.set(Math.cos(angle) * distance);
        eyeY.set(Math.sin(angle) * distance);
      }

      // Second Eye Tracking Logic
      if (eyeRef2.current) {
        const rect = eyeRef2.current.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;
        
        const dx = clientX - eyeCenterX;
        const dy = clientY - eyeCenterY;
        
        const angle = Math.atan2(dy, dx);
        const maxRadius = 15; 
        const distance = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.15, maxRadius);
        
        eye2X.set(Math.cos(angle) * distance);
        eye2Y.set(Math.sin(angle) * distance);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, eyeX, eyeY, eye2X, eye2Y]);

  const yText = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={ref} className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-[#0D0D0D] perspective-1000">
      {/* Background Grid with Parallax - Brand Colors */}
      <motion.div 
        style={{ x: springX, y: springY }}
        className="absolute inset-0 bg-[linear-gradient(to_right,#2A2A2A_1px,transparent_1px),linear-gradient(to_bottom,#2A2A2A_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] scale-110" 
      />
      
      {/* Animated Gradient Orbs - Brand Colors */}
      <motion.div 
        style={{ y: yBg, x: useTransform(springX, (x) => x * -2) }}
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#E5A823] rounded-full blur-[100px] opacity-40 animate-pulse"
      />
      <motion.div 
        style={{ y: yBg, x: useTransform(springX, (x) => x * -1.5) }}
        className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#EB4D4B] rounded-full blur-[100px] opacity-40 animate-pulse"
      />

      {/* Main Content */}
      <motion.div 
        style={{ y: yText, opacity }}
        className="relative z-10 text-center px-4 w-full max-w-6xl mx-auto"
      >
        <motion.h1 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="text-6xl md:text-8xl font-black text-[#F5F5DC] mb-4 tracking-tighter drop-shadow-[0_0_15px_rgba(229,168,35,0.3)]"
        >
          NEON BEATS
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl text-[#F5F5DC]/70 mb-12 max-w-2xl mx-auto"
        >
          The ultimate platform for underground electronic music events.
        </motion.p>

        {/* Ad Carousel Section */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <AdCarousel />
        </motion.div>
      </motion.div>

      {/* DJ Animation (2D Elements) */}
      <div className="absolute bottom-0 w-full flex justify-center pointer-events-none opacity-50 md:opacity-100">
        <motion.div 
          style={{ scale }}
          className="relative w-[600px] h-[300px]"
        >
          {/* Turntable Base */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[500px] h-[100px] bg-[#2A2A2A] border-t-2 border-[#E5A823] rounded-t-3xl box-neon-blue" />
          
          {/* Disc 1 */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 left-20 w-32 h-32 rounded-full border-4 border-[#E5A823] bg-[#0D0D0D] flex items-center justify-center box-neon-purple"
          >
            <div className="w-10 h-10 rounded-full bg-[#2A2A2A] border border-[#E5A823]/50" />
            <div className="absolute w-full h-1 bg-[#E5A823]/50 transform rotate-45" />
          </motion.div>

          {/* Disc 2 */}
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 right-20 w-32 h-32 rounded-full border-4 border-[#EB4D4B] bg-[#0D0D0D] flex items-center justify-center box-neon-pink"
          >
             <div className="w-10 h-10 rounded-full bg-[#2A2A2A] border border-[#EB4D4B]/50" />
             <div className="absolute w-full h-1 bg-[#EB4D4B]/50 transform rotate-45" />
          </motion.div>

          {/* Equalizer Bars - Brand Colors */}
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-1 items-end h-32">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [20, 100, 40, 80, 20] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                className={`w-4 bg-gradient-to-t ${i % 2 === 0 ? 'from-[#E5A823] to-[#EB4D4B]' : 'from-[#EB4D4B] to-[#E5A823]'} rounded-t-sm`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
