'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, X, Camera, MapPin, Globe, 
  Briefcase, Megaphone, Edit2, CheckCircle2,
  Instagram, Twitter, Facebook, Phone, Mail,
  Video, Image as ImageIcon, Plus, Ticket, Trash2
} from 'lucide-react';
import Image from 'next/image';
import DragDropUpload from '@/components/ui/DragDropUpload';
import { uploadFileDirectToSupabase } from '@/lib/browser-storage';
import PromoCodeSection from '@/components/PromoCodeSection';

interface GalleryImage {
  id: string;
  url: string;
  name: string;
}

interface VideoThumbnail {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
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

export default function PromoterProfilePage() {
  const [activeTab, setActiveTab] = useState<'details' | 'media' | 'about' | 'promo'>('details');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [videos, setVideos] = useState<VideoThumbnail[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    experienceYears: '',
    website: '',
    instagram: '',
    twitter: '',
    facebook: '',
  });

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [promoForm, setPromoForm] = useState({
    code: '',
    maxUses: '',
    isActive: true,
    startsAt: '',
    endsAt: '',
  });
  const [globalCoupons, setGlobalCoupons] = useState<GlobalCouponRow[]>([]);
  const [promoSummary, setPromoSummary] = useState({
    totalShareAmount: 0,
    totalBookedAmount: 0,
    totalBookings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const couponStorageKey = 'global_coupon_promoter';

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

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const [globalCouponsResponse, profileResponse] = await Promise.all([
          fetch('/api/global-coupons', { cache: 'no-store' }),
          fetch('/api/promoter/profile', { cache: 'no-store' }),
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
              name: profile.name || '',
              companyName: profile.companyName || '',
              email: profile.email || '',
              phone: profile.phone || '',
              location: profile.location || '',
              bio: profile.bio || '',
              experienceYears: profile.experienceYears || '',
              website: profile.website || '',
              instagram: profile.instagram || '',
              twitter: profile.twitter || '',
              facebook: profile.facebook || '',
            }));

            setProfileImage(profile.profileImage || null);
            setCoverImage(profile.coverImage || null);
            setGalleryImages(Array.isArray(profile.galleryImages) ? profile.galleryImages : []);
            setVideos(Array.isArray(profile.videos) ? profile.videos : []);
          }
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to load promoter profile data' });
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
    const prefix = 'PARTY';
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
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to manage global coupon' });
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    try {
      const { url } = await uploadFileDirectToSupabase(file, 'promoter-profile');
      setProfileImage(url);
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload profile image' });
    }
  };

  const handleCoverImageUpload = async (file: File) => {
    try {
      const { url } = await uploadFileDirectToSupabase(file, 'promoter-cover');
      setCoverImage(url);
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload cover image' });
    }
  };

  const handleVideoUploadFile = async (file: File) => {
    if (videos.length < 4) {
      try {
        const { url } = await uploadFileDirectToSupabase(file, 'promoter-videos');
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

  const handleGalleryImageUploadFile = async (file: File) => {
    if (galleryImages.length < 9) {
      try {
        const { url } = await uploadFileDirectToSupabase(file, 'promoter-gallery');
        const newImage: GalleryImage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          url,
          name: file.name,
        };
        setGalleryImages(prev => [...prev, newImage]);
      } catch {
        setMessage({ type: 'error', text: 'Failed to upload gallery image' });
      }
    }
  };

  const removeVideo = (id: string) => {
    setVideos(videos.filter(v => v.id !== id));
  };

  const removeGalleryImage = (id: string) => {
    setGalleryImages(galleryImages.filter(img => img.id !== id));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/promoter/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          profileImage,
          coverImage,
          galleryImages,
          videos,
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
      <div className="bg-[#0D0D0D] border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[#E5A823]">Promoter Profile</h1>
            <span className="text-[#F5F5DC]/50">|</span>
            <span className="text-[#F5F5DC]/70">Manage your promoter account</span>
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

      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {[
              { id: 'details', label: 'Basic Details', icon: Edit2 },
              { id: 'media', label: 'Photos & Videos', icon: Camera },
              { id: 'promo', label: 'Promo Codes', icon: Ticket },
              { id: 'about', label: 'About & Social', icon: Megaphone },
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-[#EB4D4B]/30 bg-[#EB4D4B]/10 text-[#EB4D4B]'}`}>
            {message.text}
          </div>
        )}
        <div className="space-y-6">
          {activeTab === 'details' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#E5A823]" />
                    Profile Images
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-3">Profile Photo</label>
                      <DragDropUpload
                        type="image"
                        maxSize={5}
                        preview={profileImage}
                        onClear={() => setProfileImage(null)}
                        onFileSelect={handleProfileImageUpload}
                        className="w-40 h-40 rounded-2xl"
                        label="Drop profile photo"
                      />
                    </div>
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

                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[#E5A823]" />
                    Company Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Promoter Name</label>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Rahul Mehta" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Company Name</label>
                      <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Mehta Events" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Experience (Years)</label>
                      <input type="number" name="experienceYears" value={formData.experienceYears} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. 5" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Location</label>
                      <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Mumbai, Maharashtra" />
                    </div>
                  </div>
                </div>
              </div>

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
                        <h4 className="font-bold text-[#F5F5DC]">{formData.name || 'Your Name'}</h4>
                        <p className="text-sm text-[#F5F5DC]/60">{formData.companyName || 'Company Name'}</p>
                      </div>
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#F5F5DC]/60 flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> Location
                        </span>
                        <span className="font-medium text-[#F5F5DC]">{formData.location || 'Not set'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#F5F5DC]/60 flex items-center gap-1">
                          <Briefcase className="w-4 h-4" /> Experience
                        </span>
                        <span className="font-medium text-[#F5F5DC]">{formData.experienceYears ? `${formData.experienceYears} years` : 'Not set'}</span>
                      </div>
                    </div>
                    <button type="button" className="w-full py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Contact
                    </button>
                    <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-[#E5A823]">{galleryImages.length}</p>
                          <p className="text-xs text-[#F5F5DC]/50">Photos</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-[#E5A823]">{videos.length}</p>
                          <p className="text-xs text-[#F5F5DC]/50">Videos</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'media' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Video className="w-5 h-5 text-[#E5A823]" />
                    Promotional Videos ({videos.length}/4)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {videos.map((video) => (
                      <div key={video.id} className="relative aspect-video rounded-xl overflow-hidden bg-[#2A2A2A] group">
                        <img src={video.thumbnail} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={() => removeVideo(video.id)} className="p-2 bg-[#EB4D4B] rounded-full">
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 text-xs text-white truncate">{video.title}</div>
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
                  <p className="mt-4 text-sm text-[#F5F5DC]/50">Upload up to 4 promotional videos (max 50MB each). Drag & drop or click to browse.</p>
                </div>

                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#E5A823]" />
                    Photo Gallery ({galleryImages.length}/9)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryImages.map((image) => (
                      <div key={image.id} className="relative aspect-square rounded-xl overflow-hidden bg-[#2A2A2A] group">
                        <img src={image.url} alt={image.name} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={() => removeGalleryImage(image.id)} className="p-2 bg-[#EB4D4B] rounded-full">
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {galleryImages.length < 9 && (
                      <DragDropUpload
                        type="image"
                        maxSize={5}
                        onFileSelect={handleGalleryImageUploadFile}
                        className="aspect-square rounded-xl"
                        label="Drop photo here"
                      />
                    )}
                  </div>
                  <p className="mt-4 text-sm text-[#F5F5DC]/50">Upload up to 9 photos showcasing your work (max 5MB each). Drag & drop or click to browse.</p>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                    <h3 className="text-sm font-medium text-[#F5F5DC]/60 mb-4">Media Summary</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-[#2A2A2A] rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#E5A823]/20 rounded-lg">
                            <Video className="w-5 h-5 text-[#E5A823]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#F5F5DC]">Videos</p>
                            <p className="text-xs text-[#F5F5DC]/60">Promotional content</p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-[#E5A823]">{videos.length}/4</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-[#2A2A2A] rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#E5A823]/20 rounded-lg">
                            <ImageIcon className="w-5 h-5 text-[#E5A823]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#F5F5DC]">Photos</p>
                            <p className="text-xs text-[#F5F5DC]/60">Gallery images</p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-[#E5A823]">{galleryImages.length}/9</span>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-[#E5A823]/10 border border-[#E5A823]/20 rounded-xl">
                      <p className="text-sm text-[#E5A823]">
                        <CheckCircle2 className="w-4 h-4 inline mr-1" />
                        Upload media to showcase your work and attract more clients!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'promo' && (
            <PromoCodeSection
              role="PROMOTER"
              promoForm={promoForm}
              globalCoupons={globalCoupons}
              promoSummary={promoSummary}
              message={message}
              onPromoInputChange={handlePromoInputChange}
              onGenerateCode={generateUniqueCode}
              onSubmitPromo={handleSendPromoRequest}
            />
          )}

          {activeTab === 'about' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4">Contact & Social</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#E5A823]" /> Email
                    </label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#E5A823]" /> Phone
                    </label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#E5A823]" /> Website
                    </label>
                    <input type="url" name="website" value={formData.website} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-[#E5A823]" /> Instagram
                    </label>
                    <input type="text" name="instagram" value={formData.instagram} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" />
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium mb-2">Bio / Description</label>
                  <textarea name="bio" value={formData.bio} onChange={handleInputChange} rows={6} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="Tell us about your experience in event promotion..." />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
