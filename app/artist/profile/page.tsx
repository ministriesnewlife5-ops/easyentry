'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, X, Plus, Camera, Star, MapPin, Languages, 
  Clock, Award, Music, Mic2, Trash2, Edit2, CheckCircle2,
  Video, Image as ImageIcon, ChevronRight
} from 'lucide-react';
import { Ticket } from 'lucide-react';
import Image from 'next/image';
import DragDropUpload from '@/components/ui/DragDropUpload';
import { uploadFileDirectToSupabase } from '@/lib/browser-storage';
import PromoCodeSection from '@/components/PromoCodeSection';

interface Award {
  id: string;
  title: string;
  year: string;
  description: string;
}

interface Preference {
  id: string;
  name: string;
  selected: boolean;
}

interface GlobalCouponRow {
  id: string;
  code: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  usage_count: number;
  created_at: string;
}

interface VideoThumbnail {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
}

export default function ArtistProfilePage() {
  const [activeTab, setActiveTab] = useState<'details' | 'media' | 'about' | 'promo'>('details');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoThumbnail[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [newAward, setNewAward] = useState({ title: '', year: '', description: '' });
  const [showAwardForm, setShowAwardForm] = useState(false);
  
  const [formData, setFormData] = useState({
    stageName: '',
    realName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    experience: '',
    hourlyRate: '',
    languages: [] as string[],
    genres: [] as string[],
    availability: 'Available',
    travelWillingness: 'Within City',
    category: '',
    otherCategory: '',
  });

  const [preferences, setPreferences] = useState<Preference[]>([
    { id: '1', name: 'Corporate Events', selected: false },
    { id: '2', name: 'Weddings', selected: false },
    { id: '3', name: 'Private Parties', selected: false },
    { id: '4', name: 'Club Shows', selected: false },
    { id: '5', name: 'Festivals', selected: false },
    { id: '6', name: 'Live Streaming', selected: false },
  ]);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [photoGallery, setPhotoGallery] = useState<string[]>([]);

  const handlePhotoUpload = async (file: File) => {
    try {
      const { url } = await uploadFileDirectToSupabase(file, 'artist-gallery');
      setPhotoGallery(prev => [...prev, url]);
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload photo' });
    }
  };

  const removePhoto = (index: number) => {
    setPhotoGallery(prev => prev.filter((_, i) => i !== index));
  };

  const handleProfileImageUpload = async (file: File) => {
    try {
      const { url } = await uploadFileDirectToSupabase(file, 'artist-profile');
      setProfileImage(url);
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload profile image' });
    }
  };

  const handleCoverImageUpload = async (file: File) => {
    try {
      const { url } = await uploadFileDirectToSupabase(file, 'artist-cover');
      setCoverImage(url);
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload cover image' });
    }
  };

  const handleVideoUploadFile = async (file: File) => {
    if (videos.length < 4) {
      try {
        const { url } = await uploadFileDirectToSupabase(file, 'artist-videos');
        const newVideo: VideoThumbnail = {
          id: Date.now().toString(),
          url,
          thumbnail: coverImage || profileImage || url,
          title: file.name,
        };
        setVideos([...videos, newVideo]);
      } catch {
        setMessage({ type: 'error', text: 'Failed to upload video' });
      }
    }
  };

  const removeVideo = (id: string) => {
    setVideos(videos.filter(v => v.id !== id));
  };

  const addAward = () => {
    if (newAward.title && newAward.year) {
      const award: Award = {
        id: Date.now().toString(),
        ...newAward,
      };
      setAwards([...awards, award]);
      setNewAward({ title: '', year: '', description: '' });
      setShowAwardForm(false);
    }
  };

  const removeAward = (id: string) => {
    setAwards(awards.filter(a => a.id !== id));
  };

  const togglePreference = (id: string) => {
    setPreferences(preferences.map(p => 
      p.id === id ? { ...p, selected: !p.selected } : p
    ));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [promoForm, setPromoForm] = useState({
    code: '',
    maxUses: '',
    isActive: true,
    startsAt: '',
    endsAt: '',
  });
  const [globalCoupons, setGlobalCoupons] = useState<GlobalCouponRow[]>([]);
  const [promoSummary, setPromoSummary] = useState<{
    totalShareAmount: number;
    totalBookedAmount: number;
    totalBookings: number;
  }>({
    totalShareAmount: 0,
    totalBookedAmount: 0,
    totalBookings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const couponStorageKey = 'global_coupon_artist';

  const readStoredCoupon = (): GlobalCouponRow[] => {
    if (typeof window === 'undefined') return [];

    try {
      const stored = window.localStorage.getItem(couponStorageKey);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as GlobalCouponRow;
      return parsed?.code ? [parsed] : [];
    } catch {
      return [];
    }
  };

  const saveStoredCoupon = (coupon: GlobalCouponRow) => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(couponStorageKey, JSON.stringify(coupon));
    } catch {
      // ignore storage failures
    }
  };

  const refreshGlobalCoupons = async () => {
    const response = await fetch('/api/global-coupons', { cache: 'no-store' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || 'Failed to load global coupons');
    }

    const couponData = await response.json();
    const coupons = Array.isArray(couponData?.coupons)
      ? couponData.coupons.map((coupon: GlobalCouponRow) => ({
          id: coupon.id,
          code: coupon.code,
          is_active: coupon.is_active,
          starts_at: coupon.starts_at,
          ends_at: coupon.ends_at,
          max_uses: coupon.max_uses,
          usage_count: coupon.usage_count,
          created_at: coupon.created_at,
        }))
      : [];

    setGlobalCoupons(coupons);
    if (coupons.length > 0) {
      const primary = coupons[0];
      setPromoForm((prev) => ({
        ...prev,
        code: primary.code,
        maxUses: primary.max_uses ? String(primary.max_uses) : '',
        isActive: primary.is_active,
        startsAt: primary.starts_at || '',
        endsAt: primary.ends_at || '',
      }));
      saveStoredCoupon(primary);
    }

    setPromoSummary({
      totalShareAmount: Number(couponData?.earnings?.totalShareAmount || 0),
      totalBookedAmount: Number(couponData?.earnings?.totalBookedAmount || 0),
      totalBookings: Number(couponData?.earnings?.totalBookings || 0),
    });
  };

  const clearStoredCoupon = () => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(couponStorageKey);
    } catch {
      // ignore storage failures
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [globalCouponsResponse, profileResponse] = await Promise.all([
          fetch('/api/global-coupons', { cache: 'no-store' }),
          fetch('/api/artist/profile', { cache: 'no-store' }),
        ]);

        if (globalCouponsResponse.ok) {
          try {
            await refreshGlobalCoupons();
          } catch {
            const fallbackCoupons = readStoredCoupon();
            if (fallbackCoupons.length > 0) {
              const primary = fallbackCoupons[0];
              setGlobalCoupons(fallbackCoupons);
              setPromoForm((prev) => ({
                ...prev,
                code: primary.code,
                maxUses: primary.max_uses ? String(primary.max_uses) : '',
                isActive: primary.is_active,
                startsAt: primary.starts_at || '',
                endsAt: primary.ends_at || '',
              }));
            }
          }
        } else {
          const fallbackCoupons = readStoredCoupon();
          if (fallbackCoupons.length > 0) {
            const primary = fallbackCoupons[0];
            setGlobalCoupons(fallbackCoupons);
            setPromoForm((prev) => ({
              ...prev,
              code: primary.code,
              maxUses: primary.max_uses ? String(primary.max_uses) : '',
              isActive: primary.is_active,
              startsAt: primary.starts_at || '',
              endsAt: primary.ends_at || '',
            }));
          }
        }

        if (profileResponse.ok) {
          const data = await profileResponse.json();
          const profile = data.profile;
          if (profile) {
            setFormData((prev) => ({
              ...prev,
              stageName: profile.stageName || '',
              realName: profile.realName || '',
              email: profile.email || '',
              phone: profile.phone || '',
              location: profile.location || '',
              bio: profile.bio || '',
              experience: profile.experience || '',
              hourlyRate: profile.hourlyRate || '',
              languages: Array.isArray(profile.languages) ? profile.languages : [],
              genres: Array.isArray(profile.genres) ? profile.genres : [],
              availability: profile.availability || 'Available',
              travelWillingness: profile.travelWillingness || 'Within City',
              category: profile.category || '',
              otherCategory: profile.otherCategory || '',
            }));
            setProfileImage(profile.profileImage || null);
            setCoverImage(profile.coverImage || null);
            setVideos(Array.isArray(profile.videos) ? profile.videos : []);
            setPhotoGallery(Array.isArray(profile.photoGallery) ? profile.photoGallery : []);
            setAwards(Array.isArray(profile.awards) ? profile.awards : []);
            if (Array.isArray(profile.preferences) && profile.preferences.length > 0) {
              setPreferences(profile.preferences);
            }
          }
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to load artist profile data' });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handlePromoInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;

    if (type === 'checkbox') {
      setPromoForm(prev => ({ ...prev, [name]: target.checked }));
      return;
    }

    setPromoForm(prev => ({ ...prev, [name]: value }));
  };

  const generateUniqueCode = () => {
    const prefix = 'ARTIST';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}${random}`;
    setPromoForm(prev => ({ ...prev, code: code }));
  };

  const handleSendPromoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.code) {
      setMessage({ type: 'error', text: 'Please enter coupon code' });
      return;
    }

    try {
      const response = await fetch('/api/global-coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoForm.code,
          maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : null,
          isActive: promoForm.isActive,
          startsAt: promoForm.startsAt || null,
          endsAt: promoForm.endsAt || null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to create global coupon');
      }

      await refreshGlobalCoupons();
      setPromoForm({ code: '', maxUses: '', isActive: true, startsAt: '', endsAt: '' });
      setMessage({
        type: 'success',
        text: 'Global coupon created successfully. Discount will be computed per event ticket settings.',
      });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to manage global coupon' });
    }
  };

  const handleMultiSelect = (field: 'languages' | 'genres', value: string) => {
    setFormData(prev => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/artist/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          profileImage,
          coverImage,
          videos,
          photoGallery,
          awards,
          preferences,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      setMessage({ type: 'success', text: 'Profile saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save profile' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      {/* Header */}
      <div className="bg-[#0D0D0D] border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[#E5A823]">Artist Profile</h1>
            <span className="text-[#F5F5DC]/50">|</span>
            <span className="text-[#F5F5DC]/70">Complete your profile to get booked</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </motion.button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {[
              { id: 'details', label: 'Basic Details', icon: Edit2 },
              { id: 'media', label: 'Photos & Videos', icon: Camera },
              { id: 'about', label: 'About & Awards', icon: Star },
              { id: 'promo', label: 'Promo Codes', icon: Ticket },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
        {message && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-[#EB4D4B]/30 bg-[#EB4D4B]/10 text-[#EB4D4B]'}`}>
            {message.text}
          </div>
        )}
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
                {/* Profile Images Section */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#E5A823]" />
                    Profile Images
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Profile Photo */}
                    <div>
                      <label className="block text-sm font-medium mb-3">Profile Photo</label>
                      <DragDropUpload
                        type="image"
                        maxSize={5}
                        preview={profileImage}
                        onClear={() => setProfileImage(null)}
                        onFileSelect={handleProfileImageUpload}
                        className="w-40 h-40 rounded-full"
                        label="Drop profile photo"
                      />
                    </div>

                    {/* Cover Photo */}
                    <div>
                      <label className="block text-sm font-medium mb-3">Cover Photo</label>
                      <DragDropUpload
                        type="image"
                        maxSize={10}
                        preview={coverImage}
                        onClear={() => setCoverImage(null)}
                        onFileSelect={handleCoverImageUpload}
                        className="w-full h-40 rounded-xl"
                        label="Drop cover photo"
                      />
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Mic2 className="w-5 h-5 text-[#E5A823]" />
                    Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Stage Name *</label>
                      <input
                        type="text"
                        name="stageName"
                        value={formData.stageName}
                        onChange={handleInputChange}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                        placeholder="Your stage name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Real Name</label>
                      <input
                        type="text"
                        name="realName"
                        value={formData.realName}
                        onChange={handleInputChange}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                        placeholder="Your real name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                        placeholder="+91 98765 43210"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#E5A823]" />
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                        placeholder="City, State"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Details */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#E5A823]" />
                    Professional Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Category *</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                      >
                        <option value="">Select category</option>
                        <option value="singer">Singer</option>
                        <option value="musician">Musician</option>
                        <option value="band">Band</option>
                        <option value="dj">DJ</option>
                        <option value="dancer">Dancer</option>
                        <option value="comedian">Comedian</option>
                        <option value="magician">Magician</option>
                        <option value="instrumentalist">Instrumentalist</option>
                        <option value="others">Others</option>
                      </select>
                    </div>
                    {formData.category === 'others' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Specify Category *</label>
                        <input
                          type="text"
                          name="otherCategory"
                          value={formData.otherCategory}
                          onChange={handleInputChange}
                          required={formData.category === 'others'}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                          placeholder="Enter your category"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-2">Hourly Rate (₹)</label>
                      <input
                        type="number"
                        name="hourlyRate"
                        value={formData.hourlyRate}
                        onChange={handleInputChange}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                        placeholder="e.g. 5000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#E5A823]" />
                        Availability
                      </label>
                      <select
                        name="availability"
                        value={formData.availability}
                        onChange={handleInputChange}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                      >
                        <option value="Available">Available</option>
                        <option value="Busy">Currently Busy</option>
                        <option value="Limited">Limited Availability</option>
                        <option value="Touring">On Tour</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Willing to Travel</label>
                      <select
                        name="travelWillingness"
                        value={formData.travelWillingness}
                        onChange={handleInputChange}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                      >
                        <option value="Within City">Within City Only</option>
                        <option value="Within State">Within State</option>
                        <option value="All India">All India</option>
                        <option value="International">International</option>
                      </select>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                      <Languages className="w-4 h-4 text-[#E5A823]" />
                      Languages
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['English', 'Hindi', 'Marathi', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Gujarati'].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleMultiSelect('languages', lang)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            formData.languages.includes(lang)
                              ? 'bg-[#E5A823] text-[#0D0D0D]'
                              : 'bg-[#2A2A2A] text-[#F5F5DC]/70 hover:bg-[#3A3A3A]'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Genres */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                      <Music className="w-4 h-4 text-[#E5A823]" />
                      Genres
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Bollywood', 'Hip Hop', 'EDM', 'Rock', 'Pop', 'Jazz', 'Classical', 'Folk', 'Sufi', 'Indie', 'Retro', 'Commercial'].map((genre) => (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => handleMultiSelect('genres', genre)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            formData.genres.includes(genre)
                              ? 'bg-[#E5A823] text-[#0D0D0D]'
                              : 'bg-[#2A2A2A] text-[#F5F5DC]/70 hover:bg-[#3A3A3A]'
                          }`}
                        >
                          {genre}
                        </button>
                      ))}
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
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Video className="w-5 h-5 text-[#E5A823]" />
                    Performance Videos ({videos.length}/4)
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {videos.map((video) => (
                      <div key={video.id} className="relative aspect-video rounded-xl overflow-hidden bg-[#2A2A2A] group">
                        <img src={video.thumbnail} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeVideo(video.id)}
                            className="p-2 bg-[#EB4D4B] rounded-full"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 text-xs text-white truncate">
                          {video.title}
                        </div>
                      </div>
                    ))}
                    
                    {videos.length < 4 && (
                      <DragDropUpload
                        type="video"
                        maxSize={50}
                        onFileSelect={handleVideoUploadFile}
                        className="aspect-video rounded-xl"
                        label="Drop video here"
                      />
                    )}
                  </div>
                  
                  <p className="mt-4 text-sm text-[#F5F5DC]/50">
                    Upload up to 4 performance videos (max 50MB each). Drag & drop or click to browse.
                  </p>
                </div>

                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#E5A823]" />
                    Photo Gallery ({photoGallery.length}/6)
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photoGallery.map((photo, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-[#2A2A2A] group">
                        <img src={photo} alt={`Photo ${index + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="p-2 bg-[#EB4D4B] rounded-full"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {photoGallery.length < 6 && (
                      <DragDropUpload
                        type="image"
                        maxSize={10}
                        onFileSelect={handlePhotoUpload}
                        className="aspect-square rounded-xl"
                        label="Drop photo here"
                      />
                    )}
                  </div>
                  
                  <p className="mt-4 text-sm text-[#F5F5DC]/50">
                    Upload up to 6 gallery photos (max 10MB each). Drag & drop or click to browse.
                  </p>
                </div>
              </motion.div>
            )}

            {/* About & Awards Tab */}
            {activeTab === 'about' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* About Section */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-[#E5A823]" />
                    About Artist
                  </h3>
                  
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={8}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors resize-none"
                    placeholder="Tell your story... Describe your musical journey, influences, achievements, and what makes you unique as an artist. This helps fans and bookers connect with you."
                  />
                </div>

                {/* Awards Section */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Award className="w-5 h-5 text-[#E5A823]" />
                      Awards & Recognition
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAwardForm(true)}
                      className="px-3 py-1.5 bg-[#E5A823] text-[#0D0D0D] text-sm font-medium rounded-lg flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Award
                    </button>
                  </div>
                  
                  {/* Award Form */}
                  {showAwardForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-4 p-4 bg-[#2A2A2A] rounded-xl"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          value={newAward.title}
                          onChange={(e) => setNewAward({ ...newAward, title: e.target.value })}
                          className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                          placeholder="Award Title"
                        />
                        <input
                          type="text"
                          value={newAward.year}
                          onChange={(e) => setNewAward({ ...newAward, year: e.target.value })}
                          className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                          placeholder="Year"
                        />
                      </div>
                      <textarea
                        value={newAward.description}
                        onChange={(e) => setNewAward({ ...newAward, description: e.target.value })}
                        className="w-full bg-[#0D0D0D] border border-[#3A3A3A] rounded-lg px-3 py-2 text-sm text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] resize-none mb-3"
                        rows={2}
                        placeholder="Brief description"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addAward}
                          className="px-4 py-2 bg-[#E5A823] text-[#0D0D0D] text-sm font-medium rounded-lg"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAwardForm(false)}
                          className="px-4 py-2 bg-[#3A3A3A] text-[#F5F5DC] text-sm rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Awards List */}
                  <div className="space-y-3">
                    {awards.map((award) => (
                      <div key={award.id} className="flex items-start gap-3 p-3 bg-[#2A2A2A] rounded-xl">
                        <div className="p-2 bg-[#E5A823]/20 rounded-lg">
                          <Award className="w-5 h-5 text-[#E5A823]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-[#F5F5DC]">{award.title}</h4>
                            <span className="text-xs text-[#E5A823] bg-[#E5A823]/10 px-2 py-0.5 rounded">{award.year}</span>
                          </div>
                          <p className="text-sm text-[#F5F5DC]/60 mt-1">{award.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAward(award.id)}
                          className="p-1.5 hover:bg-[#EB4D4B]/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-[#EB4D4B]" />
                        </button>
                      </div>
                    ))}
                    
                    {awards.length === 0 && !showAwardForm && (
                      <div className="text-center py-8 text-[#F5F5DC]/40">
                        <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No awards added yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preferences */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4">Event Preferences</h3>
                  <p className="text-sm text-[#F5F5DC]/60 mb-4">Select the types of events you are interested in performing at:</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {preferences.map((pref) => (
                      <button
                        key={pref.id}
                        type="button"
                        onClick={() => togglePreference(pref.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          pref.selected
                            ? 'bg-[#E5A823] text-[#0D0D0D]'
                            : 'bg-[#2A2A2A] text-[#F5F5DC]/60 hover:bg-[#3A3A3A]'
                        }`}
                      >
                        {pref.selected && <CheckCircle2 className="w-4 h-4 inline mr-1" />}
                        {pref.name}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Promo Codes Tab */}
            {activeTab === 'promo' && (
              <PromoCodeSection
                role="ARTIST"
                promoForm={promoForm}
                globalCoupons={globalCoupons}
                promoSummary={promoSummary}
                message={message}
                onPromoInputChange={handlePromoInputChange}
                onGenerateCode={generateUniqueCode}
                onSubmitPromo={handleSendPromoRequest}
              />
            )}
          </div>

          {/* Sidebar Preview Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-sm font-medium text-[#F5F5DC]/60 mb-4">Profile Preview</h3>
                
                <div className="relative h-32 rounded-xl overflow-hidden bg-[#2A2A2A] mb-4">
                  {coverImage ? (
                    <img src={coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#F5F5DC]/30">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#2A2A2A] border-2 border-[#E5A823]">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#F5F5DC]/30">
                        <Camera className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#F5F5DC]">
                      {formData.stageName || 'Your Stage Name'}
                    </h4>
                    <p className="text-sm text-[#F5F5DC]/60">
                      {formData.genres.slice(0, 2).join(', ') || 'Add genres'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#F5F5DC]/60">Rate</span>
                    <span className="font-medium text-[#E5A823]">
                      ₹{formData.hourlyRate || '0'}/hr
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#F5F5DC]/60 flex items-center gap-1">
                      <Languages className="w-4 h-4" /> Languages
                    </span>
                    <span className="font-medium text-[#F5F5DC]">
                      {formData.languages.length > 0 ? formData.languages.slice(0, 2).join(', ') : 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#F5F5DC]/60 flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> Location
                    </span>
                    <span className="font-medium text-[#F5F5DC]">
                      {formData.location || 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#F5F5DC]/60 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Status
                    </span>
                    <span className={`font-medium ${
                      formData.availability === 'Available' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {formData.availability}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  Book Now
                </button>

                <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-[#E5A823]">{formData.experience || '0'}</p>
                      <p className="text-xs text-[#F5F5DC]/50">Years Exp.</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#E5A823]">{awards.length}</p>
                      <p className="text-xs text-[#F5F5DC]/50">Awards</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#E5A823]">{videos.length}</p>
                      <p className="text-xs text-[#F5F5DC]/50">Videos</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-[#E5A823]/10 border border-[#E5A823]/20 rounded-xl">
                <p className="text-sm text-[#E5A823]">
                  <Star className="w-4 h-4 inline mr-1" />
                  Complete your profile to increase booking chances by 80%!
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
