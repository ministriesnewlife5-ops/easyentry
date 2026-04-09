'use client';

import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useState, MouseEvent, useRef, useEffect } from 'react';
import { Heart, Share2, Calendar, MapPin, Clock, Sparkles, Zap, Instagram, MessageCircle, X } from 'lucide-react';
import { toggleWishlist, isInWishlist, type WishlistEvent } from '@/lib/wishlist-store';

interface EventCardProps {
  id: string | number;
  title: string;
  date: string;
  venue: string;
  price: string;
  imageColor: string;
  imageUrl?: string;
  category: string;
  subcategory?: string;
  layout?: 'horizontal' | 'vertical';
  index?: number;
}

export default function EventCard({ id, title, date, venue, price, imageColor, imageUrl, category, subcategory, layout = 'horizontal', index = 0 }: EventCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Check wishlist status on mount and when it changes
  useEffect(() => {
    const checkWishlist = async () => {
      const inWishlist = await isInWishlist(String(id));
      setIsLiked(inWishlist);
    };
    checkWishlist();
  }, [id]);

  // Listen for wishlist updates from other components
  useEffect(() => {
    const handleWishlistUpdate = async () => {
      const inWishlist = await isInWishlist(String(id));
      setIsLiked(inWishlist);
    };
    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlist-updated', handleWishlistUpdate);
  }, [id]);

  // 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 100 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  // Parsing date for the "DICE" style day/month block (Fixed locale to prevent hydration mismatch)
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const weekday = dateObj.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
  const fullDate = dateObj.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const handleLike = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const event: Omit<WishlistEvent, 'addedAt'> = {
      id: String(id),
      title,
      date,
      venue,
      price,
      imageUrl,
      category
    };
    const newLikedState = await toggleWishlist(event);
    setIsLiked(newLikedState);
  };

  const shareToWhatsApp = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowWhatsAppModal(true);
  };

  const shareToInstagram = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowInstagramModal(true);
  };

  const handleInstagramShare = (type: 'reel' | 'story' | 'post') => {
    const url = `${window.location.origin}/events/${id}`;
    const text = `Check out ${title} at ${venue}! ${url}`;
    
    // Try to open Instagram app with deep link, falls back to web
    const instagramDeepLink = `instagram://user?username=instagram`;
    const instagramWeb = `https://instagram.com`;
    
    // For mobile, try deep link first
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      window.location.href = `instagram://share?url=${encodeURIComponent(url)}`;
      setTimeout(() => {
        window.open(instagramWeb, '_blank');
      }, 500);
    } else {
      window.open(instagramWeb, '_blank');
    }
    
    setShowInstagramModal(false);
  };

  const handleWhatsAppShare = (type: 'status' | 'send') => {
    const url = `${window.location.origin}/events/${id}`;
    const text = `Check out ${title} at ${venue}! ${url}`;
    
    if (type === 'status') {
      // For status, try to open WhatsApp app
      const waLink = `https://wa.me/?text=${encodeURIComponent(text)}`;
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        window.open(`whatsapp://send?text=${encodeURIComponent(text)}`, '_blank');
        setTimeout(() => {
          window.open(waLink, '_blank');
        }, 500);
      } else {
        window.open(waLink, '_blank');
      }
    } else {
      // For send to chat, open WhatsApp directly
      window.open(`https://api.whatsapp.com/send/?text=${encodeURIComponent(text)}`, '_blank');
    }
    
    setShowWhatsAppModal(false);
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94] as const
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      style={{ perspective: 1000 }}
    >
      <Link href={`/events/${id}`} className="block group h-full">
        <motion.div 
          ref={cardRef}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={handleMouseLeave}
          onMouseMove={handleMouseMove}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d"
          }}
          whileHover={{ y: -8 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative flex flex-col h-full bg-transparent"
        >
          {/* Image Container - 3:4 Aspect Ratio like Artist Cards */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#2A2A2A] border border-[#2A2A2A] group-hover:border-[#E5A823]/50 transition-all duration-500 shadow-lg group-hover:shadow-[0_0_40px_rgba(229,168,35,0.3)]">
            {imageUrl ? (
              <motion.img 
                src={imageUrl} 
                alt={title}
                className="absolute inset-0 w-full h-full object-cover"
                animate={{ scale: isHovered ? 1.1 : 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ) : (
              <motion.div 
                className={`absolute inset-0 ${imageColor}`}
                animate={{ opacity: isHovered ? 0.4 : 0.2 }}
                transition={{ duration: 0.3 }}
              />
            )}
            
            {/* Animated gradient overlay */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
              animate={{ opacity: isHovered ? 1 : 0.8 }}
            />
            
            {/* Neon glow border on hover - Brand Colors */}
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              animate={{ 
                boxShadow: isHovered 
                  ? "inset 0 0 40px rgba(229, 168, 35, 0.4), 0 0 40px rgba(229, 168, 35, 0.3)" 
                  : "inset 0 0 0px rgba(229, 168, 35, 0), 0 0 0px rgba(229, 168, 35, 0)"
              }}
              transition={{ duration: 0.4 }}
            />

            {/* Animated border shimmer */}
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E5A823]/30 to-transparent"
                animate={{ x: ["-200%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            
            {/* Floating particles on hover */}
            <AnimatePresence>
              {isHovered && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 0, x: 20 + i * 25 }}
                      animate={{ 
                        opacity: [0, 0.8, 0],
                        y: -40 - i * 15,
                        x: 20 + i * 25 + (i % 2 === 0 ? 15 : -15),
                        scale: [0.5, 1, 0.5]
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2, delay: i * 0.15, repeat: Infinity }}
                      className="absolute bottom-4"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] shadow-[0_0_10px_rgba(229,168,35,0.8)]" />
                    </motion.div>
                  ))}
                </>
              )}
            </AnimatePresence>

            {/* Sparkle effects */}
            <AnimatePresence>
              {isHovered && (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], rotate: [0, 180] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    className="absolute top-8 right-8"
                  >
                    <Sparkles className="w-4 h-4 text-[#E5A823]" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: 0.5 }}
                    className="absolute top-12 left-8"
                  >
                    <Zap className="w-3 h-3 text-[#EB4D4B]" />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            
            {/* Heart/Like Button - Elite Effect */}
            <motion.button 
              onClick={handleLike}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
              className={`absolute bottom-3 right-3 w-11 h-11 rounded-full backdrop-blur-xl border flex items-center justify-center transition-all duration-300 z-20 ${
                isLiked 
                  ? 'bg-gradient-to-br from-[#EB4D4B] via-[#E5A823] to-[#E5A823] border-transparent text-white shadow-[0_0_20px_rgba(235,77,75,0.5)]' 
                  : 'bg-[#0D0D0D]/60 border-[#F5F5DC]/30 text-[#F5F5DC] hover:bg-[#F5F5DC] hover:text-[#0D0D0D] hover:border-[#F5F5DC] shadow-lg'
              }`}
            >
              <motion.div
                animate={isLiked ? { scale: [1, 1.4, 1], rotate: [0, -15, 15, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <Heart 
                  className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} 
                  strokeWidth={2}
                />
              </motion.div>
            </motion.button>

            {/* Instagram and WhatsApp Share Buttons - Below Heart */}
            <div className="absolute bottom-3 right-16 flex flex-col gap-2 z-20">
              <motion.button
                onClick={shareToInstagram}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 backdrop-blur-md flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow"
                title="Share to Instagram"
              >
                <Instagram className="w-5 h-5" />
              </motion.button>
              <motion.button
                onClick={shareToWhatsApp}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className="w-11 h-11 rounded-full bg-[#25D366] backdrop-blur-md flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow"
                title="Share to WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Instagram Share Modal */}
            <AnimatePresence>
              {showInstagramModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInstagramModal(false);
                  }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#1A1A1A] border border-[#E5A823]/30 rounded-2xl p-6 max-w-sm w-11/12 shadow-2xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-[#F5F5DC] flex items-center gap-2">
                        <Instagram className="w-5 h-5 text-pink-500" />
                        Share to Instagram
                      </h3>
                      <button
                        onClick={() => setShowInstagramModal(false)}
                        className="text-[#F5F5DC]/50 hover:text-[#F5F5DC] transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-[#F5F5DC]/70 text-sm mb-6">Choose how to share this event:</p>
                    <div className="space-y-3">
                      <button
                        onClick={() => handleInstagramShare('reel')}
                        className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-pink-500/50 transition-all"
                      >
                        📹 Share as Reel
                      </button>
                      <button
                        onClick={() => handleInstagramShare('story')}
                        className="w-full px-4 py-3 bg-gradient-to-r from-orange-400 to-pink-500 rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all"
                      >
                        📖 Share in Story
                      </button>
                      <button
                        onClick={() => handleInstagramShare('post')}
                        className="w-full px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-yellow-500/50 transition-all"
                      >
                        📸 Share as Post
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* WhatsApp Share Modal */}
            <AnimatePresence>
              {showWhatsAppModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowWhatsAppModal(false);
                  }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#1A1A1A] border border-[#25D366]/30 rounded-2xl p-6 max-w-sm w-11/12 shadow-2xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-[#F5F5DC] flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-[#25D366]" />
                        Share to WhatsApp
                      </h3>
                      <button
                        onClick={() => setShowWhatsAppModal(false)}
                        className="text-[#F5F5DC]/50 hover:text-[#F5F5DC] transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-[#F5F5DC]/70 text-sm mb-6">Choose how to share this event:</p>
                    <div className="space-y-3">
                      <button
                        onClick={() => handleWhatsAppShare('send')}
                        className="w-full px-4 py-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
                      >
                        💬 Send to Chat
                      </button>
                      <button
                        onClick={() => handleWhatsAppShare('status')}
                        className="w-full px-4 py-3 bg-gradient-to-r from-[#128C7E] to-[#075E54] rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition-all"
                      >
                        📱 Add to Status
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Share Menu */}
            <div className="absolute bottom-16 right-3 flex items-center gap-2 z-20">
              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.8 }}
                    className="flex flex-col items-center gap-2 pb-2"
                  >
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Share Button with pulse */}
              <motion.button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowShareMenu(!showShareMenu);
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className="w-11 h-11 rounded-full bg-gradient-to-br from-[#E5A823] via-[#E5A823] to-[#EB4D4B] backdrop-blur-md border border-[#F5F5DC]/30 flex items-center justify-center text-white shadow-lg shadow-[#E5A823]/50 relative"
              >
                <motion.div
                  animate={{ 
                    boxShadow: ["0 0 0 0 rgba(229, 168, 35, 0.4)", "0 0 0 10px rgba(229, 168, 35, 0)"]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-full"
                />
                <Share2 className="w-4 h-4 text-white relative z-10" />
              </motion.button>
            </div>

            {/* Category Badge with neon effect */}
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute top-3 left-3"
            >
              <span className="px-3 py-1.5 bg-[#0D0D0D]/70 backdrop-blur-xl rounded-full text-xs font-bold text-[#F5F5DC] border border-[#F5F5DC]/20 shadow-lg">
                {subcategory ? `${category} • ${subcategory}` : category}
              </span>
            </motion.div>

            {/* Elite Price tag - appears on hover with animation */}
            <motion.div
              initial={{ opacity: 0, y: -20, x: 20 }}
              animate={{ 
                opacity: isHovered ? 1 : 0, 
                y: isHovered ? 0 : -20,
                x: isHovered ? 0 : 20,
                rotate: isHovered ? 0 : 10
              }}
              transition={{ duration: 0.3, type: "spring" }}
              className="absolute top-3 right-3"
            >
              <div className="px-3 py-1.5 bg-gradient-to-r from-[#E5A823] via-[#E5A823] to-[#EB4D4B] rounded-full text-xs font-bold text-[#0D0D0D] shadow-lg shadow-[#E5A823]/50 border border-[#F5F5DC]/20">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {price}
                </span>
              </div>
            </motion.div>

            {/* Bottom gradient line animation */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E5A823] via-[#EB4D4B] to-[#E5A823]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: isHovered ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              style={{ originX: 0 }}
            />
          </div>

          {/* Content Section - Enhanced Typography */}
          {layout === 'horizontal' ? (
            /* Horizontal Layout (Home Page Row) */
            <div className="flex mt-4 gap-4">
              <motion.div 
                whileHover={{ scale: 1.05, borderColor: "rgba(229, 168, 35, 0.5)" }}
                className="flex flex-col items-center justify-center min-w-[3.5rem] h-[3.5rem] bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl transition-all"
              >
                <span className="text-xs font-bold text-[#E5A823]">{month}</span>
                <span className="text-xl font-black text-[#F5F5DC]">{day}</span>
              </motion.div>
              <div className="flex-1 min-w-0">
                <motion.h3 
                  className="text-lg font-bold text-[#F5F5DC] truncate leading-tight"
                  animate={{ color: isHovered ? "#E5A823" : "#F5F5DC" }}
                  transition={{ duration: 0.2 }}
                >
                  {title}
                </motion.h3>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-[#F5F5DC]/50" />
                  <p className="text-sm text-[#F5F5DC]/70 truncate">
                    {venue}
                  </p>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-[#F5F5DC]/50" />
                  <p className="text-xs text-[#F5F5DC]/50 font-medium">
                    {weekday} • 10:00 PM
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Vertical Layout (Browse Page Grid) - Elite Styling */
            <div className="flex flex-col mt-4 gap-2">
              <motion.h3 
                className="text-lg font-bold text-[#F5F5DC] truncate leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#E5A823] group-hover:to-[#EB4D4B] transition-all duration-300"
                animate={{ color: isHovered ? "#E5A823" : "#F5F5DC" }}
                transition={{ duration: 0.2 }}
              >
                {title}
              </motion.h3>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#E5A823]" />
                <p className="text-sm font-bold text-[#E5A823] truncate">
                  {fullDate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#F5F5DC]/50" />
                <p className="text-sm text-[#F5F5DC]/70 truncate font-medium">
                  {venue}
                </p>
              </div>
              <motion.div 
                className="flex items-center gap-1 mt-1"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: isHovered ? 1 : 0.8 }}
              >
                <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-[#E5A823] via-[#EB4D4B] to-[#E5A823]">
                  {price}
                </span>
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                  className="text-xs text-[#F5F5DC]/50"
                >
                  • Get tickets
                </motion.span>
              </motion.div>
            </div>
          )}
        </motion.div>
      </Link>
    </motion.div>
  );
}
