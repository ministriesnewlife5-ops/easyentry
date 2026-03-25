'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { Instagram, Music, ExternalLink, ArrowLeft } from 'lucide-react';

const artists = [
  {
    id: 1,
    name: 'DJ GOUTHAM',
    role: 'DJ',
    image: 'https://images.unsplash.com/photo-1574391884720-2e45599e9633?auto=format&fit=crop&q=80&w=500',
    genre: 'Commercial',
    followers: '45K'
  },
  {
    id: 2,
    name: 'DJ KASH',
    role: 'DJ',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=500',
    genre: 'EDM',
    followers: '32K'
  },
  {
    id: 3,
    name: 'DJ SARAH CHEN',
    role: 'DJ',
    image: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?auto=format&fit=crop&q=80&w=500',
    genre: 'Techno',
    followers: '67K'
  },
  {
    id: 4,
    name: 'DJ MARCUS WAVES',
    role: 'DJ',
    image: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&q=80&w=500',
    genre: 'House',
    followers: '28K'
  },
  {
    id: 5,
    name: 'DJ ANR',
    role: 'DJ',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=500',
    genre: 'Progressive',
    followers: '89K'
  },
  {
    id: 6,
    name: 'DJ MEERA',
    role: 'DJ',
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=500',
    genre: 'Bollywood',
    followers: '54K'
  },
  {
    id: 7,
    name: 'DJ VORTEX',
    role: 'DJ',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=500',
    genre: 'Deep House',
    followers: '41K'
  },
  {
    id: 8,
    name: 'DJ NOVA',
    role: 'DJ',
    image: 'https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=500',
    genre: 'Tech House',
    followers: '73K'
  }
];

function ArtistCard({ artist, index }: { artist: typeof artists[0]; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  const shareToWhatsApp = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/artist/${artist.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out ${artist.name}'s profile! ` + url)}`, '_blank');
  };

  const shareToInstagram = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/artist/${artist.id}`;
    navigator.clipboard.writeText(`Check out ${artist.name}'s profile! ${url}`);
    alert("Link copied! You can now paste it in Instagram.");
    window.open('https://instagram.com', '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 100 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative"
    >
      {/* Card Container */}
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative overflow-hidden rounded-2xl bg-[#0D0D0D] border border-[#2A2A2A] group-hover:border-[#E5A823]/50 transition-all duration-500"
      >
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <motion.img
            src={artist.image}
            alt={artist.name}
            className="absolute inset-0 w-full h-full object-cover"
            animate={{ scale: isHovered ? 1.1 : 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
          
          {/* Neon Glow on Hover - Brand Colors */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ 
              boxShadow: isHovered 
                ? "inset 0 0 60px rgba(229, 168, 35, 0.3)" 
                : "inset 0 0 0px rgba(229, 168, 35, 0)"
            }}
            transition={{ duration: 0.3 }}
          />

          {/* Social Links - Appear on Hover */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-4 right-4 flex flex-col gap-2"
          >
            <motion.button
              onClick={shareToWhatsApp}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-full bg-[#0D0D0D]/60 backdrop-blur-md border border-[#F5F5DC]/20 flex items-center justify-center text-[#F5F5DC] hover:bg-[#25D366] hover:border-[#25D366] hover:text-white transition-all"
              title="Share to WhatsApp"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            </motion.button>
            <motion.button
              onClick={shareToInstagram}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-full bg-[#0D0D0D]/60 backdrop-blur-md border border-[#F5F5DC]/20 flex items-center justify-center text-[#F5F5DC] hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-500 hover:border-pink-400 hover:text-white transition-all"
              title="Share to Instagram"
            >
              <Instagram className="w-4 h-4" />
            </motion.button>
          </motion.div>

          {/* Genre Badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-4 left-4"
          >
            <span className="px-3 py-1.5 bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] rounded-full text-xs font-bold text-[#0D0D0D] shadow-lg">
              {artist.genre}
            </span>
          </motion.div>
        </div>

        {/* Info Section */}
        <div className="p-5 relative">
          {/* Floating particles on hover */}
          <AnimatePresence>
            {isHovered && (
              <>
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 0, x: 10 + i * 20 }}
                    animate={{ 
                      opacity: [0, 0.6, 0],
                      y: -20 - i * 5,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                    className="absolute bottom-10 right-4"
                  >
                    <div className="w-1 h-1 rounded-full bg-[#E5A823]" />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          <div className="flex items-start justify-between">
            <div>
              <motion.h3 
                className="text-lg font-bold text-[#F5F5DC] mb-1"
                animate={{ color: isHovered ? "#E5A823" : "#F5F5DC" }}
                transition={{ duration: 0.2 }}
              >
                {artist.name}
              </motion.h3>
              <p className="text-sm text-[#F5F5DC]/50">{artist.role}</p>
            </div>
            <motion.div 
              className="text-right"
              animate={{ scale: isHovered ? 1.1 : 1 }}
            >
              <span className="text-xs text-[#E5A823] font-bold">{artist.followers}</span>
              <p className="text-[10px] text-[#F5F5DC]/50 uppercase">followers</p>
            </motion.div>
          </div>

          {/* View Profile Button - Appears on Hover */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-[#2A2A2A]"
          >
            <Link href={`/artist/${artist.id}`}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#E5A823]/20 to-[#EB4D4B]/20 border border-[#E5A823]/30 text-[#E5A823] text-sm font-bold hover:bg-gradient-to-r hover:from-[#E5A823] hover:to-[#EB4D4B] hover:text-[#0D0D0D] transition-all"
              >
                View Profile
                <ExternalLink className="w-4 h-4" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ArtistsPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] pt-24 pb-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          {/* Back Button */}
          <Link href="/">
            <motion.button
              whileHover={{ x: -5, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-[#F5F5DC]/50 hover:text-[#E5A823] mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Home</span>
            </motion.button>
          </Link>

          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5A823] to-[#EB4D4B]">Artists</span>
          </h1>
          <p className="text-[#F5F5DC]/70 text-lg max-w-2xl">
            Discover the best DJs and performers. From underground techno to chart-topping hits, find your next favorite artist.
          </p>
        </motion.div>

        {/* Artists Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artists.map((artist, index) => (
            <ArtistCard key={artist.id} artist={artist} index={index} />
          ))}
        </div>

        {/* Load More Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center mt-16"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(229, 168, 35, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-4 bg-[#E5A823] text-[#0D0D0D] font-black text-sm uppercase tracking-wider rounded-full hover:bg-[#F5C542] transition-colors"
          >
            Load More Artists
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
