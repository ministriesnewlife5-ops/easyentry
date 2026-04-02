'use client';

import { useState, useEffect, useRef } from 'react';
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
  Clock,
  Mic
} from 'lucide-react';
import Navigation from '@/components/ui/Navigation';
import Footer from '@/components/ui/Footer';
import DragDropUpload from '@/components/ui/DragDropUpload';

// Converts a File to a base64 data URL so images persist after page reload
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const maxDimension = 1920;
  let quality = 0.85;
  const targetBytes = 900 * 1024; // stay below common 1MB proxy limits

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });

  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return file;
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  let blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });

  while (blob && blob.size > targetBytes && quality > 0.45) {
    quality -= 0.08;
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
  }

  if (!blob) {
    return file;
  }

  const compressedName = file.name.replace(/\.[^.]+$/, '.jpg');
  return new File([blob], compressedName, { type: 'image/jpeg' });
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
    category: '',
    subcategory: '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  
  // Uploaded URLs state - files are uploaded immediately when selected
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [mediaFileUrls, setMediaFileUrls] = useState<Array<{ url: string; type: string; name: string }>>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const [activeTab, setActiveTab] = useState<'details' | 'tickets' | 'media' | 'promo'>('details');
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
  const [ticketCategories, setTicketCategories] = useState<Array<{ 
    id: string; 
    name: string; 
    price: number; 
    originalPrice?: number; 
    quantity: number; 
    availableFromDate?: string; 
    availableFromTime?: string; 
    availableUntilDate?: string; 
    availableUntilTime?: string;
    discount: number;
    platformFee: number;
    artistShare: number;
    influencerShare: number;
  }>>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [categories, setCategories] = useState<Array<{ name: string; icon: string; subFilters: string[] }>>([]);
  const [rules, setRules] = useState<Array<{ id: string; text: string }>>([{ id: '1', text: '' }]);
  
  // Artists state
  const [artists, setArtists] = useState<Array<{ id: string; email: string; name: string | null; role: string }>>([]);
  const [selectedArtists, setSelectedArtists] = useState<Array<{ id: string; email: string; name: string | null }>>([]);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [showArtistDropdown, setShowArtistDropdown] = useState(false);
  const artistDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load hosted events from API
      const loadHostedEvents = async () => {
        const { getHostedEvents } = await import('@/lib/hosted-events');
        const hostedEvents = await getHostedEvents();
        setEvents(hostedEvents);
      };
      loadHostedEvents();
      
      // Load categories from API
      const loadCategories = async () => {
        try {
          const response = await fetch('/api/browse-filters/default');
          if (response.ok) {
            const data = await response.json();
            const filters = data.filters;
            setCategories(filters?.categories || []);
          }
        } catch (e) {
          console.error('Error loading categories:', e);
          setCategories([]);
        }
      };
      loadCategories();

      // Fetch venue profile and pre-populate location
      const fetchVenueProfile = async () => {
        try {
          const response = await fetch('/api/venue/profile');
          const data = await response.json();
          if (data.venue && data.venue.location) {
            setFormData((prev) => ({
              ...prev,
              location: data.venue.location
            }));
          }
        } catch (error) {
          console.error('Error fetching venue profile:', error);
        }
      };
      fetchVenueProfile();

      // Fetch artists
      const fetchArtists = async () => {
        try {
          const response = await fetch('/api/artists');
          const data = await response.json();
          if (data.artists) {
            setArtists(data.artists);
          }
        } catch (error) {
          console.error('Error fetching artists:', error);
        }
      };
      fetchArtists();
    }
  }, []);

  // Close artist dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (artistDropdownRef.current && !artistDropdownRef.current.contains(event.target as Node)) {
        setShowArtistDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

        // Use pre-uploaded URLs - no conversion needed
        const coverImageUrlToUse = coverImageUrl || (mediaFileUrls.length > 0 && mediaFileUrls[0].type.startsWith('image/') 
            ? mediaFileUrls[0].url 
            : '');

        // Get all media URLs (already uploaded)
        const mediaFilesBase64: string[] = mediaFileUrls.map(m => m.url);
      
      const eventData = {
        title: formData.title,
        subtitle: formData.description,
        date: formData.date,
        time: formData.startTime,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.location,
        category: formData.category === 'Other' ? customCategory : (formData.category || 'General'),
        subcategory: formData.subcategory === 'Other' ? customSubcategory : (formData.subcategory || undefined),
        price: `₹${minPrice}`,
        image: coverImageUrlToUse,
        numberOfTickets: ticketCategories.reduce((sum, cat) => sum + (cat.quantity || 0), 0),
        mediaFiles: mediaFilesBase64,
        description: formData.about,
        fullDescription: formData.about,
        gatesOpen: formData.startTime,
        entryAge: '18+',
        layout: 'Standing',
        seating: 'General Admission',
        rules: rules.filter(r => r.text.trim()).map(r => r.text),
        taggedArtists: selectedArtists.map(a => ({ id: a.id, name: a.name, email: a.email })),
        ticketCategories: ticketCategories.map(cat => ({
          ...cat,
          originalPrice: cat.originalPrice || cat.price,
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
        
        // Also save to hosted events via API for immediate display
        const { saveHostedEvent } = await import('@/lib/hosted-events');
        await saveHostedEvent({
          id: Date.now(),
          title: formData.title,
          date: formData.date,
          venue: formData.location,
          price: `₹${minPrice}`,
          imageColor: 'bg-blue-900',
          category: 'General',
          imageUrl: coverImageUrlToUse,
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
          category: '',
          subcategory: '',
        });
        // Reset form and uploaded files
        setImages([]);
        setCoverImage(null);
        setMediaFiles([]);
        setCoverImageUrl('');
        setMediaFileUrls([]);
        setTicketCategories([]);
        setCustomCategory('');
        setCustomSubcategory('');
        setRules([{ id: '1', text: '' }]);
        setSelectedArtists([]);
        setArtistSearchQuery('');
        
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

  // Upload file immediately and return URL
  const uploadFileImmediately = async (file: File, type: string): Promise<string | null> => {
    const fileId = `${file.name}-${Date.now()}`;
    
    try {
      const uploadFile = await compressImageForUpload(file);

      // Guard against upstream reverse-proxy limits (common 1MB cap)
      const hardLimitBytes = 950 * 1024;
      if (uploadFile.size > hardLimitBytes) {
        setNotificationMessage(`File is too large after optimization (${Math.round(uploadFile.size / 1024)}KB). Please upload a smaller image.`);
        setShowNotification(true);
        return null;
      }

      setUploadingFiles(prev => new Set(prev).add(fileId));
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('type', type);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      setTimeout(() => {
        setUploadingFiles(prev => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
      }, 500);
      
      return data.url;
    } catch (error) {
      console.error('Error uploading file:', error);
      setNotificationMessage(`Failed to upload ${file.name}. Please try again.`);
      setShowNotification(true);
      setUploadingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
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

  const removeMediaFile = async (index: number) => {
    const file = mediaFiles[index];
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaFileUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...selectedFiles]);
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
              { id: 'tickets', label: 'Ticket Details', icon: Ticket },
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

      <form onSubmit={handleSendEventRequest} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                          setFormData((prev) => ({ ...prev, category: value, subcategory: '' }));
                          if (value !== 'Other') {
                            setCustomCategory('');
                          }
                        }}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        required
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
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
                      <label className="block text-sm font-medium mb-3">Subcategory *</label>
                      <select
                        name="subcategory"
                        value={formData.subcategory}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => ({ ...prev, subcategory: value }));
                          if (value !== 'Other') {
                            setCustomSubcategory('');
                          }
                        }}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        required
                        disabled={!formData.category}
                      >
                        <option value="">
                          {!formData.category ? 'Select category first' : 'Select subcategory'}
                        </option>
                        {formData.category && formData.category !== 'Other' && categories
                          .find((cat) => cat.name === formData.category)
                          ?.subFilters?.map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        {formData.category && (
                          <option value="Other">Other</option>
                        )}
                      </select>
                      {formData.subcategory === 'Other' && (
                        <div className="mt-3">
                          <input
                            type="text"
                            value={customSubcategory}
                            onChange={(e) => setCustomSubcategory(e.target.value)}
                            className="w-full bg-[#2A2A2A] border border-[#E5A823]/50 rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                            placeholder="Enter custom subcategory"
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

                    {/* Artist Selection */}
                    <div className="md:col-span-2" ref={artistDropdownRef}>
                      <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                        <Mic className="w-4 h-4 text-[#E5A823]" />
                        Tag Performing Artists
                      </label>
                      <div className="relative">
                        {/* Selected Artists Display */}
                        <div 
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] min-h-[50px] cursor-pointer flex flex-wrap gap-2 items-center"
                          onClick={() => setShowArtistDropdown(!showArtistDropdown)}
                        >
                          {selectedArtists.length === 0 ? (
                            <span className="text-[#F5F5DC]/50">Search and select artists...</span>
                          ) : (
                            selectedArtists.map((artist) => (
                              <span 
                                key={artist.id} 
                                className="inline-flex items-center gap-1 px-2 py-1 bg-[#E5A823]/20 text-[#E5A823] rounded-full text-sm"
                              >
                                {artist.name || artist.email}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedArtists(prev => prev.filter(a => a.id !== artist.id));
                                  }}
                                  className="hover:text-[#EB4D4B]"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))
                          )}
                          <div className="ml-auto">
                            <span className="text-[#E5A823]">{showArtistDropdown ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        {/* Dropdown */}
                        {showArtistDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-xl max-h-64 overflow-hidden">
                            {/* Search Input */}
                            <div className="p-2 border-b border-[#2A2A2A]">
                              <input
                                type="text"
                                value={artistSearchQuery}
                                onChange={(e) => setArtistSearchQuery(e.target.value)}
                                placeholder="Search artists..."
                                className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                autoFocus
                              />
                            </div>
                            
                            {/* Artists List */}
                            <div className="overflow-y-auto max-h-48">
                              {artists
                                .filter(artist => 
                                  (artist.name?.toLowerCase().includes(artistSearchQuery.toLowerCase()) || 
                                   artist.email.toLowerCase().includes(artistSearchQuery.toLowerCase())) &&
                                  !selectedArtists.find(a => a.id === artist.id)
                                )
                                .map((artist) => (
                                  <button
                                    key={artist.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedArtists(prev => [...prev, artist]);
                                      setArtistSearchQuery('');
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-[#2A2A2A] flex items-center gap-3 transition-colors"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-[#E5A823]/20 flex items-center justify-center">
                                      <User className="w-4 h-4 text-[#E5A823]" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-[#F5F5DC]">
                                        {artist.name || 'Unnamed Artist'}
                                      </div>
                                      <div className="text-xs text-[#F5F5DC]/50">{artist.email}</div>
                                    </div>
                                  </button>
                                ))}
                              {artists.filter(artist => 
                                (artist.name?.toLowerCase().includes(artistSearchQuery.toLowerCase()) || 
                                 artist.email.toLowerCase().includes(artistSearchQuery.toLowerCase())) &&
                                !selectedArtists.find(a => a.id === artist.id)
                              ).length === 0 && (
                                <div className="px-4 py-3 text-sm text-[#F5F5DC]/50 text-center">
                                  No artists found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#F5F5DC]/50 mt-2">
                        Select artists who will be performing at this event. Multiple artists can be selected.
                      </p>
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

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Ticket Categories Section */}
                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-[#E5A823]" />
                    Ticket Details
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-3">Ticket Categories *</label>
                      <div className="space-y-4">
                        {ticketCategories.map((cat, idx) => (
                          <div key={cat.id} className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
                            {/* Labels Row */}
                            <div className="grid grid-cols-12 gap-3 mb-2">
                              <div className="col-span-3">
                                <label className="text-xs text-[#F5F5DC]/50">Category</label>
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs text-[#F5F5DC]/50">Quantity</label>
                              </div>
                              <div className="col-span-3">
                                <label className="text-xs text-[#F5F5DC]/50">Sale Price (₹)</label>
                              </div>
                              <div className="col-span-3">
                                <label className="text-xs text-[#F5F5DC]/50">Original Price (₹)</label>
                              </div>
                              <div className="col-span-1"></div>
                            </div>
                            {/* Inputs Row */}
                            <div className="grid grid-cols-12 gap-3 mb-3">
                              <div className="col-span-3">
                                <input
                                  type="text"
                                  value={cat.name}
                                  onChange={(e) => {
                                    const v = e.target.value.toUpperCase();
                                    setTicketCategories((prev) =>
                                      prev.map((c) => (c.id === cat.id ? { ...c, name: v } : c))
                                    );
                                  }}
                                  className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                  placeholder="e.g. EARLYBIRD"
                                  required
                                />
                              </div>
                              <div className="col-span-2">
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={cat.quantity}
                                    onChange={(e) => {
                                      const quantity = Math.max(0, Number(e.target.value));
                                      setTicketCategories((prev) =>
                                        prev.map((c) => (c.id === cat.id ? { ...c, quantity } : c))
                                      );
                                    }}
                                    className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-3 pr-3 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                    placeholder="0"
                                    min={0}
                                    step={1}
                                    required
                                  />
                                </div>
                              </div>
                              <div className="col-span-3">
                                <div className="relative">
                                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F5DC]/50" />
                                  <input
                                    type="number"
                                    value={cat.price}
                                    onChange={(e) => {
                                      const price = Math.max(0, Number(e.target.value));
                                      setTicketCategories((prev) =>
                                        prev.map((c) => (c.id === cat.id ? { ...c, price } : c))
                                      );
                                    }}
                                    className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                    placeholder="0"
                                    min={0}
                                    step={0.01}
                                    required
                                  />
                                </div>
                              </div>
                              <div className="col-span-3">
                                <div className="relative">
                                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F5DC]/50" />
                                  <input
                                    type="number"
                                    value={cat.originalPrice || ''}
                                    onChange={(e) => {
                                      const originalPrice = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                                      setTicketCategories((prev) =>
                                        prev.map((c) => (c.id === cat.id ? { ...c, originalPrice } : c))
                                      );
                                    }}
                                    className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                    placeholder="Original"
                                    min={0}
                                    step={0.01}
                                  />
                                </div>
                              </div>
                              <div className="col-span-1 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTicketCategories((prev) => prev.filter((c) => c.id !== cat.id));
                                  }}
                                  disabled={ticketCategories.length <= 1}
                                  className="p-2 rounded-lg border border-[#2A2A2A] hover:border-[#EB4D4B] hover:bg-[#EB4D4B]/10 disabled:opacity-40"
                                >
                                  <Trash2 className="w-4 h-4 text-[#F5F5DC]/70" />
                                </button>
                              </div>
                            </div>
                            {/* Savings Display */}
                            {cat.originalPrice && cat.originalPrice > cat.price && (
                              <div className="mb-3 px-3 py-2 bg-[#E5A823]/10 border border-[#E5A823]/30 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-[#E5A823]">Savings</span>
                                  <span className="text-sm font-bold text-[#E5A823]">
                                    ₹{(cat.originalPrice - cat.price).toFixed(2)} ({((1 - cat.price / cat.originalPrice) * 100).toFixed(0)}% off)
                                  </span>
                                </div>
                              </div>
                            )}
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
                            setTicketCategories((prev) => [...prev, { 
                              id, 
                              name: 'NEW', 
                              price: 0, 
                              quantity: 0,
                              discount: 0,
                              platformFee: 5,
                              artistShare: 0,
                              influencerShare: 0
                            }]);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm hover:border-[#E5A823]"
                        >
                          <Plus className="w-4 h-4 text-[#E5A823]" />
                          Add category
                        </button>
                      </div>
                    </div>

                    {/* Money Flow Cards for Each Category */}
                    {ticketCategories.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <IndianRupee className="w-5 h-5 text-[#E5A823]" />
                          <h4 className="text-base font-bold text-[#F5F5DC]">Per-Ticket Money Flow</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {ticketCategories.map((category) => {
                            const gross = category.price || 0;
                            const discountAmt = gross * (category.discount / 100);
                            const customerPays = Math.max(gross - discountAmt, 0);
                            const pgFee = customerPays * 0.05;
                            const platformFeeAmt = customerPays * (category.platformFee / 100);
                            const artistAmt = gross * (category.artistShare / 100);
                            const influencerAmt = gross * (category.influencerShare / 100);
                            const outletNet = Math.max(customerPays - pgFee - platformFeeAmt - artistAmt - influencerAmt, 0);
                            const fmt = (n: number) => `₹${n.toFixed(0)}`;

                            return (
                              <motion.div
                                key={category.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-2xl p-6 border border-[#2A2A2A] hover:border-[#E5A823]/50 transition-all"
                              >
                                {/* Category Header */}
                                <div className="pb-4 mb-4 border-b border-[#2A2A2A]">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-lg font-bold text-[#E5A823]">{category.name}</h5>
                                    <span className="text-xs px-2 py-1 bg-[#E5A823]/10 text-[#E5A823] rounded-full font-medium">
                                      {category.quantity} tickets
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#F5F5DC]/50">Configure revenue split</p>
                                </div>

                                <div className="space-y-3">
                                  {/* Customer Pays */}
                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <div className="text-xs text-[#F5F5DC]/50">Customer Pays</div>
                                        <div className="text-lg font-black text-[#F5F5DC]">{fmt(customerPays)}</div>
                                      </div>
                                      {category.originalPrice && category.originalPrice > category.price && (
                                        <div className="text-right">
                                          <div className="text-xs text-[#F5F5DC]/50">Original</div>
                                          <div className="text-sm text-[#F5F5DC]/70 line-through">{fmt(gross)}</div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Discount Control */}
                                    <div className="space-y-2 mt-3 pt-3 border-t border-[#2A2A2A]">
                                      <div className="flex items-center justify-between gap-2">
                                        <label className="text-xs font-medium text-[#F5F5DC]/70 flex-1">Discount %</label>
                                        <input
                                          type="number"
                                          min={0}
                                          max={100}
                                          step={0.5}
                                          value={category.discount || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                              setTicketCategories((prev) =>
                                                prev.map((c) => (c.id === category.id ? { ...c, discount: 0 } : c))
                                              );
                                              return;
                                            }
                                            const num = parseFloat(val);
                                            if (!isNaN(num)) {
                                              setTicketCategories((prev) =>
                                                prev.map((c) => (c.id === category.id ? { ...c, discount: num } : c))
                                              );
                                            }
                                          }}
                                          onBlur={(e) => {
                                            const num = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                            setTicketCategories((prev) =>
                                              prev.map((c) => (c.id === category.id ? { ...c, discount: num } : c))
                                            );
                                          }}
                                          className="w-16 bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1 text-xs text-[#F5F5DC] text-center focus:outline-none focus:border-[#E5A823]"
                                        />
                                        <span className="text-[#E5A823] font-bold text-xs">%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        value={category.discount}
                                        onChange={(e) => {
                                          const num = parseFloat(e.target.value);
                                          setTicketCategories((prev) =>
                                            prev.map((c) => (c.id === category.id ? { ...c, discount: num } : c))
                                          );
                                        }}
                                        className="w-full h-1 accent-[#E5A823]"
                                      />
                                    </div>
                                  </div>

                                  {/* Artist Share */}
                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <div className="text-xs text-[#F5F5DC]/50">Artist Share</div>
                                        <div className="text-lg font-black text-[#F5F5DC]">{fmt(artistAmt)}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-2">
                                      <label className="text-xs font-medium text-[#F5F5DC]/70 flex-1">Share %</label>
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        value={category.artistShare || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === '') {
                                            setTicketCategories((prev) =>
                                              prev.map((c) => (c.id === category.id ? { ...c, artistShare: 0 } : c))
                                            );
                                            return;
                                          }
                                          const num = parseFloat(val);
                                          if (!isNaN(num)) {
                                            setTicketCategories((prev) =>
                                              prev.map((c) => (c.id === category.id ? { ...c, artistShare: num } : c))
                                            );
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const num = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                          setTicketCategories((prev) =>
                                            prev.map((c) => (c.id === category.id ? { ...c, artistShare: num } : c))
                                          );
                                        }}
                                        className="w-16 bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1 text-xs text-[#F5F5DC] text-center focus:outline-none focus:border-[#E5A823]"
                                      />
                                      <span className="text-[#E5A823] font-bold text-xs">%</span>
                                    </div>
                                  </div>

                                  {/* Influencer Share */}
                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <div className="text-xs text-[#F5F5DC]/50">Influencer Share</div>
                                        <div className="text-lg font-black text-[#F5F5DC]">{fmt(influencerAmt)}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-2">
                                      <label className="text-xs font-medium text-[#F5F5DC]/70 flex-1">Share %</label>
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        value={category.influencerShare || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === '') {
                                            setTicketCategories((prev) =>
                                              prev.map((c) => (c.id === category.id ? { ...c, influencerShare: 0 } : c))
                                            );
                                            return;
                                          }
                                          const num = parseFloat(val);
                                          if (!isNaN(num)) {
                                            setTicketCategories((prev) =>
                                              prev.map((c) => (c.id === category.id ? { ...c, influencerShare: num } : c))
                                            );
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const num = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                          setTicketCategories((prev) =>
                                            prev.map((c) => (c.id === category.id ? { ...c, influencerShare: num } : c))
                                          );
                                        }}
                                        className="w-16 bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1 text-xs text-[#F5F5DC] text-center focus:outline-none focus:border-[#E5A823]"
                                      />
                                      <span className="text-[#E5A823] font-bold text-xs">%</span>
                                    </div>
                                  </div>

                                  {/* Platform Fee */}
                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <div className="text-xs text-[#F5F5DC]/50">Platform Fee</div>
                                        <div className="text-lg font-black text-[#F5F5DC]">{fmt(platformFeeAmt)}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-2">
                                      <label className="text-xs font-medium text-[#F5F5DC]/70 flex-1">Fee %</label>
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        value={category.platformFee || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === '') {
                                            setTicketCategories((prev) =>
                                              prev.map((c) => (c.id === category.id ? { ...c, platformFee: 0 } : c))
                                            );
                                            return;
                                          }
                                          const num = parseFloat(val);
                                          if (!isNaN(num)) {
                                            setTicketCategories((prev) =>
                                              prev.map((c) => (c.id === category.id ? { ...c, platformFee: num } : c))
                                            );
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const num = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                          setTicketCategories((prev) =>
                                            prev.map((c) => (c.id === category.id ? { ...c, platformFee: num } : c))
                                          );
                                        }}
                                        className="w-16 bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1 text-xs text-[#F5F5DC] text-center focus:outline-none focus:border-[#E5A823]"
                                      />
                                      <span className="text-[#E5A823] font-bold text-xs">%</span>
                                    </div>
                                  </div>

                                  {/* Payment Gateway Fee */}
                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="text-xs text-[#F5F5DC]/50">Payment Gateway (5% Fixed)</div>
                                        <div className="text-lg font-black text-[#F5F5DC]">{fmt(pgFee)}</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Outlet Net */}
                                  <div className="rounded-lg border border-[#3E83B6]/50 bg-gradient-to-r from-[#3E83B6]/10 to-[#3E83B6]/5 p-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="text-xs text-[#3E83B6]">Outlet Net Revenue</div>
                                        <div className="text-xl font-black text-[#3E83B6]">{fmt(outletNet)}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-[#3E83B6]/70">After all deductions</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                    <DragDropUpload
                      type="image"
                      maxSize={10}
                      onFileSelect={handleCoverImageUpload}
                      className="w-full h-48 rounded-2xl"
                      label="Drop cover image here"
                    />
                    
                    {coverImage && (
                      <div className="mt-6">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E5A823]/30">
                          <img 
                            src={coverImageUrl || URL.createObjectURL(coverImage)} 
                            alt="Cover Preview" 
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCoverImage(null);
                              setCoverImageUrl('');
                            }}
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
                    Event Images & Videos ({mediaFiles.length} selected)
                  </h3>
                  <p className="text-sm text-[#F5F5DC]/60 mb-6">
                    Upload additional images and videos to showcase your event. Drag & drop or click to browse.
                  </p>
                  
                  <div>
                    <DragDropUpload
                      type="both"
                      maxSize={50}
                      onFileSelect={handleMediaFileUpload}
                      className="w-full h-32 rounded-2xl"
                      label="Drop images or videos here"
                    />
                    
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
                                  <source src={mediaFileUrls[index]?.url || URL.createObjectURL(file)} type={file.type} />
                                </video>
                                <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]/50">
                                  <Video className="w-8 h-8 text-[#E5A823]" />
                                </div>
                              </div>
                            ) : (
                              <img 
                                src={mediaFileUrls[index]?.url || URL.createObjectURL(file)} 
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
                    {coverImageUrl ? (
                      <img 
                        src={coverImageUrl} 
                        alt="Event Cover" 
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : mediaFileUrls.length > 0 && mediaFileUrls[0].type.startsWith('image/') ? (
                      <img 
                        src={mediaFileUrls[0].url} 
                        alt="Event" 
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : coverImage ? (
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
                        {formData.date ? new Date(formData.date).toLocaleDateString() : 'Not set'}
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
                    onClick={() => setActiveTab('tickets')}
                    className="px-8 py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    Next: Ticket Details
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                {activeTab === 'tickets' && (
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
