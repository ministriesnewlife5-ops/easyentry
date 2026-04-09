'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, Heart, Instagram, MapPin, MapPinned, Star, Ticket, Video, Play, Loader2, CheckCircle, Download, X, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type { PublicEvent } from '@/lib/public-events-store';
import { useSession } from 'next-auth/react';
import QRCode from 'qrcode';

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
  // Ticket section is now always visible by default
  const [showTicketSection, setShowTicketSection] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
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
        description: cat.tagline?.trim() ? cat.tagline.trim() : `Category: ${cat.name}`,
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

  const directionsUrl = useMemo(() => {
    if (!event) return '';
    if (event.googleMapsLink && /^https?:\/\//i.test(event.googleMapsLink)) {
      return event.googleMapsLink;
    }
    if (!event.venue) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`;
  }, [event]);

  const mapEmbedUrl = useMemo(() => {
    if (!event) return '';
    if (event.venue) {
      return `https://www.google.com/maps?q=${encodeURIComponent(event.venue)}&output=embed`;
    }
    if (directionsUrl) {
      return `https://www.google.com/maps?q=${encodeURIComponent(directionsUrl)}&output=embed`;
    }
    return '';
  }, [event, directionsUrl]);

  const shareToWhatsApp = () => {
    if (!event) {
      return;
    }
    setShowWhatsAppModal(true);
  };

  const shareToInstagram = () => {
    if (!event) {
      return;
    }
    setShowInstagramModal(true);
  };

  const handleInstagramShare = (type: 'reel' | 'story' | 'post') => {
    if (!event) return;
    const url = window.location.href;
    const text = `Check out ${event.title} at ${event.venue}! ${url}`;
    
    // Try to open Instagram app with deep link
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      window.location.href = `instagram://share?url=${encodeURIComponent(url)}`;
      setTimeout(() => {
        window.open('https://instagram.com', '_blank');
      }, 500);
    } else {
      window.open('https://instagram.com', '_blank');
    }
    
    setShowInstagramModal(false);
  };

  const handleWhatsAppShare = (type: 'status' | 'send') => {
    if (!event) return;
    const url = window.location.href;
    const text = `Check out ${event.title} at ${event.venue}! ${url}`;
    
    if (type === 'status') {
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        window.open(`whatsapp://send?text=${encodeURIComponent(text)}`, '_blank');
        setTimeout(() => {
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }, 500);
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }
    } else {
      window.open(`https://api.whatsapp.com/send/?text=${encodeURIComponent(text)}`, '_blank');
    }
    
    setShowWhatsAppModal(false);
  };

  // Download ticket as image
  const downloadTicket = useCallback(async () => {
    if (!bookingDetails) return;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1700;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not initialize canvas context');
      }

      // Background
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header gradient
      const headerGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      headerGradient.addColorStop(0, '#E5A823');
      headerGradient.addColorStop(1, '#EB4D4B');
      ctx.fillStyle = headerGradient;
      ctx.fillRect(0, 0, canvas.width, 210);

      // Header text
      ctx.fillStyle = '#0D0D0D';
      ctx.font = 'bold 56px Arial';
      ctx.fillText('Payment Successful!', 60, 92);
      ctx.font = '32px Arial';
      ctx.fillText('Your tickets are confirmed', 60, 145);

      // QR box
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(60, 250, 1080, 390);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(420, 300, 360, 280);

      const qrCanvas = ticketRef.current?.querySelector('canvas');
      if (qrCanvas) {
        ctx.drawImage(qrCanvas, 470, 340, 260, 200);
      }

      ctx.fillStyle = '#F5F5DC';
      ctx.font = '24px Arial';
      ctx.fillText('Scan at venue entry', 500, 290);
      ctx.font = '20px monospace';
      ctx.fillText(bookingDetails.bookingId, 430, 610);

      // Event section
      ctx.fillStyle = '#F5F5DC';
      ctx.font = 'bold 44px Arial';
      ctx.fillText(bookingDetails.eventTitle.slice(0, 42), 60, 725);

      ctx.font = '28px Arial';
      ctx.fillStyle = '#BDBDAF';
      ctx.fillText(`${bookingDetails.eventDate} • ${bookingDetails.eventTime}`, 60, 775);
      ctx.fillText(bookingDetails.venue, 60, 820);

      // Ticket details card
      ctx.fillStyle = '#2A2A2A';
      ctx.fillRect(60, 860, 1080, 460);
      ctx.fillStyle = '#F5F5DC';
      ctx.font = 'bold 34px Arial';
      ctx.fillText('Ticket Details', 95, 925);

      let y = 980;
      ctx.font = '28px Arial';
      for (const ticket of bookingDetails.tickets) {
        const line = `${ticket.name} x ${ticket.quantity}`;
        const amount = `₹${(ticket.price * ticket.quantity).toFixed(2)}`;
        ctx.fillStyle = '#D5D5CA';
        ctx.fillText(line.slice(0, 45), 95, y);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#F5F5DC';
        ctx.fillText(amount, 1105, y);
        ctx.textAlign = 'left';
        y += 55;
      }

      // Total
      ctx.strokeStyle = '#3A3A3A';
      ctx.beginPath();
      ctx.moveTo(95, 1235);
      ctx.lineTo(1105, 1235);
      ctx.stroke();

      ctx.fillStyle = '#BDBDAF';
      ctx.font = '28px Arial';
      ctx.fillText('Total Paid', 95, 1285);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#E5A823';
      ctx.font = 'bold 40px Arial';
      ctx.fillText(`₹${bookingDetails.totalAmount.toFixed(2)}`, 1105, 1288);
      ctx.textAlign = 'left';

      // Footer metadata
      ctx.fillStyle = '#A5A598';
      ctx.font = '22px Arial';
      ctx.fillText(`Booked by: ${bookingDetails.userName}`, 60, 1400);
      ctx.fillText(`Email: ${bookingDetails.userEmail}`, 60, 1440);
      ctx.fillText(`Booking ID: ${bookingDetails.bookingId}`, 60, 1480);
      ctx.fillText(`Payment ID: ${bookingDetails.paymentId}`, 60, 1520);
      ctx.fillText(`Booked on: ${new Date(bookingDetails.bookedAt).toLocaleString('en-IN')}`, 60, 1560);
      
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
                eventSnapshot: {
                  title: event.title,
                  date: event.date,
                  venue: event.venue,
                  image: event.image,
                },
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
          <div className="flex items-center gap-3 z-50">
            <motion.button
              onClick={shareToInstagram}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 backdrop-blur-md flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow"
              title="Share to Instagram"
            >
              <Instagram className="w-5 h-5" />
            </motion.button>
            <motion.button
              onClick={shareToWhatsApp}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-full bg-[#25D366] backdrop-blur-md flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow"
              title="Share to WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
            </motion.button>
          </div>
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
                className="bg-[#1A1A1A] border border-[#E5A823]/20 rounded-2xl p-8 max-w-sm w-11/12 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-[#F5F5DC] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center">
                      <Instagram className="w-5 h-5 text-white" />
                    </div>
                    Share to Instagram
                  </h3>
                  <button
                    onClick={() => setShowInstagramModal(false)}
                    className="text-[#F5F5DC]/50 hover:text-[#F5F5DC] transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[#F5F5DC]/70 text-sm mb-8">Choose how to share this event:</p>
                <div className="space-y-3">
                  <button
                    onClick={() => handleInstagramShare('reel')}
                    className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-pink-500/50 transition-all"
                  >
                    Share as Reel
                  </button>
                  <button
                    onClick={() => handleInstagramShare('story')}
                    className="w-full px-4 py-3 bg-gradient-to-r from-orange-400 to-pink-500 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all"
                  >
                    Share in Story
                  </button>
                  <button
                    onClick={() => handleInstagramShare('post')}
                    className="w-full px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-yellow-500/50 transition-all"
                  >
                    Share as Post
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
                className="bg-[#1A1A1A] border border-[#25D366]/20 rounded-2xl p-8 max-w-sm w-11/12 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-[#F5F5DC] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    Share to WhatsApp
                  </h3>
                  <button
                    onClick={() => setShowWhatsAppModal(false)}
                    className="text-[#F5F5DC]/50 hover:text-[#F5F5DC] transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[#F5F5DC]/70 text-sm mb-8">Choose how to share this event:</p>
                <div className="space-y-3">
                  <button
                    onClick={() => handleWhatsAppShare('send')}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
                  >
                    Send to Chat
                  </button>
                  <button
                    onClick={() => handleWhatsAppShare('status')}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#128C7E] to-[#075E54] rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition-all"
                  >
                    Add to Status
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  {directionsUrl && (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex px-3 py-1 bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] text-[#0D0D0D] text-xs font-bold rounded hover:from-[#F5C542] hover:to-[#FF6B6B] transition-colors"
                    >
                      DIRECTIONS
                    </a>
                  )}
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
              <div className="aspect-video bg-[#0D0D0D] rounded-lg overflow-hidden border border-[#2A2A2A]">
                {mapEmbedUrl ? (
                  <iframe
                    title="Event location map"
                    src={mapEmbedUrl}
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-[#E5A823] mx-auto mb-2" />
                      <p className="text-xs text-[#F5F5DC]/50">Location unavailable</p>
                    </div>
                  </div>
                )}
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

            {/* Tagged Artists */}
            {event.taggedArtists && event.taggedArtists.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-[#2A2A2A] rounded-xl p-4 border border-[#2A2A2A]"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-[#E5A823]" />
                  <span className="text-sm font-bold text-[#F5F5DC]">Performing Artists</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {event.taggedArtists.map((artist) => (
                    <Link
                      key={artist.id}
                      href={artist.profileUrl || `/artist/${artist.id}`}
                      className="group flex flex-col items-center text-center"
                    >
                      <img
                        src={artist.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name || 'Artist')}&background=1f2937&color=fff&size=80`}
                        alt={artist.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#E5A823]/40 group-hover:border-[#E5A823] transition-colors"
                      />
                      <span className="mt-2 text-xs font-semibold text-[#F5F5DC] group-hover:text-[#E5A823] line-clamp-2">
                        {artist.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Get Tickets */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-4 bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]"
            >
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
                            {ticket.description && (
                              <p className="text-xs text-[#F5F5DC]/70 line-clamp-2">{ticket.description}</p>
                            )}
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
                      </div>
                    {paymentError && (
                      <p className="mt-2 text-xs text-[#EB4D4B]">{paymentError}</p>
                    )}
                  </div>
                </>
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
