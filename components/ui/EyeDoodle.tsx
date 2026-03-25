'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';

export default function EyeDoodle() {
  const ref = useRef<HTMLDivElement>(null);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 150 };
  const pupilX = useSpring(mouseX, springConfig);
  const pupilY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate distance from center, capped at max movement radius
      const maxRadius = 15;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const angle = Math.atan2(dy, dx);
      const distance = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.2, maxRadius);
      
      mouseX.set(Math.cos(angle) * distance);
      mouseY.set(Math.sin(angle) * distance);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div 
      ref={ref}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring" }}
      className="absolute top-20 right-20 hidden lg:block"
    >
      <div className="relative w-32 h-32">
        {/* Eye White (Sclera) */}
        <div className="absolute inset-0 bg-white rounded-full border-4 border-black shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center overflow-hidden">
          
          {/* Pupil Container */}
          <motion.div 
            style={{ x: pupilX, y: pupilY }}
            className="w-12 h-12 bg-black rounded-full relative flex items-center justify-center"
          >
            {/* Eye Shine */}
            <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full opacity-80" />
            
            {/* Inner Iris Color (Neon Pink) */}
            <div className="w-4 h-4 bg-neon-pink rounded-full opacity-50 blur-[2px]" />
          </motion.div>
        </div>

        {/* Eyelids (Blinking Animation) */}
        <motion.div 
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ 
            duration: 0.2, 
            repeat: Infinity, 
            repeatDelay: 4,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-black origin-top -translate-y-[150%] rounded-t-full z-10" 
        />
        <motion.div 
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ 
            duration: 0.2, 
            repeat: Infinity, 
            repeatDelay: 4,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-black origin-bottom translate-y-[150%] rounded-b-full z-10" 
        />
        
        {/* Decorative Squiggles around eye */}
        <svg className="absolute -top-8 -right-8 w-48 h-48 pointer-events-none z-[-1]" viewBox="0 0 100 100">
           <motion.path 
             d="M 20 20 Q 50 10 80 20" 
             fill="none" 
             stroke="#ff00ff" 
             strokeWidth="2"
             strokeLinecap="round"
             animate={{ d: ["M 20 20 Q 50 10 80 20", "M 20 25 Q 50 5 80 25", "M 20 20 Q 50 10 80 20"] }}
             transition={{ duration: 2, repeat: Infinity }}
           />
           <motion.path 
             d="M 10 50 Q 0 50 10 50" 
             fill="none" 
             stroke="#00ffff" 
             strokeWidth="2"
             strokeLinecap="round"
             animate={{ d: ["M 10 50 Q -5 50 10 50", "M 10 50 Q -10 60 10 50", "M 10 50 Q -5 50 10 50"] }}
             transition={{ duration: 3, repeat: Infinity }}
           />
        </svg>
      </div>
    </motion.div>
  );
}
