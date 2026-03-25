'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
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
  CheckCircle2
} from 'lucide-react';
import Navigation from '@/components/ui/Navigation';
import Footer from '@/components/ui/Footer';

export default function SellerFormPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    organizer: '',
    location: '',
    datetime: '',
    about: '',
    rules: '',
  });

  const [images, setImages] = useState<File[]>([]);

  const [activeTab, setActiveTab] = useState<'details' | 'media' | 'promo'>('details');
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
      
      const staticEvents = [
        { id: 1, title: 'Namma Chennai Night with DJ Goutham', venue: 'Gatsby 2000', date: '2026-07-01' },
        { id: 2, title: 'Electronic City Beats | Night 2', venue: 'Pasha - The Park', date: '2026-05-30' },
        { id: 3, title: 'The Great Indian Party', venue: 'High - Radisson Blu', date: '2026-03-14' },
        { id: 4, title: 'Techno Night at OMR', venue: 'The Leather Bar', date: '2026-04-18' },
        { id: 5, title: 'Live Fusion Night', venue: 'Illusions - The Madras Pub', date: '2026-06-12' },
        { id: 6, title: 'South Side Groove Tour', venue: 'Q Bar - Hilton', date: '2026-07-05' },
        { id: 7, title: 'The Underground Session', venue: 'The Slate Hotels', date: '2026-09-19' },
        { id: 8, title: 'Retro Night Specials', venue: '10 Downing Street', date: '2026-10-22' }
      ];
      
      const allEvents = [...hostedEvents, ...staticEvents];
      setEvents(allEvents);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...selectedFiles]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form Data:', formData);
    console.log('Images:', images);
    alert('Event created successfully!');
    // Handle API submission here
  };

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
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Publish Event
          </motion.button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {[
              { id: 'details', label: 'Basic Details', icon: Edit2 },
              { id: 'media', label: 'Event Media', icon: Camera },
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

                    <div>
                      <label className="block text-sm font-medium mb-3">Ticket Price (€) *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-3.5 w-4 h-4 text-[#F5F5DC]/50" />
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                        />
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-3">Date & Time *</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-[#F5F5DC]/50" />
                        <input
                          type="datetime-local"
                          name="datetime"
                          value={formData.datetime}
                          onChange={handleInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] [color-scheme:dark]"
                          required
                        />
                      </div>
                    </div>

                    <div>
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
                      <textarea
                        name="rules"
                        value={formData.rules}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] resize-y"
                        placeholder="Age restrictions, dress code, prohibited items..."
                        required
                      />
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
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#E5A823]" />
                    Event Media
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-3">Event Images</label>
                    <div 
                      onClick={() => document.getElementById('image-upload')?.click()}
                      className="mt-2 flex justify-center px-6 pt-10 pb-10 border-2 border-dashed border-[#2A2A2A] rounded-2xl hover:border-[#E5A823]/50 hover:bg-[#2A2A2A]/50 transition-all cursor-pointer"
                    >
                      <div className="space-y-3 text-center">
                        <div className="w-12 h-12 mx-auto rounded-full bg-[#2A2A2A] flex items-center justify-center">
                          <Upload className="h-5 w-5 text-[#E5A823]" />
                        </div>
                        <div className="flex flex-col text-sm text-[#F5F5DC]/50 justify-center gap-1">
                          <span className="font-medium text-[#E5A823] hover:text-[#F5C542]">Click to upload</span>
                          <span>or drag and drop</span>
                        </div>
                        <p className="text-xs text-[#F5F5DC]/30">High-res PNG, JPG up to 10MB</p>
                      </div>
                      <input 
                        id="image-upload"
                        type="file" 
                        multiple 
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden" 
                      />
                    </div>
                    
                    {images.length > 0 && (
                      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {images.map((file, index) => (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={index} 
                            className="relative aspect-square rounded-xl overflow-hidden border border-[#2A2A2A]"
                          >
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={`Preview ${index}`} 
                              className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                            />
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
                    Create Promo Code
                  </h3>
                  
                  <form onSubmit={handleSendPromoRequest} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-3">Select Event</label>
                      <select 
                        name="eventId"
                        value={promoForm.eventId}
                        onChange={handlePromoInputChange}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      >
                        <option value="">Choose an event...</option>
                        {events.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.title} - {event.venue} ({event.date})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Promo Code</label>
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
                      <p className="text-xs text-[#F5F5DC]/50 mt-2">Click "Generate" to create a unique code automatically</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Discount Percentage</label>
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

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center justify-center gap-2"
                    >
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
                    {images.length > 0 ? (
                      <img 
                        src={URL.createObjectURL(images[0])} 
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
                        €{formData.price || '0.00'}
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
                  Complete all sections and click "Publish Event" to submit your event for review.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
