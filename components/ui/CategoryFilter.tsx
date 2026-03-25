'use client';

import { motion } from 'framer-motion';

const categories = [
  { name: 'Trending', color: 'bg-neon-pink' },
  { name: 'This Weekend', color: 'bg-neon-blue' },
  { name: 'Techno', color: 'bg-neon-purple' },
  { name: 'House', color: 'bg-neon-green' },
  { name: 'Live', color: 'bg-white' },
  { name: 'Workshops', color: 'bg-yellow-400' },
];

export default function CategoryFilter() {
  return (
    <div className="w-full border-b border-gray-800 bg-black/95 sticky top-16 z-40 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
          {categories.map((cat, i) => (
            <motion.button
              key={cat.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-full border border-gray-800 bg-gray-900/50 text-sm font-bold text-gray-300 hover:text-white hover:border-white transition-colors whitespace-nowrap`}
            >
              {cat.name}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
