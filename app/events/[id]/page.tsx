'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, Heart, Instagram, MapPin, MapPinned, Star, Ticket, Video, Play, Loader2, CheckCircle, Download, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type { PublicEvent } from '@/lib/public-events-store';
import { useSession } from 'next-auth/react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface TicketCategory {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface BookingDetails {
  bookingId: string;
  paymentId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  tickets: TicketCategory[];
  totalAmount: number;
  userName: string;
  userEmail: string;
  bookedAt: string;
}

export default function EventDetailsPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [liked, setLiked] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showTicketSection, setShowTicketSection] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video'>('image');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

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

  const ticketTypes = useMemo(() => {
    if (!event) {
      return [];
    }
    // If event has ticket categories, use them
    if (event.ticketCategories && event.ticketCategories.length > 0) {
      return event.ticketCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        price: cat.price,
        description: `Category: ${cat.name}`,
        availableFrom: cat.availableFrom,
        availableUntil: cat.availableUntil,
      }));
    }
    // Fallback to single ticket type based on event price
    const numericPrice = Number(event.price.replace(/[^\d.]/g, ''));
    return [
      {
        id: 'entry',
        name: 'General Admission',
        price: Number.isFinite(numericPrice) ? numericPrice : 0,
        description: 'Select from available ticket types',
        availableFrom: undefined,
        availableUntil: undefined,
      },
    ];
  }, [event]);

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

  // Download ticket as image
  const downloadTicket = useCallback(async () => {
    if (!ticketRef.current) return;
    
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#1A1A1A',
        scale: 2,
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `ticket-${bookingDetails?.bookingId || 'download'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to download ticket:', error);
      alert('Failed to download ticket. Please try again.');
    }
  }, [bookingDetails]);
  const loadRazorpayScript = useCallback(() => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  // Calculate total amount
  const calculateTotal = useCallback(() => {
    const subtotal = ticketTypes.reduce((sum, t) => sum + (t.price * (quantities[t.id] || 0)), 0);
    const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);
    const convenienceFees = totalTickets > 0 ? convenienceFee * totalTickets : 0;
    return {
      subtotal,
      convenienceFees,
      total: subtotal + convenienceFees,
      totalTickets,
    };
  }, [ticketTypes, quantities, convenienceFee]);

  // Handle payment
  const handleProceedToPayment = useCallback(async () => {
    console.log('=== Payment Debug Start ===');
    console.log('Session:', session);
    console.log('Event:', event);
    
    if (!session?.user) {
      console.log('No user session');
      alert('Please log in to purchase tickets');
      return;
    }

    if (!event) {
      console.log('No event data');
      return;
    }

    const { total, totalTickets } = calculateTotal();
    console.log('Total:', total, 'Total Tickets:', totalTickets);

    if (totalTickets === 0) {
      alert('Please select at least one ticket');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      console.log('Loading Razorpay script...');
      const scriptLoaded = await loadRazorpayScript();
      console.log('Script loaded:', scriptLoaded);
      
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway script');
      }

      // Prepare ticket categories
      const selectedCategories: TicketCategory[] = ticketTypes
        .filter(t => (quantities[t.id] || 0) > 0)
        .map(t => ({
          id: t.id,
          name: t.name,
          quantity: quantities[t.id] || 0,
          price: t.price,
        }));
      console.log('Selected categories:', selectedCategories);

      // Create order
      console.log('Creating order...');
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          eventId: event.id,
          eventTitle: event.title,
          ticketCategories: selectedCategories,
        }),
      });

      console.log('Order response status:', orderResponse.status);
      const orderData = await orderResponse.json();
      console.log('Order data:', orderData);

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(orderData.error || `Failed to create order (${orderResponse.status})`);
      }

      // Open Razorpay checkout
      console.log('Opening Razorpay with key:', orderData.keyId);
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Easy Entry',
        description: `${event.title} - ${totalTickets} Ticket(s)`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          console.log('Payment handler response:', response);
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                eventId: event.id,
                ticketCategories: selectedCategories,
                amount: orderData.amount,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              // Prepare booking details
              const selectedCategories: TicketCategory[] = ticketTypes
                .filter(t => (quantities[t.id] || 0) > 0)
                .map(t => ({
                  id: t.id,
                  name: t.name,
                  quantity: quantities[t.id] || 0,
                  price: t.price,
                }));

              const newBooking: BookingDetails = {
                bookingId: verifyData.bookingId,
                paymentId: verifyData.paymentId || response.razorpay_payment_id,
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
                venue: event.venue,
                tickets: selectedCategories,
                totalAmount: orderData.amount / 100,
                userName: session.user.name || '',
                userEmail: session.user.email || '',
                bookedAt: new Date().toISOString(),
              };

              setBookingDetails(newBooking);
              setShowSuccessModal(true);
              
              // Reset quantities
              setQuantities({});
              setShowTicketSection(false);
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setPaymentError('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: session.user.name || '',
          email: session.user.email || '',
          contact: '',
        },
        theme: {
          color: '#E5A823',
        },
        modal: {
          ondismiss: () => {
            console.log('Razorpay modal dismissed');
            setIsProcessingPayment(false);
          },
        },
      };

      console.log('Razorpay options:', options);
      
      if (!window.Razorpay) {
        throw new Error('Razorpay not available on window');
      }
      
      const razorpay = new window.Razorpay(options);
      console.log('Razorpay instance created, opening...');
      razorpay.open();
      console.log('Razorpay opened');

    } catch (error) {
      console.error('=== Payment Error ===', error);
      setPaymentError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsProcessingPayment(false);
    }
  }, [session, event, ticketTypes, quantities, calculateTotal, loadRazorpayScript]);

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
            {/* Event Image Gallery with Thumbnails - Mobile Responsive */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col-reverse md:flex-row gap-4"
            >
              {/* Thumbnails - Bottom on mobile, Left on desktop */}
              <div className="flex md:flex-col gap-3 md:w-20 md:shrink-0 max-h-[500px] overflow-x-auto md:overflow-y-auto md:pr-1 scrollbar-hide pb-1 md:pb-0">
                {event.images.map((img, idx) => (
                  <motion.button
                    key={`img-${idx}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setSelectedMediaType('image');
                    }}
                    className={`relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
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
                    className={`relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      selectedImageIndex === idx && selectedMediaType === 'video'
                        ? 'border-[#EB4D4B] ring-2 ring-[#EB4D4B]/30' 
                        : 'border-[#2A2A2A] hover:border-[#E5A823]'
                    }`}
                  >
                    <div className="w-full h-full bg-[#0D0D0D] flex items-center justify-center">
                      <Video className="w-5 h-5 md:w-7 md:h-7 text-[#E5A823]" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Main Display - Full width on mobile */}
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
              className="sticky top-4 bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]"
            >
              {!showTicketSection ? (
                // Show Get Tickets button initially
                <div className="text-center py-4">
                  <h2 className="text-lg font-black text-[#F5F5DC] mb-4">Get Tickets</h2>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowTicketSection(true)}
                    className="w-full py-3 bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] text-[#0D0D0D] font-black text-sm rounded-lg hover:from-[#F5C542] hover:to-[#FF6B6B] transition-all"
                  >
                    GET TICKETS
                  </motion.button>
                </div>
              ) : (
                // Show ticket categories after clicking
                <>
                  <h2 className="text-base font-semibold text-[#F5F5DC] mb-1">Select Tickets</h2>

                  {/* Ticket Categories List */}
                  <div className="space-y-2 mt-4">
                    {ticketTypes.map((ticket) => (
                      <div 
                        key={ticket.id}
                        className="bg-[#2A2A2A] rounded-lg p-3 border border-[#2A2A2A]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#F5F5DC]">{ticket.name}</p>
                            <p className="text-sm text-[#F5F5DC]/60">₹{ticket.price.toFixed(2)}</p>
                            {(ticket.availableFrom || ticket.availableUntil) && (
                              <p className="text-xs text-[#EB4D4B] mt-1">
                                {ticket.availableFrom && ticket.availableUntil ? (
                                  <>Available: {new Date(ticket.availableFrom).toLocaleString('en-IN', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })} - {new Date(ticket.availableUntil).toLocaleString('en-IN', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}</>
                                ) : ticket.availableFrom ? (
                                  <>Available from: {new Date(ticket.availableFrom).toLocaleString('en-IN', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}</>
                                ) : (
                                  <>Available until: {new Date(ticket.availableUntil!).toLocaleString('en-IN', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}</>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button 
                              onClick={() => setQuantities(prev => ({ ...prev, [ticket.id]: Math.max(0, (prev[ticket.id] || 0) - 1) }))}
                              className="w-8 h-8 flex items-center justify-center bg-[#0D0D0D] rounded text-[#F5F5DC] hover:bg-[#3A3A3A]"
                              disabled={(quantities[ticket.id] || 0) <= 0}
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-[#F5F5DC]">
                              {quantities[ticket.id] || 0}
                            </span>
                            <button 
                              onClick={() => setQuantities(prev => ({ ...prev, [ticket.id]: Math.min(maxTickets, (prev[ticket.id] || 0) + 1) }))}
                              className="w-8 h-8 flex items-center justify-center bg-[#333333] rounded text-white hover:bg-[#444444]"
                              disabled={(quantities[ticket.id] || 0) >= maxTickets}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Summary Bar */}
                  <div className="mt-4 bg-[#EB4D4B]/10 rounded-lg p-3 border border-[#EB4D4B]/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#F5F5DC]">₹{calculateTotal().total.toFixed(2)}</p>
                        <p className="text-xs text-[#F5F5DC]/60">{calculateTotal().totalTickets} Tickets (₹{calculateTotal().subtotal.toFixed(2)} + ₹{calculateTotal().convenienceFees.toFixed(2)} fees)</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleProceedToPayment}
                        disabled={isProcessingPayment || calculateTotal().totalTickets === 0}
                        className="px-6 py-2 bg-[#EB4D4B] text-white font-semibold text-sm rounded-lg hover:bg-[#d43d3b] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isProcessingPayment ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Proceed'
                        )}
                      </motion.button>
                      <button 
                        onClick={() => {
                          // Test QR modal directly
                          setBookingDetails({
                            bookingId: 'TEST-12345',
                            paymentId: 'pay_test_123',
                            eventTitle: event.title,
                            eventDate: event.date,
                            eventTime: event.time,
                            venue: event.venue,
                            tickets: [{id: '1', name: 'Test Ticket', quantity: 2, price: 500}],
                            totalAmount: 1000,
                            userName: session?.user?.name || 'Test User',
                            userEmail: session?.user?.email || 'test@test.com',
                            bookedAt: new Date().toISOString(),
                          });
                          setShowSuccessModal(true);
                        }}
                        className="mt-2 text-xs text-[#F5F5DC]/50 hover:text-[#F5F5DC]"
                      >
                        Test Success Modal
                      </button>
                    </div>
                    {paymentError && (
                      <p className="mt-2 text-xs text-[#EB4D4B]">{paymentError}</p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </div>

        {/* Ticket Success Modal with QR Code */}
        <AnimatePresence>
          {showSuccessModal && bookingDetails && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-md w-full max-h-[90vh] overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                        <CheckCircle className="w-7 h-7 text-[#0D0D0D]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#0D0D0D]">Payment Successful!</h2>
                        <p className="text-sm text-[#0D0D0D]/80">Your tickets are confirmed</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSuccessModal(false)}
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <X className="w-5 h-5 text-[#0D0D0D]" />
                    </button>
                  </div>
                </div>

                {/* Ticket Content - Scrollable */}
                <div ref={ticketRef} className="p-6 space-y-6 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                  {/* QR Code Section */}
                  <div className="bg-[#0D0D0D] rounded-xl p-4 border border-[#2A2A2A]">
                    <div className="text-center">
                      <p className="text-xs text-[#F5F5DC]/60 mb-3">Scan at venue entry</p>
                      <div className="bg-white p-3 rounded-lg inline-block">
                        <QRCodeCanvas
                          bookingId={bookingDetails.bookingId}
                          eventTitle={bookingDetails.eventTitle}
                          tickets={bookingDetails.tickets}
                        />
                      </div>
                      <p className="text-xs text-[#F5F5DC]/40 mt-3 font-mono">{bookingDetails.bookingId}</p>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-[#F5F5DC]">{bookingDetails.eventTitle}</h3>
                    <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/70">
                      <Calendar className="w-4 h-4 text-[#E5A823]" />
                      <span>{bookingDetails.eventDate} • {bookingDetails.eventTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/70">
                      <MapPin className="w-4 h-4 text-[#E5A823]" />
                      <span>{bookingDetails.venue}</span>
                    </div>
                  </div>

                  {/* Ticket Details */}
                  <div className="bg-[#2A2A2A] rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-[#F5F5DC] flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-[#E5A823]" />
                      Ticket Details
                    </h4>
                    {bookingDetails.tickets.map((ticket, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-[#F5F5DC]/70">{ticket.name} x {ticket.quantity}</span>
                        <span className="text-[#F5F5DC] font-semibold">₹{(ticket.price * ticket.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-[#3A3A3A] pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[#F5F5DC]/60 text-sm">Total Paid</span>
                        <span className="text-[#E5A823] font-bold text-lg">₹{bookingDetails.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Info */}
                  <div className="space-y-2 text-xs text-[#F5F5DC]/50">
                    <p>Booked by: {bookingDetails.userName}</p>
                    <p>Email: {bookingDetails.userEmail}</p>
                    <p>Booking ID: {bookingDetails.bookingId}</p>
                    <p>Payment ID: {bookingDetails.paymentId}</p>
                    <p>Booked on: {new Date(bookingDetails.bookedAt).toLocaleString('en-IN')}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 p-6 pt-0">
                    <button
                      onClick={downloadTicket}
                      className="flex-1 py-3 bg-[#2A2A2A] text-[#F5F5DC] font-semibold rounded-lg hover:bg-[#3A3A3A] transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Ticket
                    </button>
                    <button
                      onClick={() => setShowSuccessModal(false)}
                      className="flex-1 py-3 bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] text-[#0D0D0D] font-semibold rounded-lg hover:from-[#F5C542] hover:to-[#FF6B6B] transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// QR Code Canvas Component
function QRCodeCanvas({ 
  bookingId, 
  eventTitle, 
  tickets 
}: { 
  bookingId: string; 
  eventTitle: string; 
  tickets: TicketCategory[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Generate QR code data
    const qrData = JSON.stringify({
      bookingId,
      event: eventTitle,
      tickets: tickets.map(t => ({ name: t.name, qty: t.quantity })),
      timestamp: Date.now(),
    });

    // Generate QR code on canvas
    QRCode.toCanvas(canvasRef.current, qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    }, (error) => {
      if (error) console.error('QR Code generation error:', error);
    });
  }, [bookingId, eventTitle, tickets]);

  return <canvas ref={canvasRef} className="rounded" />;
}
