'use client';

import { motion } from 'framer-motion';
import { Calendar, ChevronDown, Heart, Instagram, MapPin, MapPinned, Star, Ticket, Video, Play } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { PublicEvent } from '@/lib/public-events-store';

export default function EventDetailsPage() {
  const params = useParams();
  const [liked, setLiked] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video'>('image');

  const convenienceFee = 175;
  const maxTickets = 10;
  useEffect(() => {
    const eventId = params.id as string;

    if (!eventId) {
      setIsLoading(false);
      return;
    }

    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch event');
        }

        const data = await response.json();
        setEvent(data.event || null);
      } catch (error) {
        console.error('Failed to load event:', error);
        setEvent(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [params.id]);

  const ticketPrice = useMemo(() => {
    if (!event) {
      return 0;
    }

    const numericPrice = Number(event.price.replace(/[^\d.]/g, ''));
    return Number.isFinite(numericPrice) ? numericPrice : 0;
  }, [event]);

  const ticketTypes = useMemo(
    () => [
      {
        id: 'entry',
        name: 'Get Tickets',
        price: ticketPrice,
        description: 'Select from available ticket types',
      },
    ],
    [ticketPrice]
  );

  const shareToWhatsApp = () => {
    if (!event) {
      return;
    }

    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out ${event.title} at ${event.venue}! ` + url)}`, '_blank');
    setShowShareMenu(false);
  };

  const shareToInstagram = () => {
    if (!event) {
      return;
    }

    const url = window.location.href;
    navigator.clipboard.writeText(`Check out ${event.title} at ${event.venue}! ${url}`);
    alert("Link copied! You can now paste it in Instagram.");
    window.open('https://instagram.com', '_blank');
    setShowShareMenu(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        Loading event...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <p className="mt-2 text-[#F5F5DC]/60">This event is not available or has not been published yet.</p>
          <Link href="/events" className="mt-6 inline-flex rounded-lg bg-[#E5A823] px-4 py-2 font-semibold text-[#0D0D0D]">
            Back to events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Title Row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#F5F5DC] mb-2">{event.title}</h1>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#E5A823]/20 text-[#E5A823] text-xs font-bold rounded-full border border-[#E5A823]/30">
                LIVE PERFORMANCE
              </span>
              <span className="px-3 py-1 bg-[#EB4D4B]/20 text-[#EB4D4B] text-xs font-bold rounded-full border border-[#EB4D4B]/30">
                LIMITED AVAILABILITY
              </span>
            </div>
          </div>
          <div className="relative z-50">
            <motion.button
              onClick={() => setShowShareMenu(!showShareMenu)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 border-2 border-[#F5F5DC]/30 text-[#F5F5DC] font-bold text-sm rounded-md hover:border-[#E5A823] hover:text-[#E5A823] transition-colors flex items-center gap-2"
            >
              SHARE <ChevronDown className="w-4 h-4" />
            </motion.button>
            
            {showShareMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 p-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-xl flex flex-col gap-1 min-w-[160px]"
              >
                <button onClick={shareToWhatsApp} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-[#F5F5DC] hover:bg-[#2A2A2A] rounded-lg transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  WhatsApp
                </button>
                <button onClick={shareToInstagram} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-[#F5F5DC] hover:bg-[#2A2A2A] rounded-lg transition-colors">
                  <Instagram className="w-4 h-4 text-pink-500" />
                  Instagram
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
          {/* Left Column - Event Poster & Info */}
          <div className="space-y-6">
            {/* Event Image Gallery with Thumbnails */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              {/* Thumbnails - Left Side */}
              <div className="flex flex-col gap-3 w-20 shrink-0 max-h-[500px] overflow-y-auto pr-1 scrollbar-hide">
                {event.images.map((img, idx) => (
                  <motion.button
                    key={`img-${idx}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setSelectedMediaType('image');
                    }}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      selectedImageIndex === idx && selectedMediaType === 'image'
                        ? 'border-[#EB4D4B] ring-2 ring-[#EB4D4B]/30' 
                        : 'border-[#2A2A2A] hover:border-[#E5A823]'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`Event image ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.button>
                ))}
                {event.mediaFiles?.map((media, idx) => (
                  <motion.button
                    key={`media-${idx}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setSelectedMediaType('video');
                    }}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      selectedImageIndex === idx && selectedMediaType === 'video'
                        ? 'border-[#EB4D4B] ring-2 ring-[#EB4D4B]/30' 
                        : 'border-[#2A2A2A] hover:border-[#E5A823]'
                    }`}
                  >
                    <div className="w-full h-full bg-[#0D0D0D] flex items-center justify-center">
                      <Video className="w-7 h-7 text-[#E5A823]" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white/80" />
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Main Display - Right Side */}
              <div className="relative flex-1 rounded-xl overflow-hidden shadow-lg border border-[#2A2A2A]">
                {selectedMediaType === 'video' && event.mediaFiles && event.mediaFiles[selectedImageIndex] ? (
                  <video 
                    src={event.mediaFiles[selectedImageIndex]} 
                    controls
                    className="w-full aspect-[1] object-cover"
                    poster={event.images[0]}
                  />
                ) : (
                  <img 
                    src={event.images[selectedImageIndex]} 
                    alt={event.title}
                    className="w-full aspect-[1] object-cover"
                  />
                )}
                {/* Like Button */}
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setLiked(!liked)}
                  className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    liked ? 'bg-[#EB4D4B] text-white' : 'bg-[#0D0D0D]/80 text-[#F5F5DC] hover:bg-[#EB4D4B] hover:text-white'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-white' : ''}`} />
                </motion.button>
              </div>
            </motion.div>

            {/* Date & Time + Location Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date & Time */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#2A2A2A] rounded-xl p-4 border border-[#2A2A2A]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-[#E5A823]" />
                  <span className="text-xs font-bold text-[#E5A823]">Date & Time</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#F5F5DC]">Starts At:</p>
                  <p className="text-sm text-[#F5F5DC]/70">{event.date}, {event.time}</p>
                  <p className="text-xs text-[#F5F5DC]/50 mt-2">{event.gatesOpen} - {event.time}</p>
                </div>
              </motion.div>

              {/* Location */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#2A2A2A] rounded-xl p-4 border border-[#2A2A2A]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-[#E5A823]" />
                  <span className="text-xs font-bold text-[#E5A823]">Location</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#F5F5DC]">{event.venue}</p>
                  <p className="text-xs text-[#F5F5DC]/50">{event.distance}</p>
                  <button className="mt-2 px-3 py-1 bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] text-[#0D0D0D] text-xs font-bold rounded hover:from-[#F5C542] hover:to-[#FF6B6B] transition-colors">
                    DIRECTIONS
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Map Location */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#2A2A2A] rounded-xl p-4 border border-[#2A2A2A]"
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPinned className="w-4 h-4 text-[#E5A823]" />
                <span className="text-sm font-bold text-[#F5F5DC]">Map Location</span>
              </div>
              <div className="aspect-video bg-[#0D0D0D] rounded-lg flex items-center justify-center border border-[#2A2A2A]">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-[#E5A823] mx-auto mb-2" />
                  <p className="text-xs text-[#F5F5DC]/50">Interactive map coming soon</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-1 border border-[#2A2A2A] text-xs font-bold rounded hover:bg-[#2A2A2A] text-[#F5F5DC]">Map</button>
                <button className="px-3 py-1 border border-[#2A2A2A] text-xs font-bold rounded hover:bg-[#2A2A2A] text-[#F5F5DC]">Satellite</button>
              </div>
            </motion.div>

            {/* Promoter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#2A2A2A] rounded-xl p-4 border border-[#2A2A2A]"
            >
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-[#E5A823]" />
                <span className="text-sm font-bold text-[#F5F5DC]">Promoter</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{event.promoterName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#F5F5DC]">{event.promoterName.toUpperCase()}</p>
                    <p className="text-xs text-[#F5F5DC]/50">{event.promoterLabel}</p>
                  </div>
                </div>
                <button className="px-3 py-1 border border-[#F5F5DC]/30 text-xs font-bold rounded hover:bg-[#F5F5DC]/10 text-[#F5F5DC]">
                  CONTACT SUPPORT
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Get Tickets */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-4 bg-[#2A2A2A] rounded-xl p-6 border border-[#2A2A2A]"
            >
              <h2 className="text-lg font-black text-[#F5F5DC] mb-1">Get Tickets</h2>
              <p className="text-xs text-[#F5F5DC]/50 mb-6">Select from available ticket types</p>

              {/* Ticket Types */}
              <div className="space-y-4">
                {!selectedTicket ? (
                  // Show ticket options
                  ticketTypes.map((ticket) => (
                    <div 
                      key={ticket.id}
                      className="border-2 border-[#2A2A2A] rounded-lg p-4 hover:border-[#E5A823] transition-colors cursor-pointer bg-[#0D0D0D]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-[#F5F5DC]">{ticket.name}</p>
                          <p className="text-xs text-[#F5F5DC]/50">{ticket.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-[#F5F5DC]">₹{ticket.price}</p>
                          <button 
                            onClick={() => {
                              setSelectedTicket(ticket.id);
                              setQuantity(1);
                            }}
                            className="mt-1 px-4 py-1.5 bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] text-[#0D0D0D] text-xs font-bold rounded hover:from-[#F5C542] hover:to-[#FF6B6B] transition-colors"
                          >
                            SELECT
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Show selected ticket with quantity controls
                  (() => {
                    const ticket = ticketTypes.find(t => t.id === selectedTicket)!;
                    const subtotal = ticket.price * quantity;
                    const total = subtotal + convenienceFee;
                    return (
                      <>
                        <div className="border-2 border-[#EB4D4B] rounded-lg p-4 bg-[#EB4D4B]/10">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm font-bold text-[#F5F5DC]">{ticket.name}</p>
                              <p className="text-xs text-[#F5F5DC]/50">₹{ticket.price}</p>
                            </div>
                            <button 
                              onClick={() => {
                                setSelectedTicket(null);
                                setQuantity(1);
                              }}
                              className="px-3 py-1 bg-[#EB4D4B] text-white text-xs font-bold rounded hover:bg-[#d43d3b] flex items-center gap-1"
                            >
                              <span>X</span> REMOVE
                            </button>
                          </div>
                          
                          {/* Quantity Selector */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#F5F5DC]/70">Quantity</span>
                            <div className="flex items-center border border-[#2A2A2A] rounded">
                              <button 
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="px-3 py-1.5 text-[#F5F5DC] hover:bg-[#2A2A2A] border-r border-[#2A2A2A]"
                                disabled={quantity <= 1}
                              >
                                -
                              </button>
                              <span className="px-4 py-1.5 text-sm font-bold text-[#F5F5DC] min-w-[40px] text-center">
                                {quantity}
                              </span>
                              <button 
                                onClick={() => setQuantity(Math.min(maxTickets, quantity + 1))}
                                className="px-3 py-1.5 text-[#F5F5DC] hover:bg-[#2A2A2A] border-l border-[#2A2A2A]"
                                disabled={quantity >= maxTickets}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-[#F5F5DC]/40 mt-2">Max {maxTickets} tickets per order</p>
                        </div>

                        {/* Price Breakdown */}
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#F5F5DC]/50">Subtotal</span>
                            <span className="text-[#F5F5DC]">₹{subtotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#F5F5DC]/50">Convenience fee</span>
                            <span className="text-[#F5F5DC]">₹{convenienceFee}</span>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-[#F5F5DC]">Total</span>
                            <span className="text-2xl font-black text-[#F5F5DC]">₹{total.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Continue to Checkout */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full mt-4 py-3 bg-[#EB4D4B] text-white font-black text-sm rounded-lg hover:bg-[#d43d3b] transition-all flex items-center justify-center gap-2"
                        >
                          <Ticket className="w-4 h-4" />
                          CONTINUE TO CHECKOUT
                        </motion.button>
                      </>
                    );
                  })()
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
