'use client';

import { motion } from 'framer-motion';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.h1 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-5xl md:text-7xl font-black mb-12 text-neon-purple tracking-tighter"
        >
          ABOUT US
        </motion.h1>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xl text-gray-300 leading-relaxed mb-6">
              <span className="text-neon-pink font-bold">NeonBeats</span> was born from the underground. We are a collective of DJs, visual artists, and sound engineers dedicated to bringing you the most immersive electronic music experiences.
            </p>
            <p className="text-xl text-gray-300 leading-relaxed">
              Our mission is to create spaces where light and sound collide, where the beat controls your heartbeat, and where the night never ends.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative h-80 rounded-2xl overflow-hidden border-2 border-neon-blue box-neon-blue bg-gray-900"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 to-neon-blue/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-4 border-white animate-spin-slow flex items-center justify-center">
                 <div className="w-4 h-4 bg-neon-pink rounded-full" />
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-4 left-4 w-2 h-2 bg-neon-pink rounded-full animate-ping" />
            <div className="absolute bottom-4 right-4 w-2 h-2 bg-neon-blue rounded-full animate-ping" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-20 text-center"
        >
          <h2 className="text-3xl font-bold mb-8 text-neon-green">CONTACT</h2>
          <p className="text-xl text-gray-400">booking@neonbeats.com</p>
          <p className="text-xl text-gray-400">+1 (555) 123-4567</p>
        </motion.div>
      </div>
    </div>
  );
}
