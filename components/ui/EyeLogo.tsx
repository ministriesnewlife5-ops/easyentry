'use client';

import { motion, useSpring, useMotionValue } from 'framer-motion';
import { useEffect, useRef } from 'react';

export default function EyeLogo() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Create motion values for two eyes
  const eye1X = useMotionValue(0);
  const eye1Y = useMotionValue(0);
  const eye2X = useMotionValue(0);
  const eye2Y = useMotionValue(0);

  // Smooth spring animation for pupils
  const springConfig = { damping: 15, stiffness: 150 };
  const pupil1X = useSpring(eye1X, springConfig);
  const pupil1Y = useSpring(eye1Y, springConfig);
  const pupil2X = useSpring(eye2X, springConfig);
  const pupil2Y = useSpring(eye2Y, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const { clientX, clientY } = e;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate angle and distance for eyes
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const angle = Math.atan2(dy, dx);
      
      // Limit pupil movement radius
      const maxRadius = 3; 
      const distance = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.1, maxRadius);
      
      const moveX = Math.cos(angle) * distance;
      const moveY = Math.sin(angle) * distance;

      eye1X.set(moveX);
      eye1Y.set(moveY);
      eye2X.set(moveX);
      eye2Y.set(moveY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [eye1X, eye1Y, eye2X, eye2Y]);

  return (
    <div ref={containerRef} className="flex gap-1 items-center justify-center p-1 bg-black rounded hover:scale-110 transition-transform cursor-pointer">
      {/* Eye 1 */}
      <div className="relative w-3 h-4 bg-white rounded-full overflow-hidden flex items-center justify-center">
        <motion.div 
          style={{ x: pupil1X, y: pupil1Y }}
          className="w-1.5 h-1.5 bg-black rounded-full"
        />
      </div>
      
      {/* Eye 2 */}
      <div className="relative w-3 h-4 bg-white rounded-full overflow-hidden flex items-center justify-center">
        <motion.div 
          style={{ x: pupil2X, y: pupil2Y }}
          className="w-1.5 h-1.5 bg-black rounded-full"
        />
      </div>
    </div>
  );
}
