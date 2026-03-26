'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, X, Camera, MapPin, Globe, 
  Briefcase, Megaphone, Edit2, CheckCircle2,
  Instagram, Twitter, Facebook, Phone, Mail,
  Ticket, Send, Video, Image as ImageIcon, Plus, Trash2
} from 'lucide-react';
import Image from 'next/image';

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
  const [events, setEvents] = useState<Array<{ id: number; title: string; venue: string; date: string }>>([]);
  const [promoForm, setPromoForm] = useState({
    eventId: '',
    promoCode: '',
    discountPercent: ''
  });
  const [promoRequests, setPromoRequests] = useState<Array<{ id: number; eventTitle: string; code: string; status: string }>>([]);

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
    const prefix = 'PARTY';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}${random}`;
    setPromoForm(prev => ({ ...prev, promoCode: code }));
  };

  const handleSendPromoRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.eventId || !promoForm.promoCode) {
      alert('Please select an event and enter a promo code');
      return;
    }
    
    const selectedEvent = events.find(e => e.id.toString() === promoForm.eventId);
    const newRequest = {
      id: Date.now(),
      eventTitle: selectedEvent?.title || 'Unknown Event',
      code: promoForm.promoCode,
      status: 'Pending'
    };
    
    setPromoRequests(prev => [newRequest, ...prev]);
    alert(`Promo code request sent for ${selectedEvent?.title}!\nCode: ${promoForm.promoCode}`);
    setPromoForm({ eventId: '', promoCode: '', discountPercent: '' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'profile') {
          setProfileImage(reader.result as string);
        } else {
          setCoverImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && videos.length < 4) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newVideo: VideoThumbnail = {
          id: Date.now().toString(),
          url: reader.result as string,
          thumbnail: reader.result as string,
          title: file.name,
        };
        setVideos([...videos, newVideo]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && galleryImages.length < 9) {
      Array.from(files).slice(0, 9 - galleryImages.length).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newImage: GalleryImage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            url: reader.result as string,
            name: file.name,
          };
          setGalleryImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Promoter Profile:', {
      ...formData,
      profileImage,
      coverImage,
      galleryImages,
      videos,
    });
    alert('Profile saved successfully!');
  };

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
            className="px-6 py-2 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Profile
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

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                      <div 
                        onClick={() => profileInputRef.current?.click()}
                        className="relative w-40 h-40 rounded-2xl bg-[#2A2A2A] border-2 border-dashed border-[#E5A823]/30 flex items-center justify-center cursor-pointer hover:border-[#E5A823] transition-colors overflow-hidden"
                      >
                        {profileImage ? (
                          <Image src={profileImage} alt="Profile" fill className="object-cover" />
                        ) : (
                          <div className="text-center">
                            <Upload className="w-8 h-8 text-[#E5A823] mx-auto mb-2" />
                            <span className="text-sm text-[#F5F5DC]/50">Upload Photo</span>
                          </div>
                        )}
                      </div>
                      <input ref={profileInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile')} className="hidden" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-3">Cover Photo</label>
                      <div 
                        onClick={() => coverInputRef.current?.click()}
                        className="relative w-full h-40 rounded-xl bg-[#2A2A2A] border-2 border-dashed border-[#E5A823]/30 flex items-center justify-center cursor-pointer hover:border-[#E5A823] transition-colors overflow-hidden"
                      >
                        {coverImage ? (
                          <Image src={coverImage} alt="Cover" fill className="object-cover" />
                        ) : (
                          <div className="text-center">
                            <Upload className="w-8 h-8 text-[#E5A823] mx-auto mb-2" />
                            <span className="text-sm text-[#F5F5DC]/50">Upload Cover</span>
                          </div>
                        )}
                      </div>
                      <input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} className="hidden" />
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
                        <Image src={coverImage} alt="Cover" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#F5F5DC]/30">
                          <Camera className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#2A2A2A] border-2 border-[#E5A823]">
                        {profileImage ? (
                          <Image src={profileImage} alt="Profile" fill className="object-cover" />
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
                    Promotional Videos
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {videos.map((video) => (
                      <div key={video.id} className="relative aspect-video rounded-xl overflow-hidden bg-[#2A2A2A] group">
                        <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={() => removeVideo(video.id)} className="p-2 bg-[#EB4D4B] rounded-full">
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 text-xs text-white truncate">{video.title}</div>
                      </div>
                    ))}
                    {videos.length < 4 && (
                      <div onClick={() => videoInputRef.current?.click()} className="aspect-video rounded-xl bg-[#2A2A2A] border-2 border-dashed border-[#E5A823]/30 flex flex-col items-center justify-center cursor-pointer hover:border-[#E5A823] transition-colors">
                        <Plus className="w-8 h-8 text-[#E5A823] mb-2" />
                        <span className="text-sm text-[#F5F5DC]/50">Add Video</span>
                      </div>
                    )}
                  </div>
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                  <p className="mt-4 text-sm text-[#F5F5DC]/50">Upload up to 4 promotional videos (max 50MB each)</p>
                </div>

                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#E5A823]" />
                    Photo Gallery
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryImages.map((image) => (
                      <div key={image.id} className="relative aspect-square rounded-xl overflow-hidden bg-[#2A2A2A] group">
                        <Image src={image.url} alt={image.name} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={() => removeGalleryImage(image.id)} className="p-2 bg-[#EB4D4B] rounded-full">
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {galleryImages.length < 9 && (
                      <div onClick={() => galleryInputRef.current?.click()} className="aspect-square rounded-xl bg-[#2A2A2A] border-2 border-dashed border-[#E5A823]/30 flex flex-col items-center justify-center cursor-pointer hover:border-[#E5A823] transition-colors">
                        <Plus className="w-8 h-8 text-[#E5A823] mb-2" />
                        <span className="text-sm text-[#F5F5DC]/50">Add Photos</span>
                        <span className="text-xs text-[#F5F5DC]/30 mt-1">{galleryImages.length}/9</span>
                      </div>
                    )}
                  </div>
                  <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryImageUpload} className="hidden" />
                  <p className="mt-4 text-sm text-[#F5F5DC]/50">Upload up to 9 photos showcasing your work (max 5MB each)</p>
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#E5A823]" />
                  Create Promo Code
                </h3>
                <form onSubmit={handleSendPromoRequest} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Select Event</label>
                    <select name="eventId" value={promoForm.eventId} onChange={handlePromoInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]">
                      <option value="">Choose an event...</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>{event.title} - {event.venue} ({event.date})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3">Promo Code</label>
                    <div className="flex gap-3">
                      <input type="text" name="promoCode" value={promoForm.promoCode} onChange={handlePromoInputChange} className="flex-1 bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] uppercase tracking-wider" placeholder="e.g. PARTY2024" />
                      <button type="button" onClick={generateUniqueCode} className="px-4 py-3 bg-[#2A2A2A] border border-[#E5A823]/30 text-[#E5A823] rounded-lg font-medium hover:bg-[#E5A823]/10 transition-colors">Generate</button>
                    </div>
                    <p className="text-xs text-[#F5F5DC]/50 mt-2">Click &quot;Generate&quot; to create a unique code automatically</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3">Discount Percentage</label>
                    <input type="number" name="discountPercent" value={promoForm.discountPercent} onChange={handlePromoInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. 15" min="1" max="100" />
                  </div>
                  <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-4 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    Send Request
                  </motion.button>
                </form>
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
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${request.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>{request.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
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
      </form>
    </div>
  );
}
