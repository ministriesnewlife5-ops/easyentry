'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, Camera, MapPin, Globe, 
  Building2, Edit2, CheckCircle2,
  Instagram, Phone, Mail,
  Users, Loader2, CalendarDays, Clock3, IndianRupee, ExternalLink,
  Plus, LayoutDashboard, TrendingUp, DollarSign, Ticket, Eye, X,
  FileText, FileCheck
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DragDropUpload from '@/components/ui/DragDropUpload';

type ActiveTab = 'dashboard' | 'details' | 'about' | 'contacts' | 'documents' | 'events';

type OutletEventItem = {
  requestId: string;
  publicEventId?: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  category: string;
  price: string;
  image: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  lifecycle: 'waiting_approval' | 'upcoming' | 'completed';
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
  isPublished: boolean;
  publicEventUrl?: string;
};

type OutletEventsResponse = {
  upcomingEvents: OutletEventItem[];
  completedEvents: OutletEventItem[];
  waitingApprovalEvents: OutletEventItem[];
};

function OutletProfileContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [eventsData, setEventsData] = useState<OutletEventsResponse>({
    upcomingEvents: [],
    completedEvents: [],
    waitingApprovalEvents: [],
  });
  
  const [venueImages, setVenueImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    venueName: '',
    venueType: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    capacity: '',
    website: '',
    instagram: '',
    twitter: '',
    facebook: '',
    firstPointContact: { name: '', email: '', phone: '' },
    fnbManagerContact: { name: '', email: '', phone: '' },
    financeContact: { name: '', email: '', phone: '' },
    gstNumber: '',
    gstCertificate: '',
    panCard: '',
    panCardDocument: '',
    termsAccepted: '',
  });

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (requestedTab === 'events') {
      setActiveTab('events');
      return;
    }

    if (requestedTab === 'about') {
      setActiveTab('about');
      return;
    }

    if (requestedTab === 'contacts') {
      setActiveTab('contacts');
      return;
    }

    if (requestedTab === 'documents') {
      setActiveTab('documents');
      return;
    }

    setActiveTab('details');
  }, [searchParams]);

  const fetchVenueProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/venue/profile');
      const data = await response.json();
      
      if (data.venue) {
        setFormData({
          venueName: data.venue.venueName || '',
          venueType: data.venue.venueType || '',
          email: data.venue.email || '',
          phone: data.venue.phone || '',
          location: data.venue.location || '',
          bio: data.venue.bio || '',
          capacity: data.venue.capacity || '',
          website: data.venue.website || '',
          instagram: data.venue.instagram || '',
          twitter: data.venue.twitter || '',
          facebook: data.venue.facebook || '',
          firstPointContact: data.venue.firstPointContact || { name: '', email: '', phone: '' },
          fnbManagerContact: data.venue.fnbManagerContact || { name: '', email: '', phone: '' },
          financeContact: data.venue.financeContact || { name: '', email: '', phone: '' },
          gstNumber: data.venue.gstNumber || '',
          gstCertificate: data.venue.gstCertificate || '',
          panCard: data.venue.panCard || '',
          panCardDocument: data.venue.panCardDocument || '',
          termsAccepted: data.venue.termsAccepted || '',
        });
        setProfileImage(data.venue.imageUrl);
        setCoverImage(data.venue.coverImage);
        setVenueImages(data.venue.venueImages || []);
      } else {
        // Pre-fill email from session
        setFormData(prev => ({
          ...prev,
          email: session?.user?.email || '',
        }));
      }
    } catch (error) {
      console.error('Failed to fetch venue profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email]);

  const fetchOutletEvents = useCallback(async () => {
    try {
      setIsEventsLoading(true);
      const response = await fetch('/api/outlet/events', {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch outlet events');
      }

      setEventsData({
        upcomingEvents: data.upcomingEvents || [],
        completedEvents: data.completedEvents || [],
        waitingApprovalEvents: data.waitingApprovalEvents || [],
      });
    } catch (error) {
      console.error('Failed to fetch outlet events:', error);
    } finally {
      setIsEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchVenueProfile();
      fetchOutletEvents();
    }
  }, [status, session, fetchVenueProfile, fetchOutletEvents]);

  // Compress image to a max width/height and quality before storing as base64
  // This keeps images well under 300KB so Supabase doesn't reject the payload
  const compressImage = (file: File, maxWidth: number, maxHeight: number, quality = 0.75): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Scale down proportionally
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas not supported'));
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleProfileImageUpload = async (file: File) => {
    try {
      const compressed = await compressImage(file, 400, 400, 0.8);
      setProfileImage(compressed);
    } catch {
      // Fallback to uncompressed if canvas fails
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverImageUpload = async (file: File) => {
    try {
      const compressed = await compressImage(file, 1200, 400, 0.8);
      setCoverImage(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setCoverImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryImageUpload = async (file: File) => {
    try {
      const compressed = await compressImage(file, 800, 600, 0.75);
      setVenueImages(prev => [...prev, compressed]);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setVenueImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveVenueImage = (index: number) => {
    setVenueImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleContactChange = (contactType: 'firstPointContact' | 'fnbManagerContact' | 'financeContact', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [contactType]: {
        ...prev[contactType],
        [field]: value,
      },
    }));
  };

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    const fields = [
      // Basic Details (4 fields)
      formData.venueName,
      formData.venueType,
      formData.capacity,
      formData.location,
      // Images (3 fields)
      profileImage,
      coverImage,
      venueImages.length > 0,
      // About & Social (4 fields)
      formData.email,
      formData.phone,
      formData.bio,
      formData.instagram || formData.website,
      // Contacts (9 fields - 3 per contact)
      formData.firstPointContact.name,
      formData.firstPointContact.email,
      formData.firstPointContact.phone,
      formData.fnbManagerContact.name,
      formData.fnbManagerContact.email,
      formData.fnbManagerContact.phone,
      formData.financeContact.name,
      formData.financeContact.email,
      formData.financeContact.phone,
      // Documents (2 fields)
      formData.gstNumber,
      formData.panCard,
      formData.termsAccepted,
    ];
    
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const completionPercentage = calculateCompletion();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const venueData = {
        ...formData,
        imageUrl: profileImage,
        coverImage: coverImage,
        venueImages: venueImages,
      };

      const response = await fetch('/api/venue/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(venueData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile saved successfully! Your venue is now visible on the venues page.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save profile' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5A823]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      <div className="bg-[#0D0D0D] border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[#E5A823]">Outlet Profile</h1>
            <span className="text-[#F5F5DC]/50">|</span>
            <span className="text-[#F5F5DC]/70">Manage your venue details</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/seller-form"
              className="px-6 py-2 border-2 border-[#E5A823] text-[#E5A823] font-bold rounded-lg flex items-center gap-2 hover:bg-[#E5A823]/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Host Event
            </Link>
          </div>
        </div>
        
        {/* Profile Completion Status Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-[#F5F5DC]">Profile Completion</span>
                <span className={`text-sm font-bold ${
                  completionPercentage === 100 
                    ? 'text-emerald-400' 
                    : completionPercentage >= 70 
                      ? 'text-[#E5A823]' 
                      : 'text-orange-400'
                }`}>
                  {completionPercentage}%
                </span>
              </div>
              <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    completionPercentage === 100 
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                      : 'bg-gradient-to-r from-[#E5A823] to-[#F5C542]'
                  }`}
                />
              </div>
            </div>
            {completionPercentage === 100 && (
              <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Complete
              </div>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'details', label: 'Basic Details', icon: Edit2 },
              { id: 'about', label: 'About & Social', icon: Building2 },
              { id: 'contacts', label: 'Contacts', icon: Phone },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'events', label: 'Events', icon: CalendarDays },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#E5A823] text-[#E5A823]'
                    : 'border-transparent text-[#F5F5DC]/60 hover:text-[#F5F5DC]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {activeTab === 'details' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#E5A823]" />
                  Venue Images
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Logo</label>
                    <p className="text-xs text-[#EB4D4B] mb-2">Recommended: 400x400px (1:1 ratio)</p>
                    <DragDropUpload
                      type="image"
                      maxSize={5}
                      preview={profileImage}
                      onClear={() => setProfileImage(null)}
                      onFileSelect={handleProfileImageUpload}
                      className="w-40 h-40 rounded-2xl"
                      label="Drop venue logo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Venue Image</label>
                    <p className="text-xs text-[#EB4D4B] mb-2">Recommended: 1200x400px (3:1 ratio)</p>
                    <DragDropUpload
                      type="image"
                      maxSize={10}
                      preview={coverImage}
                      onClear={() => setCoverImage(null)}
                      onFileSelect={handleCoverImageUpload}
                      className="w-full h-40 rounded-xl"
                      label="Drop venue cover"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#E5A823]" />
                  Venue Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Venue Name *</label>
                    <input type="text" name="venueName" value={formData.venueName} onChange={handleInputChange} required className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Pasha - The Park" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Venue Type *</label>
                    <input type="text" name="venueType" value={formData.venueType} onChange={handleInputChange} required className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Nightclub" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#E5A823]" /> Capacity *
                    </label>
                    <input type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} required min="1" max="10000" className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. 500" />
                    <p className="text-xs text-[#F5F5DC]/40 mt-1">Maximum number of people your venue can hold</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Location *</label>
                    <input type="text" name="location" value={formData.location} onChange={handleInputChange} required className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Chennai, Tamil Nadu" />
                  </div>
                </div>

                {/* Venue Gallery Images */}
                <div className="mt-8 pt-6 border-t border-[#2A2A2A]">
                  <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#E5A823]" />
                    Venue Gallery Images
                  </h4>
                  <p className="text-xs text-[#F5F5DC]/50 mb-4">Showcase your venue with additional photos (interior, exterior, seating, etc.)</p>
                  
                  {venueImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                      {venueImages.map((img, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-[#2A2A2A] group">
                          <Image src={img} alt={`Venue image ${index + 1}`} fill className="object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveVenueImage(index)}
                            className="absolute top-2 right-2 p-1 bg-[#EB4D4B] text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <DragDropUpload
                    type="image"
                    maxSize={10}
                    onFileSelect={handleGalleryImageUpload}
                    className="w-40 h-40 rounded-xl"
                    label="Drop gallery photo"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Venue Contact Info */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#E5A823]" />
                  Venue Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#E5A823]" /> Company Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="company@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#E5A823]" /> Venue Contact Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4">Bio / Description</h3>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                  placeholder="Tell us about your venue, the kind of events you host..."
                />
              </div>

              {/* Social & Website */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#E5A823]" />
                  Social & Website
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#E5A823]" /> Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-[#E5A823]" /> Instagram
                    </label>
                    <input
                      type="text"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleInputChange}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="@username or full URL"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'contacts' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* First Point Contact */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#E5A823]" />
                  First Point Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.firstPointContact.name}
                      onChange={(e) => handleContactChange('firstPointContact', 'name', e.target.value)}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="Contact person name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#E5A823]" /> Email
                    </label>
                    <input
                      type="email"
                      value={formData.firstPointContact.email}
                      onChange={(e) => handleContactChange('firstPointContact', 'email', e.target.value)}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#E5A823]" /> Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.firstPointContact.phone}
                      onChange={(e) => handleContactChange('firstPointContact', 'phone', e.target.value)}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>

              {/* F&B Manager Contact */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#E5A823]" />
                  F&B Manager Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.fnbManagerContact.name}
                      onChange={(e) => handleContactChange('fnbManagerContact', 'name', e.target.value)}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="F&B Manager name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#E5A823]" /> Email
                    </label>
                    <input
                      type="email"
                      value={formData.fnbManagerContact.email}
                      onChange={(e) => handleContactChange('fnbManagerContact', 'email', e.target.value)}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="fnb@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#E5A823]" /> Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.fnbManagerContact.phone}
                      onChange={(e) => handleContactChange('fnbManagerContact', 'phone', e.target.value)}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>

              {/* Finance Person Contact */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#E5A823]" />
                  Finance Person Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.financeContact.name}
                      onChange={(e) => handleContactChange('financeContact', 'name', e.target.value)}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="Finance person name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#E5A823]" /> Email
                    </label>
                    <input
                      type="email"
                      value={formData.financeContact.email}
                      onChange={(e) => handleContactChange('financeContact', 'email', e.target.value)}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="finance@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#E5A823]" /> Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.financeContact.phone}
                      onChange={(e) => handleContactChange('financeContact', 'phone', e.target.value)}
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'documents' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* GST Details */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#E5A823]" />
                  GST Details
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-2">GST Number</label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                    className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                    placeholder="22AAAAA0000A1Z5"
                  />
                  <p className="text-xs text-[#F5F5DC]/40 mt-1">15 digit GST identification number</p>
                </div>
              </div>

              {/* PAN Card Details */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#E5A823]" />
                  PAN Card Details
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-2">PAN Card Number</label>
                  <input
                    type="text"
                    name="panCard"
                    value={formData.panCard}
                    onChange={handleInputChange}
                    className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                    placeholder="ABCDE1234F"
                  />
                  <p className="text-xs text-[#F5F5DC]/40 mt-1">10 character alphanumeric PAN number</p>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#E5A823]" />
                  Terms and Conditions
                </h3>
                <div className="space-y-4">
                  <p className="text-sm text-[#F5F5DC]/60">Enter your venue's terms and conditions that will be shown to customers when they book events.</p>
                  <textarea
                    name="termsAccepted"
                    value={formData.termsAccepted}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                    placeholder="Enter your terms and conditions here...&#10;&#10;Example:&#10;1. Booking must be confirmed at least 48 hours in advance.&#10;2. Cancellation policy: Full refund if cancelled 7 days before event.&#10;3. Venue capacity must not be exceeded.&#10;4. All guests must follow venue dress code."
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                  <p className="text-sm text-[#F5F5DC]/60">Upcoming Events</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-400">{eventsData.upcomingEvents.length}</p>
                </div>
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                  <p className="text-sm text-[#F5F5DC]/60">Waiting for Approval</p>
                  <p className="mt-2 text-3xl font-bold text-orange-400">{eventsData.waitingApprovalEvents.length}</p>
                </div>
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                  <p className="text-sm text-[#F5F5DC]/60">Completed Events</p>
                  <p className="mt-2 text-3xl font-bold text-[#E5A823]">{eventsData.completedEvents.length}</p>
                </div>
              </div>

              {isEventsLoading ? (
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#E5A823]" />
                  <span className="text-[#F5F5DC]/70">Loading your events...</span>
                </div>
              ) : (
                <>
                  <EventsSection
                    title="Waiting for Approval"
                    description="These requests are sent by you and are still waiting for admin action."
                    events={eventsData.waitingApprovalEvents}
                  />
                  <EventsSection
                    title="Upcoming Events"
                    description="These events are approved and scheduled for today or later."
                    events={eventsData.upcomingEvents}
                  />
                  <EventsSection
                    title="Completed Events"
                    description="These approved events already happened."
                    events={eventsData.completedEvents}
                  />
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="flex justify-end pt-6 border-t border-[#2A2A2A]">
          {activeTab === 'details' && (
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className="px-8 py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              Next: About & Social
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {activeTab === 'about' && (
            <button
              type="button"
              onClick={() => setActiveTab('contacts')}
              className="px-8 py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              Next: Contacts
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {activeTab === 'contacts' && (
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className="px-8 py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              Next: Documents
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {activeTab === 'documents' && (
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-400 text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Save Profile
                </>
              )}
            </button>
          )}
          {activeTab === 'events' && null}
        </div>
      </form>
    </div>
  );
}

function EventsSection({
  title,
  description,
  events,
}: {
  title: string;
  description: string;
  events: OutletEventItem[];
}) {
  return (
    <section className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#F5F5DC]">{title}</h3>
          <p className="mt-1 text-sm text-[#F5F5DC]/55">{description}</p>
        </div>
        <span className="rounded-full border border-[#2A2A2A] bg-[#101018] px-3 py-1 text-xs text-[#F5F5DC]/60">
          {events.length} event{events.length === 1 ? '' : 's'}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#2A2A2A] bg-[#101018] px-4 py-8 text-center text-sm text-[#F5F5DC]/50">
          No events in this section yet.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {events.map((event) => (
            <article key={`${title}-${event.requestId}`} className="rounded-xl border border-[#2A2A2A] bg-[#101018] overflow-hidden">
              <div className="grid gap-5 p-5 lg:grid-cols-[140px_1fr]">
                <div className="relative h-36 overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#2A2A2A]">
                  {event.image ? (
                    <Image src={event.image} alt={event.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#F5F5DC]/40">
                      No image
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xl font-semibold text-[#F5F5DC]">{event.title}</h4>
                        <StatusBadge status={event.status} />
                      </div>
                      <p className="mt-1 text-sm text-[#F5F5DC]/60">{event.subtitle}</p>
                    </div>

                    {event.publicEventUrl && (
                      <Link
                        href={event.publicEventUrl}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E5A823]/40 bg-[#E5A823]/10 px-3 py-2 text-sm font-medium text-[#E5A823] hover:bg-[#E5A823]/20"
                      >
                        View live event
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InfoItem icon={<CalendarDays className="w-4 h-4 text-[#E5A823]" />} label="Date" value={event.date} />
                    <InfoItem icon={<Clock3 className="w-4 h-4 text-[#E5A823]" />} label="Time" value={event.time} />
                    <InfoItem icon={<MapPin className="w-4 h-4 text-[#E5A823]" />} label="Venue" value={event.venue} />
                    <InfoItem icon={<IndianRupee className="w-4 h-4 text-[#E5A823]" />} label="Price" value={event.price} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <MetaItem label="Category" value={event.category} />
                    <MetaItem label="Submitted" value={new Date(event.submittedAt).toLocaleString()} />
                    <MetaItem label="Reviewed By" value={event.reviewedBy || 'Pending'} />
                    <MetaItem label="Reviewed At" value={event.reviewedAt ? new Date(event.reviewedAt).toLocaleString() : 'Pending'} />
                  </div>

                  <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                    <p className="text-xs uppercase tracking-wide text-[#F5F5DC]/45">Description</p>
                    <p className="mt-2 text-sm leading-6 text-[#F5F5DC]/75">{event.description}</p>
                  </div>

                  {event.rejectionReason && (
                    <div className="rounded-xl border border-[#EB4D4B]/20 bg-[#EB4D4B]/10 p-4 text-sm text-[#FF8A87]">
                      {event.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: OutletEventItem['status'] }) {
  const styles = {
    pending: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    approved: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    rejected: 'bg-[#EB4D4B]/10 text-[#EB4D4B] border-[#EB4D4B]/20',
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#F5F5DC]/45">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm text-[#F5F5DC]/80">{value}</p>
    </div>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[#F5F5DC]/45">{label}</p>
      <p className="mt-1 text-sm text-[#F5F5DC]/80">{value}</p>
    </div>
  );
}

// Default export wrapped in Suspense for SSR compatibility
export default function OutletProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5A823]" />
      </div>
    }>
      <OutletProfileContent />
    </Suspense>
  );
}
