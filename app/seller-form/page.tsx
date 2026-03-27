'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  IndianRupee,
  User, 
  Image as ImageIcon, 
  Info, 
  FileText, 
  AlertCircle,
  Upload,
  ArrowRight,
  Ticket,
  Send,
  Edit2,
  Camera,
  Star,
  CheckCircle2,
  Plus,
  Trash2,
  Video,
  X,
  Clock
} from 'lucide-react';
import Navigation from '@/components/ui/Navigation';
import Footer from '@/components/ui/Footer';

// Converts a File to a base64 data URL so images persist after page reload
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function SellerFormPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    organizer: '',
    location: '',
    date: '',
    startTime: '',
    endTime: '',
    about: '',
    rules: '',
    numberOfTickets: '',
    category: '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const [activeTab, setActiveTab] = useState<'details' | 'media' | 'promo'>('details');
  const [events, setEvents] = useState<Array<{ id: number; title: string; venue: string; date: string }>>([]);
  const [promoForm, setPromoForm] = useState({
    eventId: '',
    promoCode: '',
    discountPercent: ''
  });
  const [promoRequests, setPromoRequests] = useState<Array<{ id: number; eventTitle: string; code: string; status: string }>>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketCategories, setTicketCategories] = useState<Array<{ id: string; name: string; price: number; availableFromDate?: string; availableFromTime?: string; availableUntilDate?: string; availableUntilTime?: string }>>([]);
  const [previewCategoryId, setPreviewCategoryId] = useState<string>('female');
  const [customCategory, setCustomCategory] = useState('');
  const [rules, setRules] = useState<Array<{ id: string; text: string }>>([{ id: '1', text: '' }]);
  const [pricing, setPricing] = useState({
    ticket: 799,
    platformFee: 5,
    artistShare: 4,
    discount: 0
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { getHostedEvents } = require('@/lib/hosted-events');
      const hostedEvents = getHostedEvents();
      setEvents(hostedEvents);
    }
  }, []);

  const handlePromoInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPromoForm(prev => ({ ...prev, [name]: value }));
  };

  const generateUniqueCode = () => {
    const prefix = 'SELLER';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}${random}`;
    setPromoForm(prev => ({ ...prev, promoCode: code }));
  };

  const handleSendEventRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title || !formData.date || !formData.startTime || !formData.location) {
      setNotificationMessage('Please fill in all required fields (Title, Date, Start Time, Location)');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get the minimum price from ticket categories or form
      const minPrice = ticketCategories.length > 0 
        ? Math.min(...ticketCategories.map(c => c.price))
        : Number(formData.price) || 0;

      // Convert cover image to base64
      const coverImageBase64 = coverImage 
        ? await fileToBase64(coverImage) 
        : (mediaFiles.length > 0 && mediaFiles[0].type.startsWith('image/') 
            ? await fileToBase64(mediaFiles[0]) 
            : '');

      // Convert all media files (images and videos) to base64
      const mediaFilesBase64: string[] = [];
      for (const file of mediaFiles) {
        const base64 = await fileToBase64(file);
        mediaFilesBase64.push(base64);
      }
      
      const eventData = {
        title: formData.title,
        subtitle: formData.description,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.location,
        category: formData.category === 'Other' ? customCategory : (formData.category || 'General'),
        price: `₹${minPrice}`,
        image: coverImageBase64,
        numberOfTickets: formData.numberOfTickets,
        mediaFiles: mediaFilesBase64,
        description: formData.about,
        fullDescription: formData.about,
        gatesOpen: formData.startTime,
        entryAge: '18+',
        layout: 'Standing',
        seating: 'General Admission',
        rules: rules.filter(r => r.text.trim()).map(r => r.text),
        ticketCategories: ticketCategories.map(cat => ({
          ...cat,
          availableFrom: cat.availableFromDate && cat.availableFromTime 
            ? `${cat.availableFromDate}T${cat.availableFromTime}` 
            : (cat.availableFromDate || undefined),
          availableUntil: cat.availableUntilDate && cat.availableUntilTime 
            ? `${cat.availableUntilDate}T${cat.availableUntilTime}` 
            : (cat.availableUntilDate || undefined)
        }))
      };

      const response = await fetch('/api/admin/event-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventData }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotificationMessage('Your request has been sent to admin for approval.');
        setShowNotification(true);
        
        // Hide notification after 5 seconds
        setTimeout(() => {
          setShowNotification(false);
        }, 5000);
        
        // Also save to localStorage for immediate display
        const { saveHostedEvent } = require('@/lib/hosted-events');
        saveHostedEvent({
          id: Date.now(),
          title: formData.title,
          date: formData.date,
          venue: formData.location,
          price: `₹${minPrice}`,
          imageColor: 'bg-blue-900',
          category: 'General',
          imageUrl: coverImageBase64,
          createdAt: Date.now()
        });
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          price: '',
          organizer: '',
          location: '',
          date: '',
          startTime: '',
          endTime: '',
          about: '',
          rules: '',
          numberOfTickets: '',
          category: '',
        });
        setImages([]);
        setCoverImage(null);
        setMediaFiles([]);
        setTicketCategories([]);
        setCustomCategory('');
        setRules([{ id: '1', text: '' }]);
        
        // Also handle promo code if entered
        if (promoForm.promoCode) {
          const newRequest = {
            id: Date.now(),
            eventTitle: formData.title,
            code: promoForm.promoCode,
            status: 'Pending'
          };
          setPromoRequests(prev => [newRequest, ...prev]);
          setPromoForm({ eventId: '', promoCode: '', discountPercent: '' });
        }
        
        // Redirect to outlet profile events page after 2 seconds to see the notification
        setTimeout(() => {
          router.push('/outlet/profile?tab=events');
        }, 2000);
      } else {
        const error = await response.json();
        setNotificationMessage(error.error || 'Failed to submit event request.');
        setShowNotification(true);
      }
    } catch (error) {
      console.error('Error submitting event:', error);
      setNotificationMessage('An error occurred while submitting your request.');
      setShowNotification(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(e.target.files[0]);
    }
  };

  const handleMediaFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setMediaFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...selectedFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get the minimum price from ticket categories or form
      const minPrice = ticketCategories.length > 0 
        ? Math.min(...ticketCategories.map(c => c.price))
        : Number(formData.price) || 0;

      // Convert image to base64 so it persists across sessions and pages
      const imageBase64 = coverImage 
        ? await fileToBase64(coverImage) 
        : (mediaFiles.length > 0 && mediaFiles[0].type.startsWith('image/') 
            ? await fileToBase64(mediaFiles[0]) 
            : '');
      
      const eventData = {
        title: formData.title,
        subtitle: formData.description,
        date: formData.date,
        time: formData.startTime,
        endTime: formData.endTime,
        venue: formData.location,
        category: 'General',
        price: `₹${minPrice}`,
        image: imageBase64,
        description: formData.about,
        fullDescription: formData.about,
        gatesOpen: formData.startTime,
        entryAge: '18+',
        layout: 'Standing',
        seating: 'General Admission'
      };

      const response = await fetch('/api/admin/event-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventData }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotificationMessage('Your request has been sent to admin for approval.');
        setShowNotification(true);
        
        // Hide notification after 5 seconds
        setTimeout(() => {
          setShowNotification(false);
        }, 5000);
        
        // Also save to localStorage for immediate display
        const { saveHostedEvent } = require('@/lib/hosted-events');
        saveHostedEvent({
          id: Date.now(),
          title: formData.title,
          date: formData.date,
          venue: formData.location,
          price: `₹${minPrice}`,
          imageColor: 'bg-blue-900',
          category: 'General',
          imageUrl: imageBase64,
          createdAt: Date.now()
        });
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          price: '',
          organizer: '',
          location: '',
          date: '',
          startTime: '',
          endTime: '',
          about: '',
          rules: '',
          numberOfTickets: '',
          category: '',
        });
        setImages([]);
        setCoverImage(null);
        setMediaFiles([]);
        setTicketCategories([]);
        setCustomCategory('');
        setRules([{ id: '1', text: '' }]);
      } else {
        const error = await response.json();
        setNotificationMessage(error.error || 'Failed to submit event request.');
        setShowNotification(true);
      }
    } catch (error) {
      console.error('Error submitting event:', error);
      setNotificationMessage('An error occurred while submitting your request.');
      setShowNotification(true);
    }
  };

  const previewPriceValue =
    ticketCategories.length > 0
      ? Math.min(...ticketCategories.map((c) => Number(c.price) || 0))
      : Number(formData.price || 0);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      {/* Header */}
      <div className="bg-[#0D0D0D] border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[#E5A823]">Seller Dashboard</h1>
            <span className="text-[#F5F5DC]/50">|</span>
            <span className="text-[#F5F5DC]/70">Create and manage your events</span>
          </div>
        </div>
      </div>

      {/* Notification Toast - Glass Morphism Theme */}
      {showNotification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full mx-4">
          <div className={`p-4 rounded-xl backdrop-blur-md border shadow-2xl ${
            notificationMessage.includes('sent to admin') 
              ? 'bg-[#E5A823]/90 border-[#F5C542] text-[#0D0D0D]' 
              : 'bg-[#EB4D4B]/90 border-[#FF6B6B] text-white'
          }`}>
            <div className="flex items-center gap-3">
              {notificationMessage.includes('sent to admin') ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-[#0D0D0D]/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-[#0D0D0D]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0D0D0D]">Success!</p>
                    <p className="text-sm text-[#0D0D0D]/80">{notificationMessage}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold">Error</p>
                    <p className="text-sm text-white/80">{notificationMessage}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 sm:gap-8 overflow-x-auto scrollbar-hide">
            {[
              { id: 'details', label: 'Basic Details', icon: Edit2 },
              { id: 'media', label: 'Event Media', icon: Camera },
              { id: 'promo', label: 'Promo Codes', icon: Ticket },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'border-[#E5A823] text-[#E5A823]'
                    : 'border-transparent text-[#F5F5DC]/60 hover:text-[#F5F5DC]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-sm">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Details Tab */}
            {activeTab === 'details' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Basic Information Section */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Info className="w-5 h-5 text-[#E5A823]" />
                    Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-3">Event Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        placeholder="e.g. Summer Music Festival 2026"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Category *</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => ({ ...prev, category: value }));
                          if (value !== 'Other') {
                            setCustomCategory('');
                          }
                        }}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        required
                      >
                        <option value="">Select category</option>
                        <option value="Gigs">Gigs</option>
                        <option value="Party">Party</option>
                        <option value="DJ">DJ</option>
                        <option value="Comedy">Comedy</option>
                        <option value="Theatre">Theatre</option>
                        <option value="Art">Art</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.category === 'Other' && (
                        <div className="mt-3">
                          <input
                            type="text"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            className="w-full bg-[#2A2A2A] border border-[#E5A823]/50 rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                            placeholder="Enter custom category"
                            required
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Organizer *</label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 w-4 h-4 text-[#F5F5DC]/50" />
                        <input
                          type="text"
                          name="organizer"
                          value={formData.organizer}
                          onChange={handleInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                          placeholder="Organizer Name"
                          required
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-3">Ticket Categories *</label>
                      <div className="space-y-4">
                        {ticketCategories.map((cat, idx) => (
                          <div key={cat.id} className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
                            <div className="flex items-center gap-3 mb-3">
                              <input
                                type="text"
                                value={cat.name}
                                onChange={(e) => {
                                  const v = e.target.value.toUpperCase();
                                  setTicketCategories((prev) =>
                                    prev.map((c) => (c.id === cat.id ? { ...c, name: v } : c))
                                  );
                                }}
                                className="flex-1 bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                placeholder="Category name"
                                required
                              />
                              <div className="relative w-32">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F5DC]/50" />
                                <input
                                  type="number"
                                  value={cat.price}
                                  onChange={(e) => {
                                    const price = Math.max(0, Number(e.target.value));
                                    setTicketCategories((prev) =>
                                      prev.map((c) => (c.id === cat.id ? { ...c, price } : c))
                                    );
                                    if (cat.id === previewCategoryId) {
                                      setPricing((p) => ({ ...p, ticket: price }));
                                    }
                                  }}
                                  className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                  placeholder="0"
                                  min={0}
                                  step={0.01}
                                  required
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setTicketCategories((prev) => prev.filter((c) => c.id !== cat.id));
                                  if (previewCategoryId === cat.id && ticketCategories.length > 1) {
                                    const next = ticketCategories.find((c) => c.id !== cat.id);
                                    if (next) {
                                      setPreviewCategoryId(next.id);
                                      setPricing((p) => ({ ...p, ticket: next.price }));
                                    }
                                  }
                                }}
                                disabled={ticketCategories.length <= 1}
                                className="p-2 rounded-lg border border-[#2A2A2A] hover:border-[#EB4D4B] hover:bg-[#EB4D4B]/10 disabled:opacity-40"
                              >
                                <Trash2 className="w-4 h-4 text-[#F5F5DC]/70" />
                              </button>
                            </div>
                            <div className="space-y-3">
                              {/* Available from */}
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-[#F5F5DC]/50 whitespace-nowrap w-24">Available from:</span>
                                <div className="flex-1">
                                  <input
                                    type="date"
                                    value={cat.availableFromDate || ''}
                                    onChange={(e) => {
                                      const date = e.target.value;
                                      setTicketCategories((prev) =>
                                        prev.map((c) => (c.id === cat.id ? { ...c, availableFromDate: date } : c))
                                      );
                                    }}
                                    className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-[#F5F5DC] text-sm focus:outline-none focus:border-[#E5A823] [color-scheme:dark]"
                                  />
                                </div>
                                <div className="w-28">
                                  <input
                                    type="time"
                                    value={cat.availableFromTime || ''}
                                    onChange={(e) => {
                                      const time = e.target.value;
                                      setTicketCategories((prev) =>
                                        prev.map((c) => (c.id === cat.id ? { ...c, availableFromTime: time } : c))
                                      );
                                    }}
                                    className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-[#F5F5DC] text-sm focus:outline-none focus:border-[#E5A823] [color-scheme:dark]"
                                  />
                                </div>
                              </div>
                              {/* Available until */}
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-[#F5F5DC]/50 whitespace-nowrap w-24">Available until:</span>
                                <div className="flex-1">
                                  <input
                                    type="date"
                                    value={cat.availableUntilDate || ''}
                                    onChange={(e) => {
                                      const date = e.target.value;
                                      setTicketCategories((prev) =>
                                        prev.map((c) => (c.id === cat.id ? { ...c, availableUntilDate: date } : c))
                                      );
                                    }}
                                    className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-[#F5F5DC] text-sm focus:outline-none focus:border-[#E5A823] [color-scheme:dark]"
                                  />
                                </div>
                                <div className="w-28">
                                  <input
                                    type="time"
                                    value={cat.availableUntilTime || ''}
                                    onChange={(e) => {
                                      const time = e.target.value;
                                      setTicketCategories((prev) =>
                                        prev.map((c) => (c.id === cat.id ? { ...c, availableUntilTime: time } : c))
                                      );
                                    }}
                                    className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-[#F5F5DC] text-sm focus:outline-none focus:border-[#E5A823] [color-scheme:dark]"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const id = Math.random().toString(36).slice(2);
                            setTicketCategories((prev) => [...prev, { id, name: 'NEW', price: 0 }]);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm hover:border-[#E5A823]"
                        >
                          <Plus className="w-4 h-4 text-[#E5A823]" />
                          Add category
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Number of Tickets *</label>
                      <div className="relative">
                        <Ticket className="absolute left-4 top-3.5 w-4 h-4 text-[#F5F5DC]/50" />
                        <input
                          type="number"
                          name="numberOfTickets"
                          value={formData.numberOfTickets}
                          onChange={handleInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                          placeholder="e.g. 100"
                          min={1}
                          required
                        />
                      </div>
                      <p className="text-xs text-[#F5F5DC]/50 mt-2">Total number of tickets available for this event</p>
                    </div>

                    <div className="md:col-span-2">
                      <div className="bg-[#0F0F0F] rounded-2xl p-6 border border-[#2A2A2A]">
                        <h4 className="text-base font-bold text-[#F5F5DC] mb-1">Per-ticket Money Flow</h4>
                        <p className="text-xs text-[#F5F5DC]/50 mb-6">Preview the split for one ticket</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-5">
                            <div>
                              <label className="block text-xs font-medium mb-2 text-[#F5F5DC]/70">Preview category</label>
                              <select
                                value={previewCategoryId}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  setPreviewCategoryId(id);
                                  const cat = ticketCategories.find((c) => c.id === id);
                                  if (cat) setPricing((p) => ({ ...p, ticket: cat.price }));
                                }}
                                className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                              >
                                {ticketCategories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-2 text-[#F5F5DC]/70">Ticket price (₹)</label>
                              <div className="relative">
                                <IndianRupee className="absolute left-4 top-3.5 w-4 h-4 text-[#F5F5DC]/50" />
                                <input
                                  type="number"
                                  value={pricing.ticket}
                                  onChange={(e) => {
                                    const v = Math.max(0, Number(e.target.value));
                                    setPricing((p) => ({ ...p, ticket: v }));
                                    setTicketCategories((prev) =>
                                      prev.map((c) => (c.id === previewCategoryId ? { ...c, price: v } : c))
                                    );
                                  }}
                                  className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                  placeholder="0"
                                  min={0}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="flex items-center justify-between text-xs font-medium mb-2 text-[#F5F5DC]/70">
                                <span>Platform fee (%)</span>
                                <span className="text-[#E5A823] font-bold">{pricing.platformFee.toFixed(1)}%</span>
                              </label>
                              <input
                                type="range"
                                min={0}
                                max={15}
                                step={0.5}
                                value={pricing.platformFee}
                                onChange={(e) => setPricing((p) => ({ ...p, platformFee: Number(e.target.value) }))}
                                className="w-full accent-[#E5A823]"
                              />
                            </div>
                            <div>
                              <label className="flex items-center justify-between text-xs font-medium mb-2 text-[#F5F5DC]/70">
                                <span>Artist revenue share (%)</span>
                                <span className="text-[#E5A823] font-bold">{pricing.artistShare.toFixed(1)}%</span>
                              </label>
                              <input
                                type="range"
                                min={0}
                                max={50}
                                step={0.5}
                                value={pricing.artistShare}
                                onChange={(e) => setPricing((p) => ({ ...p, artistShare: Number(e.target.value) }))}
                                className="w-full accent-[#E5A823]"
                              />
                            </div>
                            <div>
                              <label className="flex items-center justify-between text-xs font-medium mb-2 text-[#F5F5DC]/70">
                                <span>Customer discount (%)</span>
                                <span className="text-[#E5A823] font-bold">{pricing.discount.toFixed(1)}%</span>
                              </label>
                              <input
                                type="range"
                                min={0}
                                max={50}
                                step={0.5}
                                value={pricing.discount}
                                onChange={(e) => setPricing((p) => ({ ...p, discount: Number(e.target.value) }))}
                                className="w-full accent-[#E5A823]"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            {(() => {
                              const gross = pricing.ticket || 0;
                              const discountAmt = gross * (pricing.discount / 100);
                              const customerPays = Math.max(gross - discountAmt, 0);
                              const pgFee = customerPays * 0.03 + (customerPays > 0 ? 3 : 0);
                              const platformFeeAmt = customerPays * (pricing.platformFee / 100);
                              const artistAmt = gross * (pricing.artistShare / 100);
                              const outletNet = Math.max(customerPays - pgFee - platformFeeAmt - artistAmt, 0);
                              const fmt = (n: number) => `₹${n.toFixed(0)}`;
                              const totalBar = Math.max(customerPays, 1);
                              const w = (n: number) => `${Math.max(0, Math.min(100, (n / totalBar) * 100))}%`;
                              return (
                                <>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                                      <div className="text-xs text-[#F5F5DC]/50">Customer</div>
                                      <div className="text-2xl font-black text-[#F5F5DC] mt-1">{fmt(customerPays)}</div>
                                      <div className="text-[10px] text-[#F5F5DC]/40 mt-1">full price</div>
                                    </div>
                                    <div className="rounded-xl border border-[#3E83B6]/50 bg-[#3E83B6]/10 p-4">
                                      <div className="text-xs text-[#3E83B6]">Outlet</div>
                                      <div className="text-2xl font-black text-[#3E83B6] mt-1">{fmt(outletNet)}</div>
                                      <div className="text-[10px] text-[#3E83B6]/70 mt-1">bears artist share</div>
                                    </div>
                                    <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                                      <div className="text-xs text-[#F5F5DC]/50">Artist</div>
                                      <div className="text-xl font-black text-[#F5F5DC] mt-1">{fmt(artistAmt)}</div>
                                      <div className="text-[10px] text-[#F5F5DC]/40 mt-1">no code used</div>
                                    </div>
                                    <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                                      <div className="text-xs text-[#F5F5DC]/50">Razorpay</div>
                                      <div className="text-xl font-black text-[#F5F5DC] mt-1">{fmt(pgFee)}</div>
                                      <div className="text-[10px] text-[#F5F5DC]/40 mt-1">3% + ₹3 txn</div>
                                    </div>
                                    <div className="col-span-2 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                                      <div className="flex items-center justify-between text-xs text-[#F5F5DC]/50">
                                        <span>Platform</span>
                                        <span className="text-[#F5F5DC] font-semibold">{fmt(platformFeeAmt)}</span>
                                      </div>
                                      <div className="mt-2 h-1.5 rounded bg-[#2A2A2A] overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-[#E5A823] to-[#EB4D4B]" style={{ width: w(platformFeeAmt) }} />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-4 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-[#F5F5DC]/60">Customer pays</span>
                                      <span className="text-[#F5F5DC] font-semibold">{fmt(customerPays)}</span>
                                    </div>
                                    <div className="h-2 rounded bg-[#2A2A2A] overflow-hidden">
                                      <div className="h-full bg-[#E5A823]" style={{ width: w(customerPays) }} />
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-2">
                                      <span className="text-[#F5F5DC]/60">Razorpay</span>
                                      <span className="text-[#F5F5DC] font-semibold">-{fmt(pgFee)}</span>
                                    </div>
                                    <div className="h-2 rounded bg-[#2A2A2A] overflow-hidden">
                                      <div className="h-full bg-[#EB4D4B]" style={{ width: w(pgFee) }} />
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-2">
                                      <span className="text-[#F5F5DC]/60">Platform fee</span>
                                      <span className="text-[#F5F5DC] font-semibold">-{fmt(platformFeeAmt)}</span>
                                    </div>
                                    <div className="h-2 rounded bg-[#2A2A2A] overflow-hidden">
                                      <div className="h-full bg-[#7C6F3E]" style={{ width: w(platformFeeAmt) }} />
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-2">
                                      <span className="text-[#F5F5DC]/60">Outlet net</span>
                                      <span className="text-[#F5F5DC] font-semibold">{fmt(outletNet)}</span>
                                    </div>
                                    <div className="h-2 rounded bg-[#2A2A2A] overflow-hidden">
                                      <div className="h-full bg-[#3E83B6]" style={{ width: w(outletNet) }} />
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-3">Short Description *</label>
                      <input
                        type="text"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        placeholder="A brief tagline or summary"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Time & Location Section */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#E5A823]" />
                    Time & Location
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-3">Event Date *</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-[#F5F5DC]/50" />
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] [color-scheme:dark]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Start Time *</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-3.5 w-4 h-4 text-[#F5F5DC]/50" />
                        <input
                          type="time"
                          name="startTime"
                          value={formData.startTime}
                          onChange={handleInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] [color-scheme:dark]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">End Time</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-3.5 w-4 h-4 text-[#F5F5DC]/50" />
                        <input
                          type="time"
                          name="endTime"
                          value={formData.endTime}
                          onChange={handleInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-3">Location / Venue *</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-[#F5F5DC]/50" />
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                          placeholder="Full address or venue name"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details & Rules Section */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#E5A823]" />
                    Details & Rules
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-3">About the Event *</label>
                      <textarea
                        name="about"
                        value={formData.about}
                        onChange={handleInputChange}
                        rows={5}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] resize-y"
                        placeholder="Provide a detailed description of what attendees can expect..."
                        required
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-3">
                        <AlertCircle className="w-4 h-4 text-[#E5A823]" />
                        Event Rules & Guidelines *
                      </label>
                      <div className="space-y-3">
                        {rules.map((rule, idx) => (
                          <div key={rule.id} className="flex items-center gap-3">
                            <span className="text-[#E5A823] font-bold w-6">{idx + 1}.</span>
                            <input
                              type="text"
                              value={rule.text}
                              onChange={(e) => {
                                const text = e.target.value;
                                setRules((prev) =>
                                  prev.map((r) => (r.id === rule.id ? { ...r, text } : r))
                                );
                              }}
                              className="flex-1 bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                              placeholder={`Rule ${idx + 1}`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setRules((prev) => prev.filter((r) => r.id !== rule.id));
                              }}
                              disabled={rules.length <= 1}
                              className="p-2 rounded-lg border border-[#2A2A2A] hover:border-[#EB4D4B] hover:bg-[#EB4D4B]/10 disabled:opacity-40"
                            >
                              <Trash2 className="w-4 h-4 text-[#F5F5DC]/70" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const id = Math.random().toString(36).slice(2);
                            setRules((prev) => [...prev, { id, text: '' }]);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm hover:border-[#E5A823]"
                        >
                          <Plus className="w-4 h-4 text-[#E5A823]" />
                          Add Rule
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Media Tab */}
            {activeTab === 'media' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Cover Image Section */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#E5A823]" />
                    Cover Image
                  </h3>
                  <p className="text-sm text-[#F5F5DC]/60 mb-6">
                    This image will be displayed as the main event cover. Recommended size: 1200x630px
                  </p>
                  
                  <div>
                    <div 
                      onClick={() => document.getElementById('cover-image-upload')?.click()}
                      className="mt-2 flex justify-center px-6 pt-10 pb-10 border-2 border-dashed border-[#E5A823]/50 rounded-2xl hover:border-[#E5A823] hover:bg-[#E5A823]/5 transition-all cursor-pointer"
                    >
                      <div className="space-y-3 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-[#E5A823]/10 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-[#E5A823]" />
                        </div>
                        <div className="flex flex-col text-sm text-[#F5F5DC]/50 justify-center gap-1">
                          <span className="font-medium text-[#E5A823] hover:text-[#F5C542]">Click to upload cover image</span>
                          <span>or drag and drop</span>
                        </div>
                        <p className="text-xs text-[#F5F5DC]/30">High-res PNG, JPG up to 10MB</p>
                      </div>
                      <input 
                        id="cover-image-upload"
                        type="file" 
                        accept="image/*"
                        onChange={handleCoverImageChange}
                        className="hidden" 
                      />
                    </div>
                    
                    {coverImage && (
                      <div className="mt-6">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E5A823]/30">
                          <img 
                            src={URL.createObjectURL(coverImage)} 
                            alt="Cover Preview" 
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() => setCoverImage(null)}
                            className="absolute top-2 right-2 p-2 bg-[#0D0D0D]/80 rounded-full hover:bg-[#EB4D4B]/80 transition-colors"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0D0D0D] to-transparent p-4">
                            <span className="text-sm font-medium text-[#E5A823]">Cover Image</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Images & Videos Section */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#E5A823]" />
                    Event Images & Videos
                  </h3>
                  <p className="text-sm text-[#F5F5DC]/60 mb-6">
                    Upload additional images and videos to showcase your event
                  </p>
                  
                  <div>
                    <div 
                      onClick={() => document.getElementById('media-files-upload')?.click()}
                      className="mt-2 flex justify-center px-6 pt-10 pb-10 border-2 border-dashed border-[#2A2A2A] rounded-2xl hover:border-[#E5A823]/50 hover:bg-[#2A2A2A]/50 transition-all cursor-pointer"
                    >
                      <div className="space-y-3 text-center">
                        <div className="flex items-center justify-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-[#E5A823]" />
                          </div>
                          <div className="w-12 h-12 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                            <Video className="h-5 w-5 text-[#E5A823]" />
                          </div>
                        </div>
                        <div className="flex flex-col text-sm text-[#F5F5DC]/50 justify-center gap-1">
                          <span className="font-medium text-[#E5A823] hover:text-[#F5C542]">Click to upload images or videos</span>
                          <span>or drag and drop</span>
                        </div>
                        <p className="text-xs text-[#F5F5DC]/30">PNG, JPG, MP4, MOV up to 50MB each</p>
                      </div>
                      <input 
                        id="media-files-upload"
                        type="file" 
                        multiple 
                        accept="image/*,video/*"
                        onChange={handleMediaFilesChange}
                        className="hidden" 
                      />
                    </div>
                    
                    {mediaFiles.length > 0 && (
                      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {mediaFiles.map((file, index) => (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={index} 
                            className="relative aspect-square rounded-xl overflow-hidden border border-[#2A2A2A] group"
                          >
                            {file.type.startsWith('video/') ? (
                              <div className="w-full h-full bg-[#0D0D0D] flex items-center justify-center">
                                <video className="w-full h-full object-cover">
                                  <source src={URL.createObjectURL(file)} type={file.type} />
                                </video>
                                <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]/50">
                                  <Video className="w-8 h-8 text-[#E5A823]" />
                                </div>
                              </div>
                            ) : (
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={`Media ${index}`} 
                                className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => removeMediaFile(index)}
                              className="absolute top-2 right-2 p-1.5 bg-[#0D0D0D]/80 rounded-full opacity-0 group-hover:opacity-100 hover:bg-[#EB4D4B]/80 transition-all"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Promo Codes Tab */}
            {activeTab === 'promo' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-[#E5A823]" />
                    Submit Event Request
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-3">Promo Code (Optional)</label>
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          name="promoCode"
                          value={promoForm.promoCode}
                          onChange={handlePromoInputChange}
                          className="flex-1 bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] uppercase tracking-wider"
                          placeholder="e.g. SELLER2024"
                        />
                        <button 
                          type="button"
                          onClick={generateUniqueCode}
                          className="px-4 py-3 bg-[#2A2A2A] border border-[#E5A823]/30 text-[#E5A823] rounded-lg font-medium hover:bg-[#E5A823]/10 transition-colors"
                        >
                          Generate
                        </button>
                      </div>
                      <p className="text-xs text-[#F5F5DC]/50 mt-2">Optional: Add a promo code for this event</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Discount Percentage (Optional)</label>
                      <input 
                        type="number" 
                        name="discountPercent"
                        value={promoForm.discountPercent}
                        onChange={handlePromoInputChange}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        placeholder="e.g. 15"
                        min="1"
                        max="100"
                      />
                    </div>

                    <div className="rounded-xl border border-[#E5A823]/20 bg-[#E5A823]/10 p-4">
                      <p className="text-sm text-[#F5F5DC]/80">
                        <strong className="text-[#E5A823]">Review your event:</strong> Make sure all details are correct in the Basic Details and Media tabs before submitting.
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      onClick={handleSendEventRequest}
                      disabled={isSubmitting}
                      whileHover={isSubmitting ? {} : { scale: 1.02 }}
                      whileTap={isSubmitting ? {} : { scale: 0.98 }}
                      className="w-full py-4 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                      {isSubmitting && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 2, ease: "easeInOut" }}
                          className="absolute inset-0 bg-[#0D0D0D]/20"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Send Request
                          </>
                        )}
                      </span>
                    </motion.button>
                  </div>
                </div>

                {promoRequests.length > 0 && (
                  <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                    <h3 className="text-lg font-bold mb-4">Your Promo Code Requests</h3>
                    <div className="space-y-3">
                      {promoRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-4 bg-[#2A2A2A] rounded-lg">
                          <div>
                            <p className="font-medium">{request.eventTitle}</p>
                            <p className="text-sm text-[#E5A823] font-mono">{request.code}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            request.status === 'Pending' 
                              ? 'bg-yellow-500/20 text-yellow-500' 
                              : 'bg-green-500/20 text-green-500'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-sm font-medium text-[#F5F5DC]/60 mb-4">Event Preview</h3>
                
                <div className="space-y-4">
                  <div className="aspect-video rounded-xl bg-[#2A2A2A] flex items-center justify-center">
                    {coverImage ? (
                      <img 
                        src={URL.createObjectURL(coverImage)} 
                        alt="Event Cover" 
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : mediaFiles.length > 0 && mediaFiles[0].type.startsWith('image/') ? (
                      <img 
                        src={URL.createObjectURL(mediaFiles[0])} 
                        alt="Event" 
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-[#F5F5DC]/30" />
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-[#F5F5DC]">
                      {formData.title || 'Event Title'}
                    </h4>
                    <p className="text-sm text-[#F5F5DC]/60">
                      {formData.location || 'Location'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#2A2A2A] space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#F5F5DC]/60">Price</span>
                      <span className="font-medium text-[#E5A823]">
                        ₹{previewPriceValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#F5F5DC]/60">Organizer</span>
                      <span className="font-medium text-[#F5F5DC]">
                        {formData.organizer || 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#F5F5DC]/60">Date</span>
                      <span className="font-medium text-[#F5F5DC]">
                        {formData.datetime ? new Date(formData.datetime).toLocaleDateString() : 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#E5A823]/10 border border-[#E5A823]/20 rounded-xl">
                <p className="text-sm text-[#E5A823]">
                  Complete all sections, then go to the Promo Codes tab and click "Send Request" to submit your event for admin approval.
                </p>
              </div>

              {/* Bottom Navigation */}
              <div className="flex justify-end pt-4 border-t border-[#2A2A2A]">
                {activeTab === 'details' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('media')}
                    className="px-8 py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    Next: Event Media
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                {activeTab === 'media' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('promo')}
                    className="px-8 py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    Next: Promo Codes
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                {activeTab === 'promo' && null}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
