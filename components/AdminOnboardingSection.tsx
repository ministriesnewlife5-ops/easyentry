'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic2, 
  Building2, 
  Megaphone, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  FileText, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';

type Role = 'artist' | 'promoter' | 'outlet';

const roles = [
  { id: 'artist' as Role, label: 'Artist', icon: Mic2, desc: 'Perform & grow their audience', color: '#E5A823' },
  { id: 'promoter' as Role, label: 'Influencer/Promoter', icon: Megaphone, desc: 'Sell tickets & promote events', color: '#EB4D4B' },
  { id: 'outlet' as Role, label: 'Outlet Provider', icon: Building2, desc: 'Host events at their venue', color: '#10B981' },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: "easeOut" as const }
  }
};

export default function AdminOnboardingSection() {
  const [selectedRole, setSelectedRole] = useState<Role>('artist');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Common form data
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    socialMedia: '',
    bio: '',
    // Artist specific
    stageName: '',
    genre: '',
    experience: '',
    portfolio: '',
    // Promoter specific
    companyName: '',
    website: '',
    experienceYears: '',
    // Outlet specific
    venueName: '',
    venueType: '',
    location: '',
    capacity: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      socialMedia: '',
      bio: '',
      stageName: '',
      genre: '',
      experience: '',
      portfolio: '',
      companyName: '',
      website: '',
      experienceYears: '',
      venueName: '',
      venueType: '',
      location: '',
      capacity: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password) {
      setMessage({ type: 'error', text: 'Please fill in all required fields (Full Name, Email, Password)' });
      return;
    }

    // Role-specific validation
    if (selectedRole === 'artist' && !formData.stageName) {
      setMessage({ type: 'error', text: 'Stage name is required for artists' });
      return;
    }
    if (selectedRole === 'promoter' && !formData.companyName) {
      setMessage({ type: 'error', text: 'Company name is required for promoters' });
      return;
    }
    if (selectedRole === 'outlet' && (!formData.venueName || !formData.location)) {
      setMessage({ type: 'error', text: 'Venue name and location are required for outlet providers' });
      return;
    }
    
    setSubmitting(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          ...formData
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `${roles.find(r => r.id === selectedRole)?.label} onboarded successfully! Credentials sent to ${formData.email}` 
        });
        resetForm();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to onboard user' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while onboarding' });
    } finally {
      setSubmitting(false);
    }
  };

  const currentRole = roles.find(r => r.id === selectedRole);

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E5A823] to-[#F5C542] flex items-center justify-center shadow-lg shadow-[#E5A823]/20">
            <Sparkles className="w-6 h-6 text-[#0D0D0D]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#F5F5DC]">Onboard Users</h1>
            <p className="text-sm text-[#F5F5DC]/50">Create accounts for artists, influencers, and outlet providers</p>
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <AnimatePresence>
        {message && (
          <motion.div 
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role Selector */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {roles.map((role) => (
          <motion.button
            key={role.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedRole(role.id)}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              selectedRole === role.id
                ? `border-[${role.color}] bg-[${role.color}]/10 shadow-lg`
                : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#E5A823]/50'
            }`}
            style={{
              borderColor: selectedRole === role.id ? role.color : undefined,
              backgroundColor: selectedRole === role.id ? `${role.color}10` : undefined,
              boxShadow: selectedRole === role.id ? `0 10px 40px -10px ${role.color}40` : undefined
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${role.color}20` }}
              >
                <role.icon className="w-5 h-5" style={{ color: role.color }} />
              </div>
              <h3 className="font-bold text-lg text-[#F5F5DC]">{role.label}</h3>
            </div>
            <p className="text-sm text-[#F5F5DC]/60">{role.desc}</p>
          </motion.button>
        ))}
      </motion.div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Account Information */}
            <motion.div 
              className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#E5A823]" />
                  <h2 className="font-semibold text-[#F5F5DC]">Account Information</h2>
                  <span className="text-xs text-[#E5A823] bg-[#E5A823]/10 px-2 py-0.5 rounded-full">Required</span>
                </div>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                      placeholder="user@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 pr-24 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                        placeholder="Min 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 text-[#F5F5DC]/40 hover:text-[#F5F5DC] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#E5A823]/20 text-[#E5A823] rounded hover:bg-[#E5A823]/30 transition-colors"
                      >
                        Gen
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Social Media / Website</label>
                  <input
                    type="text"
                    name="socialMedia"
                    value={formData.socialMedia}
                    onChange={handleInputChange}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                    placeholder="Instagram, Twitter, LinkedIn, etc."
                  />
                </div>
              </div>
            </motion.div>

            {/* Role-specific Fields */}
            <AnimatePresence mode="wait">
              {selectedRole === 'artist' && (
                <motion.div 
                  key="artist"
                  className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                    <div className="flex items-center gap-2">
                      <Mic2 className="w-5 h-5 text-[#E5A823]" />
                      <h2 className="font-semibold text-[#F5F5DC]">Artist Information</h2>
                    </div>
                  </div>
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Stage Name *</label>
                        <input
                          type="text"
                          name="stageName"
                          value={formData.stageName}
                          onChange={handleInputChange}
                          required
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="Artist stage name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Genre *</label>
                        <div className="relative">
                          <select
                            name="genre"
                            value={formData.genre}
                            onChange={handleInputChange}
                            required
                            className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] appearance-none cursor-pointer transition-all"
                          >
                            <option value="">Select genre</option>
                            <option value="Electronic">Electronic</option>
                            <option value="Hip Hop">Hip Hop</option>
                            <option value="Rock">Rock</option>
                            <option value="Pop">Pop</option>
                            <option value="Jazz">Jazz</option>
                            <option value="Classical">Classical</option>
                            <option value="Bollywood">Bollywood</option>
                            <option value="Commercial">Commercial</option>
                            <option value="EDM">EDM</option>
                            <option value="Techno">Techno</option>
                            <option value="House">House</option>
                            <option value="Other">Other</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F5DC]/40 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Years of Experience</label>
                        <input
                          type="number"
                          name="experience"
                          value={formData.experience}
                          onChange={handleInputChange}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="Years performing"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Portfolio/Website</label>
                        <input
                          type="url"
                          name="portfolio"
                          value={formData.portfolio}
                          onChange={handleInputChange}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="https://artist-website.com"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedRole === 'promoter' && (
                <motion.div 
                  key="promoter"
                  className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-[#EB4D4B]" />
                      <h2 className="font-semibold text-[#F5F5DC]">Promoter Information</h2>
                    </div>
                  </div>
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Company/Organization Name *</label>
                        <input
                          type="text"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          required
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="Company name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Website</label>
                        <input
                          type="url"
                          name="website"
                          value={formData.website}
                          onChange={handleInputChange}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="https://company-website.com"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Years of Experience</label>
                        <input
                          type="number"
                          name="experienceYears"
                          value={formData.experienceYears}
                          onChange={handleInputChange}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="Years in promotion"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Notable Events/Past Work</label>
                        <input
                          type="text"
                          name="portfolio"
                          value={formData.portfolio}
                          onChange={handleInputChange}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="Major events promoted"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedRole === 'outlet' && (
                <motion.div 
                  key="outlet"
                  className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#10B981]" />
                      <h2 className="font-semibold text-[#F5F5DC]">Venue Information</h2>
                    </div>
                  </div>
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Venue Name *</label>
                        <input
                          type="text"
                          name="venueName"
                          value={formData.venueName}
                          onChange={handleInputChange}
                          required
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="Venue name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Venue Type *</label>
                        <input
                          type="text"
                          name="venueType"
                          value={formData.venueType}
                          onChange={handleInputChange}
                          required
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="e.g. Nightclub, Bar, Theater, Arena"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Location/Address *</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E5A823]" />
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          required
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="Full address"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Capacity</label>
                        <input
                          type="number"
                          name="capacity"
                          value={formData.capacity}
                          onChange={handleInputChange}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="Maximum capacity"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Website</label>
                        <input
                          type="url"
                          name="website"
                          value={formData.website}
                          onChange={handleInputChange}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                          placeholder="https://venue-website.com"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bio Section */}
            <motion.div 
              className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 }}
            >
              <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#E5A823]" />
                  <h2 className="font-semibold text-[#F5F5DC]">Bio / Description</h2>
                </div>
              </div>
              <div className="p-5">
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all resize-none placeholder:text-[#F5F5DC]/30"
                  placeholder={`Tell us about this ${currentRole?.label.toLowerCase()}...`}
                />
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Summary Card */}
            <motion.div 
              className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] p-5 sticky top-6"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-semibold text-[#F5F5DC] mb-4">Onboarding Summary</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-[#0D0D0D] rounded-xl">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${currentRole?.color}20` }}
                  >
                    {currentRole && <currentRole.icon className="w-5 h-5" style={{ color: currentRole.color }} />}
                  </div>
                  <div>
                    <p className="text-sm text-[#F5F5DC]/60">Role</p>
                    <p className="font-medium text-[#F5F5DC]">{currentRole?.label}</p>
                  </div>
                </div>

                <div className="p-3 bg-[#0D0D0D] rounded-xl">
                  <p className="text-sm text-[#F5F5DC]/60 mb-1">Required Fields</p>
                  <ul className="text-sm text-[#F5F5DC]/80 space-y-1">
                    <li className="flex items-center gap-2">
                      <span className={formData.fullName ? 'text-emerald-400' : 'text-[#E5A823]'}>
                        {formData.fullName ? '✓' : '•'}
                      </span>
                      Full Name
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={formData.email ? 'text-emerald-400' : 'text-[#E5A823]'}>
                        {formData.email ? '✓' : '•'}
                      </span>
                      Email Address
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={formData.password ? 'text-emerald-400' : 'text-[#E5A823]'}>
                        {formData.password ? '✓' : '•'}
                      </span>
                      Password
                    </li>
                    {selectedRole === 'artist' && (
                      <li className="flex items-center gap-2">
                        <span className={formData.stageName ? 'text-emerald-400' : 'text-[#E5A823]'}>
                          {formData.stageName ? '✓' : '•'}
                        </span>
                        Stage Name
                      </li>
                    )}
                    {selectedRole === 'promoter' && (
                      <li className="flex items-center gap-2">
                        <span className={formData.companyName ? 'text-emerald-400' : 'text-[#E5A823]'}>
                          {formData.companyName ? '✓' : '•'}
                        </span>
                        Company Name
                      </li>
                    )}
                    {selectedRole === 'outlet' && (
                      <>
                        <li className="flex items-center gap-2">
                          <span className={formData.venueName ? 'text-emerald-400' : 'text-[#E5A823]'}>
                            {formData.venueName ? '✓' : '•'}
                          </span>
                          Venue Name
                        </li>
                        <li className="flex items-center gap-2">
                          <span className={formData.location ? 'text-emerald-400' : 'text-[#E5A823]'}>
                            {formData.location ? '✓' : '•'}
                          </span>
                          Location
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="p-4 bg-[#E5A823]/5 border border-[#E5A823]/20 rounded-xl">
                  <p className="text-sm text-[#F5F5DC]/70">
                    <span className="text-[#E5A823] font-medium">Note:</span> The user will receive their credentials at the provided email address.
                  </p>
                </div>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] text-[#0D0D0D] font-black text-lg rounded-xl hover:from-[#F5C542] hover:to-[#FF6B6B] transition-all shadow-lg shadow-[#E5A823]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Onboarding...
                    </>
                  ) : (
                    <>
                      {currentRole && <currentRole.icon className="w-5 h-5" />}
                      Onboard {currentRole?.label}
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </form>
    </div>
  );
}
