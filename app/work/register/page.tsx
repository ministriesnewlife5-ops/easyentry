'use client';

import { motion } from 'framer-motion';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mic2, Building2, Megaphone, User, Mail, Phone, MapPin, Briefcase, FileText, Image as ImageIcon } from 'lucide-react';

type Role = 'artist' | 'promoter' | 'outlet';

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') as Role) || 'artist';
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
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
    // Common
    bio: '',
    socialMedia: '',
    agreeTerms: false,
  });

  const roles = [
    { id: 'artist', label: 'Artist', icon: Mic2, desc: 'Perform & grow your audience' },
    { id: 'promoter', label: 'Promoter', icon: Megaphone, desc: 'Sell tickets & promote events' },
    { id: 'outlet', label: 'Outlet Provider', icon: Building2, desc: 'Host events at your venue' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', { role: selectedRole, ...formData });
    // Add form submission logic here
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-black mb-4">
            Work With <span className="text-[#E5A823]">Easy Entry</span>
          </h1>
          <p className="text-[#F5F5DC]/70 max-w-xl mx-auto">
            Join our platform and grow your business. Select your role below to get started.
          </p>
        </motion.div>

        {/* Role Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
        >
          {roles.map((role) => (
            <motion.button
              key={role.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRole(role.id as Role)}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                selectedRole === role.id
                  ? 'border-[#E5A823] bg-[#E5A823]/10 shadow-lg shadow-[#E5A823]/20'
                  : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#E5A823]/50'
              }`}
            >      
              <h3 className="font-bold text-lg mb-1">{role.label}</h3>
              <p className="text-sm text-[#F5F5DC]/60">{role.desc}</p>
            </motion.button>
          ))}
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="bg-[#2A2A2A] rounded-2xl p-6 md:p-8 border border-[#2A2A2A]"
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-[#E5A823]" />
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Social Media</label>
              <input
                type="text"
                name="socialMedia"
                value={formData.socialMedia}
                onChange={handleInputChange}
                className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                placeholder="Instagram, Twitter, etc."
              />
            </div>
          </div>

          {/* Role-specific fields */}
          {selectedRole === 'artist' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Mic2 className="w-5 h-5 text-[#E5A823]" />
                Artist Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Stage Name *</label>
                  <input
                    type="text"
                    name="stageName"
                    value={formData.stageName}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                    placeholder="Your stage name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Genre *</label>
                  <select
                    name="genre"
                    value={formData.genre}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                  >
                    <option value="">Select genre</option>
                    <option value="electronic">Electronic</option>
                    <option value="hip-hop">Hip Hop</option>
                    <option value="rock">Rock</option>
                    <option value="pop">Pop</option>
                    <option value="jazz">Jazz</option>
                    <option value="classical">Classical</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Years of Experience</label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                    placeholder="Years performing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Portfolio/Website</label>
                  <input
                    type="url"
                    name="portfolio"
                    value={formData.portfolio}
                    onChange={handleInputChange}
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {selectedRole === 'promoter' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#E5A823]" />
                Promoter Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Company/Organization Name *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                    placeholder="Your company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                    placeholder="https://yourcompany.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Years of Experience *</label>
                  <input
                    type="number"
                    name="experienceYears"
                    value={formData.experienceYears}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                    placeholder="Years in promotion"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Past Events</label>
                  <input
                    type="text"
                    name="portfolio"
                    value={formData.portfolio}
                    onChange={handleInputChange}
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                    placeholder="Notable events you've promoted"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {selectedRole === 'outlet' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#E5A823]" />
                Venue Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Venue Name *</label>
                  <input
                    type="text"
                    name="venueName"
                    value={formData.venueName}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                    placeholder="Venue name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Venue Type *</label>
                  <select
                    name="venueType"
                    value={formData.venueType}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                  >
                    <option value="">Select type</option>
                    <option value="club">Nightclub</option>
                    <option value="bar">Bar</option>
                    <option value="theater">Theater</option>
                    <option value="arena">Arena</option>
                    <option value="outdoor">Outdoor Space</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Location *</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E5A823]" />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg pl-12 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                      placeholder="Full address"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Capacity *</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                    placeholder="Maximum capacity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors"
                    placeholder="https://venue-website.com"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Bio */}
          <div className="mb-8">
            <label className="block text-sm font-medium mb-2">Bio/Description *</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full bg-[#0D0D0D] border border-[#0D0D0D] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-colors resize-none"
              placeholder="Tell us about yourself, your experience, and what you bring to the table..."
            />
          </div>

          {/* Terms */}
          <div className="mb-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleInputChange}
                required
                className="mt-1 w-5 h-5 rounded border-[#2A2A2A] bg-[#0D0D0D] text-[#E5A823] focus:ring-[#E5A823] focus:ring-offset-[#2A2A2A]"
              />
              <span className="text-sm text-[#F5F5DC]/70">
                I agree to the <span className="text-[#E5A823] hover:underline cursor-pointer">Terms of Service</span> and 
                <span className="text-[#E5A823] hover:underline cursor-pointer"> Privacy Policy</span>. 
                I confirm that all information provided is accurate.
              </span>
            </label>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] text-[#0D0D0D] font-black text-lg rounded-xl hover:from-[#F5C542] hover:to-[#FF6B6B] transition-all shadow-lg shadow-[#E5A823]/20"
          >
            Submit Application
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
}

export default function WorkRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] py-8 px-4 flex items-center justify-center">
        <div className="text-[#E5A823] text-xl font-bold">Loading...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
