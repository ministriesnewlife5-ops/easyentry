'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  IndianRupee,
  Image as ImageIcon, 
  Info, 
  FileText, 
  AlertCircle,
  Plus,
  Trash2,
  Video,
  X,
  Clock,
  Building2,
  Megaphone,
  CheckCircle2,
  Send,
  Loader2,
  ChevronDown,
  Sparkles,
  Upload,
  Ticket,
  Tag,
  Users
} from 'lucide-react';
import DragDropUpload from '@/components/ui/DragDropUpload';

type Company = {
  id: string;
  name: string;
  type: 'outlet' | 'promoter';
  location?: string;
  email?: string;
};

type TicketCategory = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  availableFromDate?: string;
  availableFromTime?: string;
  availableUntilDate?: string;
  availableUntilTime?: string;
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

export default function AdminEventHostSection() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Form states
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    about: '',
    category: '',
  });
  
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([]);
  const [rules, setRules] = useState<Array<{ id: string; text: string }>>([{ id: '1', text: '' }]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaFileUrls, setMediaFileUrls] = useState<Array<{ url: string; type: string; name: string }>>([]);
  
  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);
  
  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Upload file immediately
  const uploadFileImmediately = async (file: File, type: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };
  
  const handleCoverImageUpload = async (file: File) => {
    setCoverImage(file);
    const url = await uploadFileImmediately(file, 'cover');
    if (url) {
      setCoverImageUrl(url);
    }
  };
  
  const handleMediaFileUpload = async (file: File) => {
    setMediaFiles(prev => [...prev, file]);
    const url = await uploadFileImmediately(file, 'media');
    if (url) {
      setMediaFileUrls(prev => [...prev, { url, type: file.type, name: file.name }]);
    }
  };
  
  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaFileUrls(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const addTicketCategory = () => {
    const newCategory: TicketCategory = {
      id: Math.random().toString(36).slice(2),
      name: '',
      price: 0,
      quantity: 0,
    };
    setTicketCategories(prev => [...prev, newCategory]);
  };
  
  const removeTicketCategory = (id: string) => {
    setTicketCategories(prev => prev.filter(cat => cat.id !== id));
  };
  
  const updateTicketCategory = (id: string, field: keyof TicketCategory, value: any) => {
    setTicketCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, [field]: value } : cat
    ));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany) {
      setMessage({ type: 'error', text: 'Please select a company' });
      return;
    }
    
    if (ticketCategories.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one ticket category' });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const minPrice = Math.min(...ticketCategories.map(c => c.price));
      
      const eventData = {
        title: formData.title,
        subtitle: formData.description,
        date: formData.date,
        time: formData.startTime,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.location,
        category: formData.category || 'General',
        price: `₹${minPrice}`,
        image: coverImageUrl || (mediaFileUrls.length > 0 && mediaFileUrls[0].type.startsWith('image/') 
          ? mediaFileUrls[0].url 
          : ''),
        numberOfTickets: ticketCategories.reduce((sum, cat) => sum + (cat.quantity || 0), 0),
        mediaFiles: mediaFileUrls.map(m => m.url),
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
        })),
        // Admin specific fields
        isAdminHosted: true,
        hostCompanyId: selectedCompany.id,
        hostCompanyType: selectedCompany.type,
        hostCompanyName: selectedCompany.name,
        status: 'approved', // Auto-approved since admin is creating
      };
      
      const response = await fetch('/api/admin/host-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData }),
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Event created successfully!' });
        // Reset form
        setSelectedCompany(null);
        setFormData({
          title: '',
          description: '',
          date: '',
          startTime: '',
          endTime: '',
          location: '',
          about: '',
          category: '',
        });
        setTicketCategories([]);
        setRules([{ id: '1', text: '' }]);
        setCoverImage(null);
        setCoverImageUrl('');
        setMediaFiles([]);
        setMediaFileUrls([]);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create event' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while creating the event' });
    } finally {
      setSubmitting(false);
    }
  };
  
  const isFormValid = selectedCompany && formData.title && formData.date && formData.startTime && formData.location && ticketCategories.length > 0;
  
  const totalTickets = ticketCategories.reduce((sum, cat) => sum + (cat.quantity || 0), 0);
  const minPrice = ticketCategories.length > 0 ? Math.min(...ticketCategories.map(c => c.price || 0)) : 0;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div 
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative">
            <Loader2 className="w-10 h-10 animate-spin text-[#E5A823]" />
            <div className="absolute inset-0 w-10 h-10 animate-ping rounded-full border border-[#E5A823]/30" />
          </div>
          <p className="text-[#F5F5DC]/60 text-sm">Loading companies...</p>
        </motion.div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-[#F5F5DC]">Host New Event</h1>
            <p className="text-sm text-[#F5F5DC]/50">Create and publish events as admin</p>
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

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Company Selection Card */}
            <motion.div 
              className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#E5A823]" />
                  <h2 className="font-semibold text-[#F5F5DC]">Host Company</h2>
                  <span className="text-xs text-[#E5A823] bg-[#E5A823]/10 px-2 py-0.5 rounded-full">Required</span>
                </div>
              </div>
              <div className="p-5">
                <div className="relative">
                  <select
                    value={selectedCompany?.id || ''}
                    onChange={(e) => {
                      const company = companies.find(c => c.id === e.target.value);
                      setSelectedCompany(company || null);
                      if (company?.location) {
                        setFormData(prev => ({ ...prev, location: company.location! }));
                      }
                    }}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] appearance-none cursor-pointer transition-all"
                    required
                  >
                    <option value="">Select an outlet or promoter...</option>
                    <optgroup label="Outlets">
                      {companies.filter(c => c.type === 'outlet').map(company => (
                        <option key={company.id} value={company.id}>
                          {company.name} {company.location ? `(${company.location})` : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Promoters">
                      {companies.filter(c => c.type === 'promoter').map(company => (
                        <option key={company.id} value={company.id}>
                          {company.name} {company.email ? `- ${company.email}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#F5F5DC]/40 pointer-events-none" />
                </div>
                
                {selectedCompany && (
                  <motion.div 
                    className="mt-4 p-4 bg-gradient-to-r from-[#E5A823]/10 to-[#E5A823]/5 border border-[#E5A823]/20 rounded-xl"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#E5A823]/20 flex items-center justify-center">
                        {selectedCompany.type === 'outlet' ? <Building2 className="w-5 h-5 text-[#E5A823]" /> : <Megaphone className="w-5 h-5 text-[#E5A823]" />}
                      </div>
                      <div>
                        <p className="font-medium text-[#F5F5DC]">{selectedCompany.name}</p>
                        <p className="text-xs text-[#F5F5DC]/50 capitalize">{selectedCompany.type}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Event Details Card */}
            <motion.div 
              className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 }}
            >
              <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#E5A823]" />
                  <h2 className="font-semibold text-[#F5F5DC]">Event Details</h2>
                </div>
              </div>
              <div className="p-5 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Event Title <span className="text-[#E5A823]">*</span></label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                    placeholder="e.g. Summer Music Festival 2026"
                    required
                  />
                </div>

                {/* Category & Date Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Category</label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] appearance-none cursor-pointer transition-all"
                      >
                        <option value="">Select category</option>
                        <option value="Club Night">Club Night</option>
                        <option value="Concert">Concert</option>
                        <option value="Festival">Festival</option>
                        <option value="Party">Party</option>
                        <option value="Stand-up">Stand-up</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Other">Other</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F5DC]/40 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Date <span className="text-[#E5A823]">*</span></label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all [color-scheme:dark]"
                      required
                    />
                  </div>
                </div>

                {/* Time Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Start Time <span className="text-[#E5A823]">*</span></label>
                    <div className="relative">
                      <input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all [color-scheme:dark]"
                        required
                      />
                      <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F5DC]/40 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">End Time</label>
                    <div className="relative">
                      <input
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all [color-scheme:dark]"
                      />
                      <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F5DC]/40 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Venue / Location <span className="text-[#E5A823]">*</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#F5F5DC]/40" />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                      placeholder="Full address or venue name"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Short Description <span className="text-[#E5A823]">*</span></label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                    placeholder="A brief tagline or summary that appears on event cards"
                    required
                  />
                </div>
              </div>
            </motion.div>

            {/* About Event Card */}
            <motion.div 
              className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
            >
              <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#E5A823]" />
                  <h2 className="font-semibold text-[#F5F5DC]">About the Event</h2>
                </div>
              </div>
              <div className="p-5">
                <textarea
                  name="about"
                  value={formData.about}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all resize-y placeholder:text-[#F5F5DC]/30"
                  placeholder="Provide a detailed description of what attendees can expect..."
                  required
                />
              </div>
            </motion.div>

            {/* Ticket Categories Card */}
            <motion.div 
              className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
            >
              <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-[#E5A823]" />
                    <h2 className="font-semibold text-[#F5F5DC]">Ticket Categories</h2>
                    <span className="text-xs text-[#E5A823] bg-[#E5A823]/10 px-2 py-0.5 rounded-full">Required</span>
                  </div>
                  <button
                    type="button"
                    onClick={addTicketCategory}
                    className="flex items-center gap-2 px-4 py-2 bg-[#E5A823] hover:bg-[#F5C542] text-[#0D0D0D] rounded-xl text-sm font-medium transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Category
                  </button>
                </div>
              </div>
              <div className="p-5">
                {ticketCategories.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-[#2A2A2A] rounded-xl">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2A2A2A]/50 flex items-center justify-center">
                      <Tag className="w-8 h-8 text-[#F5F5DC]/30" />
                    </div>
                    <p className="text-[#F5F5DC]/50 mb-2">No ticket categories added yet</p>
                    <p className="text-[#F5F5DC]/30 text-sm mb-4">Add at least one ticket category to proceed</p>
                    <button
                      type="button"
                      onClick={addTicketCategory}
                      className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-[#F5F5DC] rounded-lg text-sm transition-all"
                    >
                      Add First Category
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticketCategories.map((cat, index) => (
                      <motion.div 
                        key={cat.id} 
                        className="bg-[#0D0D0D] rounded-xl p-4 border border-[#2A2A2A]"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <span className="w-6 h-6 rounded-full bg-[#E5A823]/20 text-[#E5A823] text-xs flex items-center justify-center font-medium">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-[#F5F5DC]/60">Category {index + 1}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-[#F5F5DC]/50 mb-1.5 block">Name</label>
                            <input
                              type="text"
                              value={cat.name}
                              onChange={(e) => updateTicketCategory(cat.id, 'name', e.target.value.toUpperCase())}
                              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all text-sm"
                              placeholder="e.g. GENERAL, VIP"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#F5F5DC]/50 mb-1.5 block">Price (₹)</label>
                            <input
                              type="number"
                              value={cat.price || ''}
                              onChange={(e) => updateTicketCategory(cat.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all text-sm"
                              placeholder="0"
                              min={0}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#F5F5DC]/50 mb-1.5 block">Quantity</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={cat.quantity || ''}
                                onChange={(e) => updateTicketCategory(cat.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all text-sm"
                                placeholder="0"
                                min={0}
                              />
                              <button
                                type="button"
                                onClick={() => removeTicketCategory(cat.id)}
                                className="p-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:bg-red-500/10 hover:border-red-500/30 transition-all group"
                              >
                                <Trash2 className="w-4 h-4 text-[#F5F5DC]/50 group-hover:text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Event Media Card */}
            <motion.div 
              className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.4 }}
            >
              <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#E5A823]" />
                  <h2 className="font-semibold text-[#F5F5DC]">Event Media</h2>
                </div>
              </div>
              <div className="p-5 space-y-6">
                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-3">Cover Image</label>
                  {!coverImage ? (
                    <DragDropUpload
                      type="image"
                      maxSize={10}
                      onFileSelect={handleCoverImageUpload}
                      className="w-full h-56 rounded-xl"
                      label="Drop cover image here or click to browse"
                    />
                  ) : (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E5A823]/30 group">
                      <img 
                        src={coverImageUrl || URL.createObjectURL(coverImage)} 
                        alt="Cover" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImage(null);
                          setCoverImageUrl('');
                        }}
                        className="absolute top-3 right-3 p-2.5 bg-black/60 backdrop-blur-sm rounded-full hover:bg-red-500 transition-all"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <span className="px-3 py-1 bg-[#E5A823] text-[#0D0D0D] text-xs font-medium rounded-full">Cover Image</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Additional Media */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-[#F5F5DC]/80">Additional Media</label>
                    <span className="text-xs text-[#F5F5DC]/40">{mediaFiles.length} file(s)</span>
                  </div>
                  <DragDropUpload
                    type="both"
                    maxSize={50}
                    onFileSelect={handleMediaFileUpload}
                    className="w-full h-32 rounded-xl"
                    label="Drop images or videos here or click to browse"
                  />
                  {mediaFiles.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {mediaFiles.map((file, index) => (
                        <motion.div 
                          key={index} 
                          className="relative aspect-square rounded-lg overflow-hidden border border-[#2A2A2A] group"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          {file.type.startsWith('video/') ? (
                            <div className="w-full h-full bg-[#1A1A1A] flex flex-col items-center justify-center">
                              <Video className="w-6 h-6 text-[#E5A823]" />
                              <span className="text-[10px] text-[#F5F5DC]/50 mt-1">Video</span>
                            </div>
                          ) : (
                            <img 
                              src={mediaFileUrls[index]?.url || URL.createObjectURL(file)} 
                              alt={`Media ${index}`} 
                              className="w-full h-full object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeMediaFile(index)}
                            className="absolute top-1.5 right-1.5 p-1.5 bg-black/70 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
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
          </div>

          {/* Sidebar - Sticky Summary */}
          <div className="lg:col-span-4">
            <div className="sticky top-6 space-y-4">
              {/* Quick Stats Card */}
              <motion.div 
                className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="p-4 border-b border-[#2A2A2A] bg-gradient-to-r from-[#E5A823]/10 to-transparent">
                  <h3 className="font-semibold text-[#E5A823] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Event Summary
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#0D0D0D] rounded-xl">
                    <div className="flex items-center gap-2 text-[#F5F5DC]/60">
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm">Host</span>
                    </div>
                    <span className={`text-sm font-medium ${selectedCompany ? 'text-[#E5A823]' : 'text-[#F5F5DC]/40'}`}>
                      {selectedCompany?.name || 'Not selected'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[#0D0D0D] rounded-xl">
                    <div className="flex items-center gap-2 text-[#F5F5DC]/60">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Total Tickets</span>
                    </div>
                    <span className="text-sm font-medium text-[#F5F5DC]">{totalTickets}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[#0D0D0D] rounded-xl">
                    <div className="flex items-center gap-2 text-[#F5F5DC]/60">
                      <IndianRupee className="w-4 h-4" />
                      <span className="text-sm">Starting Price</span>
                    </div>
                    <span className="text-sm font-medium text-[#E5A823]">₹{minPrice}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[#0D0D0D] rounded-xl">
                    <div className="flex items-center gap-2 text-[#F5F5DC]/60">
                      <Tag className="w-4 h-4" />
                      <span className="text-sm">Categories</span>
                    </div>
                    <span className="text-sm font-medium text-[#F5F5DC]">{ticketCategories.length}</span>
                  </div>
                </div>
              </motion.div>

              {/* Action Card */}
              <motion.div 
                className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${isFormValid ? 'bg-emerald-500' : 'bg-[#F5F5DC]/30'}`} />
                    <span className={`text-xs ${isFormValid ? 'text-emerald-400' : 'text-[#F5F5DC]/50'}`}>
                      {isFormValid ? 'Ready to publish' : 'Complete all required fields'}
                    </span>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submitting || !isFormValid}
                    className="w-full py-4 bg-gradient-to-r from-[#E5A823] to-[#F5C542] hover:from-[#F5C542] hover:to-[#FFD700] text-[#0D0D0D] font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#E5A823]/20 hover:shadow-xl hover:shadow-[#E5A823]/30"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {submitting ? 'Publishing...' : 'Publish Event'}
                  </button>
                  
                  <p className="mt-3 text-xs text-center text-[#F5F5DC]/40">
                    This event will be published immediately
                  </p>
                </div>
              </motion.div>

              {/* Tips Card */}
              <motion.div 
                className="bg-gradient-to-br from-[#E5A823]/5 to-[#E5A823]/0 rounded-2xl border border-[#E5A823]/20 overflow-hidden"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="p-4">
                  <h4 className="text-sm font-medium text-[#E5A823] mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Tips
                  </h4>
                  <ul className="space-y-2 text-xs text-[#F5F5DC]/60">
                    <li className="flex items-start gap-2">
                      <span className="text-[#E5A823]">•</span>
                      Use a high-quality cover image (1200x600px recommended)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#E5A823]">•</span>
                      Add at least one ticket category before publishing
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#E5A823]">•</span>
                      Double-check the date and time
                    </li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
