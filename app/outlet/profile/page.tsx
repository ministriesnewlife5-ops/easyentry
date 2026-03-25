'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, X, Camera, MapPin, Globe, 
  Building2, Edit2, CheckCircle2,
  Instagram, Twitter, Facebook, Phone, Mail,
  Users, Zap
} from 'lucide-react';
import Image from 'next/image';

export default function OutletProfilePage() {
  const [activeTab, setActiveTab] = useState<'details' | 'about'>('details');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
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
  });

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Outlet Profile:', {
      ...formData,
      profileImage,
      coverImage,
    });
    alert('Profile saved successfully!');
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      <div className="bg-[#0D0D0D] border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[#E5A823]">Outlet Profile</h1>
            <span className="text-[#F5F5DC]/50">|</span>
            <span className="text-[#F5F5DC]/70">Manage your venue details</span>
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
              { id: 'about', label: 'About & Social', icon: Building2 },
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
              className="space-y-6"
            >
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#E5A823]" />
                  Venue Images
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Venue Photo</label>
                    <div 
                      onClick={() => profileInputRef.current?.click()}
                      className="relative w-40 h-40 rounded-2xl bg-[#2A2A2A] border-2 border-dashed border-[#E5A823]/30 flex items-center justify-center cursor-pointer hover:border-[#E5A823] transition-colors overflow-hidden"
                    >
                      {profileImage ? (
                        <Image src={profileImage} alt="Profile" fill className="object-cover" />
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-[#E5A823] mx-auto mb-2" />
                          <span className="text-sm text-[#F5F5DC]/50">Upload Venue</span>
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
                  <Building2 className="w-5 h-5 text-[#E5A823]" />
                  Venue Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Venue Name</label>
                    <input type="text" name="venueName" value={formData.venueName} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Pasha - The Park" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Venue Type</label>
                    <input type="text" name="venueType" value={formData.venueType} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Nightclub" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#E5A823]" /> Capacity
                    </label>
                    <input type="text" name="capacity" value={formData.capacity} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. 500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Chennai, Tamil Nadu" />
                  </div>
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
                  <textarea name="bio" value={formData.bio} onChange={handleInputChange} rows={6} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="Tell us about your venue, the kind of events you host..." />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </form>
    </div>
  );
}
