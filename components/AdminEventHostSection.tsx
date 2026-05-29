'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
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
import { uploadFileDirectToSupabase } from '@/lib/browser-storage';

type Company = {
  id: string;
  name: string;
  type: 'outlet' | 'promoter';
  location?: string;
  email?: string;
  ownerId?: string;
};

type BrowseCategory = {
  name: string;
  icon: string;
  subFilters: string[];
};

type BrowseLocationCity = {
  name: string;
  icon: string;
  areas: string[];
};

type BrowseLocationState = {
  state: string;
  cities: BrowseLocationCity[];
};

type Artist = {
  id: string;
  email: string;
  name: string | null;
};

type TicketCategory = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  tagline?: string;
  originalPrice?: number;
  availableFromDate?: string;
  availableFromTime?: string;
  availableUntilDate?: string;
  availableUntilTime?: string;
  discount?: number;
  platformFee?: number;
  paymentGatewayFee?: number;
  gstPercent?: number;
  artistShare?: number;
  influencerShare?: number;
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const maxDimension = 1920;
  let quality = 0.85;
  const targetBytes = 900 * 1024;

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

export default function AdminEventHostSection() {
  const searchParams = useSearchParams();
  const editEventId = (searchParams.get('editEventId') || '').trim();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const artistDropdownRef = useRef<HTMLDivElement>(null);
  
  // Form states
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    fullDescription: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    locationState: '',
    locationDistrict: '',
    locationArea: '',
    googleMapsLink: '',
    about: '',
    category: '',
    subcategory: '',
    gatesOpen: '',
    entryAge: '18+',
    layout: 'Standing',
    seating: 'General Admission',
  });
  const [categories, setCategories] = useState<BrowseCategory[]>([]);
  const [locationFilters, setLocationFilters] = useState<BrowseLocationState[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [showArtistDropdown, setShowArtistDropdown] = useState(false);
  
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([]);
  const [promoForm, setPromoForm] = useState({
    couponCode: '',
    couponDiscountPercent: '',
    sourceType: 'outlet' as 'outlet' | 'artist' | 'promoter' | 'influencer',
    sourceRefId: '',
    sourceRefName: '',
    startsAt: '',
    endsAt: '',
    maxUses: '',
  });
  const [rules, setRules] = useState<Array<{ id: string; text: string }>>([{ id: '1', text: '' }]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaFileUrls, setMediaFileUrls] = useState<Array<{ url: string; type: string; name: string }>>([]);
  
  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
    fetchBrowseFilters();
    fetchArtists();
  }, []);

  const normalizeCategories = (raw: unknown): BrowseCategory[] => {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const name = typeof record.name === 'string' ? record.name.trim() : '';
        if (!name) return null;
        const icon = typeof record.icon === 'string' && record.icon.trim() ? record.icon : 'Tag';
        const subFilters = Array.isArray(record.subFilters)
          ? record.subFilters
              .filter((sub): sub is string => typeof sub === 'string')
              .map((sub) => sub.trim())
              .filter(Boolean)
          : [];

        return { name, icon, subFilters };
      })
      .filter((item): item is BrowseCategory => item !== null);
  };

  const normalizeLocationFilters = (raw: unknown): BrowseLocationState[] => {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const state = typeof record.state === 'string' ? record.state.trim() : '';
        const cities = Array.isArray(record.cities)
          ? record.cities
              .map((city) => {
                if (!city || typeof city !== 'object') return null;
                const cityRecord = city as Record<string, unknown>;
                const name = typeof cityRecord.name === 'string' ? cityRecord.name.trim() : '';
                if (!name) return null;
                const icon = typeof cityRecord.icon === 'string' && cityRecord.icon.trim() ? cityRecord.icon : 'MapPin';
                const areas = Array.isArray(cityRecord.areas)
                  ? cityRecord.areas
                      .filter((area): area is string => typeof area === 'string')
                      .map((area) => area.trim())
                      .filter(Boolean)
                  : [];
                return { name, icon, areas };
              })
              .filter((city): city is BrowseLocationCity => city !== null)
          : [];

        if (!state) return null;
        return { state, cities };
      })
      .filter((item): item is BrowseLocationState => item !== null);
  };

  const fetchBrowseFilters = async () => {
    try {
      let loadedCategories: BrowseCategory[] = [];
      let loadedLocationFilters: BrowseLocationState[] = [];

      const adminFiltersResponse = await fetch('/api/admin/filters', { cache: 'no-store' });
      if (adminFiltersResponse.ok) {
        const data = await adminFiltersResponse.json();
        loadedCategories = normalizeCategories(data?.filters?.categories);
        loadedLocationFilters = normalizeLocationFilters(data?.filters?.locationFilters || []);
      }

      if (loadedCategories.length === 0) {
        const fallbackResponse = await fetch('/api/browse-filters/default', { cache: 'no-store' });
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          loadedCategories = normalizeCategories(data?.filters?.categories || data?.filters?.value?.categories);
        }
      }

      setCategories(loadedCategories);
      setLocationFilters(loadedLocationFilters);
    } catch (error) {
      console.error('Error loading browse categories:', error);
      setCategories([]);
      setLocationFilters([]);
    }
  };

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

  useEffect(() => {
    if (!editEventId) return;

    let cancelled = false;

    const loadEventForEdit = async () => {
      try {
        const response = await fetch(`/api/events/${encodeURIComponent(editEventId)}`, { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load event for editing.');
        }

        const event = payload?.event as Record<string, unknown> | undefined;
        if (!event || cancelled) return;

        setFormData((prev) => ({
          ...prev,
          title: typeof event.title === 'string' ? event.title : '',
          subtitle: typeof event.subtitle === 'string' ? event.subtitle : '',
          description: typeof event.description === 'string' ? event.description : '',
          fullDescription: typeof event.fullDescription === 'string' ? event.fullDescription : '',
          date: typeof event.date === 'string' ? event.date : '',
          startTime: typeof event.time === 'string' ? event.time.split(' - ')[0] || '' : '',
          endTime: typeof event.time === 'string' ? event.time.split(' - ')[1] || '' : '',
          location: typeof event.venue === 'string' ? event.venue : '',
          locationState: typeof event.locationState === 'string' ? event.locationState : '',
          locationDistrict: typeof event.locationDistrict === 'string' ? event.locationDistrict : '',
          locationArea: typeof event.locationArea === 'string' ? event.locationArea : '',
          googleMapsLink: typeof event.googleMapsLink === 'string' ? event.googleMapsLink : '',
          about: typeof event.fullDescription === 'string' ? event.fullDescription : (typeof event.description === 'string' ? event.description : ''),
          category: typeof event.category === 'string' ? event.category : '',
          subcategory: typeof event.subcategory === 'string' ? event.subcategory : '',
          gatesOpen: typeof event.gatesOpen === 'string' ? event.gatesOpen : '',
          entryAge: typeof event.entryAge === 'string' ? event.entryAge : '18+',
          layout: typeof event.layout === 'string' ? event.layout : 'Standing',
          seating: typeof event.seating === 'string' ? event.seating : 'General Admission',
        }));

        setSelectedArtists(
          Array.isArray(event.taggedArtists)
            ? (event.taggedArtists as Array<Record<string, unknown>>)
                .map((artist) => ({
                  id: typeof artist.id === 'string' ? artist.id : '',
                  email: typeof artist.email === 'string' ? artist.email : '',
                  name: typeof artist.name === 'string' ? artist.name : null,
                }))
                .filter((artist) => Boolean(artist.id))
            : []
        );

        setRules(
          Array.isArray(event.rules) && event.rules.length > 0
            ? (event.rules as unknown[])
                .filter((rule): rule is string => typeof rule === 'string')
                .map((text, index) => ({ id: `${index + 1}-${Math.random().toString(36).slice(2, 6)}`, text }))
            : [{ id: '1', text: '' }]
        );

        setTicketCategories(
          Array.isArray(event.ticketCategories) && event.ticketCategories.length > 0
            ? (event.ticketCategories as Array<Record<string, unknown>>).map((cat, index) => ({
                id: typeof cat.id === 'string' && cat.id ? cat.id : `ticket-${index + 1}`,
                name: typeof cat.name === 'string' ? cat.name : '',
                price: Number(cat.price || 0),
                quantity: Number(cat.quantity || 0),
                tagline: typeof cat.tagline === 'string' ? cat.tagline : '',
                originalPrice: cat.originalPrice != null ? Number(cat.originalPrice) : undefined,
                availableFromDate: typeof cat.availableFrom === 'string' ? cat.availableFrom.slice(0, 10) : undefined,
                availableFromTime: typeof cat.availableFrom === 'string' ? cat.availableFrom.slice(11, 16) : undefined,
                availableUntilDate: typeof cat.availableUntil === 'string' ? cat.availableUntil.slice(0, 10) : undefined,
                availableUntilTime: typeof cat.availableUntil === 'string' ? cat.availableUntil.slice(11, 16) : undefined,
                discount: Number(cat.discount || 0),
                platformFee: Number(cat.platformFee || 5),
                paymentGatewayFee: Number(cat.paymentGatewayFee || 5),
                gstPercent: Number(cat.gstPercent || 0),
                artistShare: Number(cat.artistShare || 0),
                influencerShare: Number(cat.influencerShare || 0),
              }))
            : []
        );

        setCoverImageUrl(typeof event.image === 'string' ? event.image : '');
        setMediaFileUrls(
          Array.isArray(event.mediaFiles)
            ? (event.mediaFiles as unknown[])
                .filter((item): item is string => typeof item === 'string')
                .map((url, index) => ({
                  url,
                  type: /\.(mp4|webm|ogg|mov|m4v|avi)(\?|#|$)/i.test(url) ? 'video/mp4' : 'image/jpeg',
                  name: `existing-${index + 1}`,
                }))
            : []
        );
      } catch (error) {
        console.error('Failed to load admin event for edit:', error);
      }
    };

    loadEventForEdit();

    return () => {
      cancelled = true;
    };
  }, [editEventId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (artistDropdownRef.current && !artistDropdownRef.current.contains(event.target as Node)) {
        setShowArtistDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      const uploadFile = await compressImageForUpload(file);

      const maxFileBytes = uploadFile.type.startsWith('video/')
        ? 50 * 1024 * 1024
        : uploadFile.type.startsWith('image/')
          ? 10 * 1024 * 1024
          : 25 * 1024 * 1024;

      if (uploadFile.size > maxFileBytes) {
        const sizeLabel = Math.round(maxFileBytes / (1024 * 1024));
        const unit = uploadFile.type.startsWith('video/') ? 'video' : 'file';
        setMessage({ type: 'error', text: `This ${unit} is too large. Please upload a file under ${sizeLabel}MB.` });
        return null;
      }

      const data = await uploadFileDirectToSupabase(uploadFile, type);
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

  const handleGenerateGoogleMapsLink = () => {
    const location = formData.location.trim();
    if (!location) return;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    setFormData((prev) => ({ ...prev, googleMapsLink: mapsUrl }));
  };

  const handlePromoInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPromoForm((prev) => ({ ...prev, [name]: value }));
  };

  const generateUniqueCode = () => {
    const prefix = 'ADMIN';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}${random}`;
    setPromoForm((prev) => ({ ...prev, couponCode: code }));
  };
  
  const addTicketCategory = () => {
    const newCategory: TicketCategory = {
      id: Math.random().toString(36).slice(2),
      name: '',
      price: 0,
      quantity: 0,
      tagline: '',
      originalPrice: undefined,
      discount: 0,
      platformFee: 5,
      paymentGatewayFee: 5,
      gstPercent: 0,
      artistShare: 0,
      influencerShare: 0,
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

    const hasInvalidTicketCategory = ticketCategories.some(
      (cat) => !cat.name.trim() || (cat.price || 0) < 0 || (cat.quantity || 0) <= 0
    );
    if (hasInvalidTicketCategory) {
      setMessage({
        type: 'error',
        text: 'Each ticket category must have a name, non-negative price, and quantity greater than 0.',
      });
      return;
    }

    if (promoForm.couponCode && !promoForm.couponDiscountPercent) {
      setMessage({ type: 'error', text: 'Please enter a discount percentage for the coupon code.' });
      return;
    }

    if (promoForm.couponDiscountPercent) {
      const parsedDiscount = Number(promoForm.couponDiscountPercent);
      if (!Number.isFinite(parsedDiscount) || parsedDiscount <= 0 || parsedDiscount > 100) {
        setMessage({ type: 'error', text: 'Coupon discount percentage must be between 1 and 100.' });
        return;
      }
    }

    if (promoForm.maxUses) {
      const parsedMaxUses = Number(promoForm.maxUses);
      if (!Number.isInteger(parsedMaxUses) || parsedMaxUses <= 0) {
        setMessage({ type: 'error', text: 'Coupon max uses must be a positive whole number.' });
        return;
      }
    }

    if (promoForm.startsAt && promoForm.endsAt) {
      const startAt = new Date(promoForm.startsAt).getTime();
      const endAt = new Date(promoForm.endsAt).getTime();
      if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) {
        setMessage({ type: 'error', text: 'Coupon end time must be after start time.' });
        return;
      }
    }
    
    setSubmitting(true);
    
    try {
      const minPrice = Math.min(...ticketCategories.map(c => c.price));
      
      const eventData = {
        title: formData.title,
        subtitle: formData.subtitle || formData.description,
        date: formData.date,
        time: formData.endTime ? `${formData.startTime} - ${formData.endTime}` : formData.startTime,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.location,
        locationState: formData.locationState || undefined,
        locationDistrict: formData.locationDistrict || undefined,
        locationArea: formData.locationArea || undefined,
        googleMapsLink: formData.googleMapsLink || undefined,
        category: formData.category || 'General',
        subcategory: formData.subcategory || undefined,
        price: `₹${minPrice}`,
        image: coverImageUrl || (mediaFileUrls.length > 0 && mediaFileUrls[0].type.startsWith('image/') 
          ? mediaFileUrls[0].url 
          : ''),
        numberOfTickets: ticketCategories.reduce((sum, cat) => sum + (cat.quantity || 0), 0),
        mediaFiles: mediaFileUrls.map(m => m.url),
        description: formData.description,
        fullDescription: formData.fullDescription || formData.about,
        gatesOpen: formData.gatesOpen || formData.startTime,
        entryAge: formData.entryAge,
        layout: formData.layout,
        seating: formData.seating,
        rules: rules.filter(r => r.text.trim()).map(r => r.text),
        taggedArtists: selectedArtists.map((artist) => ({ id: artist.id, name: artist.name, email: artist.email })),
        couponRules: promoForm.couponCode
          ? [
              {
                code: promoForm.couponCode.trim().toUpperCase(),
                discountPercent: Number(promoForm.couponDiscountPercent || 0),
                sourceType: promoForm.sourceType,
                sourceId: promoForm.sourceRefId || undefined,
                sourceName: promoForm.sourceRefName || undefined,
                startsAt: promoForm.startsAt || undefined,
                endsAt: promoForm.endsAt || undefined,
                maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : undefined,
              },
            ]
          : undefined,
        ticketCategories: ticketCategories.map(cat => ({
          ...cat,
          tagline: (cat.tagline || '').trim() || undefined,
          originalPrice: cat.originalPrice || cat.price,
          paymentGatewayFee: cat.paymentGatewayFee ?? 5,
          gstPercent: cat.gstPercent ?? 0,
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
        hostCompanyOwnerId: selectedCompany.ownerId,
        hostCompanyType: selectedCompany.type,
        hostCompanyName: selectedCompany.name,
      };
      
      const response = await fetch('/api/admin/event-requests', {
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
          subtitle: '',
          description: '',
          fullDescription: '',
          date: '',
          startTime: '',
          endTime: '',
          location: '',
          locationState: '',
          locationDistrict: '',
          locationArea: '',
          googleMapsLink: '',
          about: '',
          category: '',
          subcategory: '',
          gatesOpen: '',
          entryAge: '18+',
          layout: 'Standing',
          seating: 'General Admission',
        });
        setTicketCategories([]);
        setRules([{ id: '1', text: '' }]);
        setSelectedArtists([]);
        setArtistSearchQuery('');
        setShowArtistDropdown(false);
        setCoverImage(null);
        setCoverImageUrl('');
        setMediaFiles([]);
        setMediaFileUrls([]);
        setPromoForm({
          couponCode: '',
          couponDiscountPercent: '',
          sourceType: 'outlet',
          sourceRefId: '',
          sourceRefName: '',
          startsAt: '',
          endsAt: '',
          maxUses: '',
        });
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
  
  const selectedCategoryData = categories.find((item) => item.name === formData.category);
  const subcategoryOptions = selectedCategoryData?.subFilters || [];
  const selectedStateData = locationFilters.find((state) => state.state === formData.locationState);
  const districtOptions = selectedStateData?.cities || [];
  const selectedDistrictData = selectedStateData?.cities.find((city) => city.name === formData.locationDistrict);
  const areaOptions = selectedDistrictData?.areas || [];
  const filteredArtists = artists.filter((artist) => {
    const search = artistSearchQuery.trim().toLowerCase();
    if (!search) return true;
    return (artist.name || '').toLowerCase().includes(search) || artist.email.toLowerCase().includes(search);
  });

  const isFormValid =
    Boolean(selectedCompany) &&
    Boolean(formData.title) &&
    Boolean(formData.subtitle) &&
    Boolean(formData.description) &&
    Boolean(formData.date) &&
    Boolean(formData.startTime) &&
    Boolean(formData.location) &&
    Boolean(formData.locationState) &&
    Boolean(formData.locationDistrict) &&
    Boolean(formData.locationArea) &&
    Boolean(formData.category) &&
    ticketCategories.length > 0;
  
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
                      if (company) {
                        setPromoForm((prev) => ({
                          ...prev,
                          sourceType: company.type === 'promoter' ? 'promoter' : 'outlet',
                          sourceRefId: company.ownerId || company.id,
                          sourceRefName: company.name,
                        }));
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

                {/* Subtitle */}
                <div>
                  <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Subtitle <span className="text-[#E5A823]">*</span></label>
                  <input
                    type="text"
                    name="subtitle"
                    value={formData.subtitle}
                    onChange={handleInputChange}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                    placeholder="Short line shown on event cards"
                    required
                  />
                </div>

                {/* Category & Date Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Category <span className="text-[#E5A823]">*</span></label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={(e) => {
                          handleInputChange(e);
                          setFormData((prev) => ({ ...prev, subcategory: '' }));
                        }}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] appearance-none cursor-pointer transition-all"
                        required
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category.name} value={category.name}>
                            {category.name}
                          </option>
                        ))}
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

                {/* Subcategory */}
                <div>
                  <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Subcategory</label>
                  <div className="relative">
                    <select
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleInputChange}
                      disabled={!formData.category || subcategoryOptions.length === 0}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] appearance-none cursor-pointer transition-all disabled:opacity-60"
                    >
                      <option value="">Select subcategory</option>
                      {subcategoryOptions.map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {subcategory}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F5DC]/40 pointer-events-none" />
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">State <span className="text-[#E5A823]">*</span></label>
                    <select
                      name="locationState"
                      value={formData.locationState}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          locationState: value,
                          locationDistrict: '',
                          locationArea: '',
                        }));
                      }}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all appearance-none"
                      required
                    >
                      <option value="">Select state</option>
                      {locationFilters.map((state) => (
                        <option key={state.state} value={state.state}>{state.state}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">District / City <span className="text-[#E5A823]">*</span></label>
                    <select
                      name="locationDistrict"
                      value={formData.locationDistrict}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          locationDistrict: value,
                          locationArea: '',
                        }));
                      }}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all appearance-none disabled:opacity-60"
                      disabled={!selectedStateData}
                      required
                    >
                      <option value="">Select district</option>
                      {districtOptions.map((district) => (
                        <option key={district.name} value={district.name}>{district.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Area <span className="text-[#E5A823]">*</span></label>
                    <select
                      name="locationArea"
                      value={formData.locationArea}
                      onChange={handleInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all appearance-none disabled:opacity-60"
                      disabled={!selectedDistrictData}
                      required
                    >
                      <option value="">Select area</option>
                      {areaOptions.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-[#F5F5DC]/80">Google Maps Link</label>
                    <button
                      type="button"
                      onClick={handleGenerateGoogleMapsLink}
                      className="text-xs text-[#E5A823] hover:text-[#F5C542] transition-colors"
                    >
                      Auto-generate from location
                    </button>
                  </div>
                  <input
                    type="url"
                    name="googleMapsLink"
                    value={formData.googleMapsLink}
                    onChange={handleInputChange}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all placeholder:text-[#F5F5DC]/30"
                    placeholder="https://maps.google.com/..."
                  />
                </div>

                <div ref={artistDropdownRef}>
                  <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Tag Performing Artists</label>
                  <button
                    type="button"
                    onClick={() => setShowArtistDropdown((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-left"
                  >
                    <div className="flex flex-wrap gap-2">
                      {selectedArtists.length === 0 ? (
                        <span className="text-[#F5F5DC]/40">Search and select artists</span>
                      ) : (
                        selectedArtists.map((artist) => (
                          <span key={artist.id} className="inline-flex items-center gap-2 rounded-full bg-[#E5A823]/15 px-3 py-1 text-sm text-[#E5A823]">
                            {artist.name || artist.email}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedArtists((prev) => prev.filter((item) => item.id !== artist.id));
                              }}
                              className="text-[#E5A823] hover:text-[#F5C542]"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#F5F5DC]/40" />
                  </button>

                  {showArtistDropdown && (
                    <div className="mt-2 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-3">
                      <input
                        type="text"
                        value={artistSearchQuery}
                        onChange={(e) => setArtistSearchQuery(e.target.value)}
                        placeholder="Search artists by name or email"
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                      />
                      <div className="mt-3 max-h-52 overflow-y-auto space-y-2">
                        {filteredArtists.map((artist) => (
                          <button
                            key={artist.id}
                            type="button"
                            onClick={() => {
                              setSelectedArtists((prev) => [...prev, artist]);
                              setArtistSearchQuery('');
                              setShowArtistDropdown(false);
                            }}
                            className="w-full flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-left hover:border-[#E5A823]"
                          >
                            <div>
                              <p className="font-medium text-[#F5F5DC]">{artist.name || 'Artist'}</p>
                              <p className="text-xs text-[#F5F5DC]/50">{artist.email}</p>
                            </div>
                            <span className="text-xs text-[#E5A823]">Add</span>
                          </button>
                        ))}
                        {filteredArtists.length === 0 && (
                          <p className="py-4 text-center text-sm text-[#F5F5DC]/50">No artists found</p>
                        )}
                      </div>
                    </div>
                  )}
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

                {/* Experience Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Gates Open</label>
                    <input
                      type="time"
                      name="gatesOpen"
                      value={formData.gatesOpen}
                      onChange={handleInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Entry Age</label>
                    <input
                      type="text"
                      name="entryAge"
                      value={formData.entryAge}
                      onChange={handleInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all"
                      placeholder="e.g. 18+"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Layout</label>
                    <input
                      type="text"
                      name="layout"
                      value={formData.layout}
                      onChange={handleInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Seating</label>
                    <input
                      type="text"
                      name="seating"
                      value={formData.seating}
                      onChange={handleInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all"
                    />
                  </div>
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

            {/* Event Rules Card */}
            <motion.div
              className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.25 }}
            >
              <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#E5A823]" />
                  <h2 className="font-semibold text-[#F5F5DC]">Event Rules & Guidelines</h2>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {rules.map((rule, index) => (
                  <div key={rule.id} className="flex items-start gap-3">
                    <span className="mt-3 w-6 shrink-0 text-center text-sm font-bold text-[#E5A823]">{index + 1}.</span>
                    <input
                      type="text"
                      value={rule.text}
                      onChange={(e) => {
                        const text = e.target.value;
                        setRules((prev) => prev.map((item) => (item.id === rule.id ? { ...item, text } : item)));
                      }}
                      className="flex-1 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all"
                      placeholder={`Rule ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => setRules((prev) => prev.filter((item) => item.id !== rule.id))}
                      disabled={rules.length <= 1}
                      className="mt-1 p-2 rounded-lg border border-[#2A2A2A] hover:border-[#EB4D4B] hover:bg-[#EB4D4B]/10 disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4 text-[#F5F5DC]/70" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setRules((prev) => [...prev, { id: Math.random().toString(36).slice(2), text: '' }])}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm text-[#F5F5DC] hover:border-[#E5A823]"
                >
                  <Plus className="w-4 h-4 text-[#E5A823]" />
                  Add Rule
                </button>
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
                    {ticketCategories.map((cat, index) => {
                      const gross = cat.price || 0;
                      const discountAmt = gross * ((cat.discount || 0) / 100);
                      const taxableBase = Math.max(gross - discountAmt, 0);
                      const gstAmt = taxableBase * ((cat.gstPercent || 0) / 100);
                      const customerPays = Math.max(taxableBase + gstAmt, 0);
                      const pgFee = customerPays * ((cat.paymentGatewayFee ?? 5) / 100);
                      const platformFeeAmt = customerPays * ((cat.platformFee ?? 0) / 100);
                      const artistAmt = gross * ((cat.artistShare || 0) / 100);
                      const influencerAmt = gross * ((cat.influencerShare || 0) / 100);
                      const outletNet = Math.max(customerPays - pgFee - platformFeeAmt - artistAmt - influencerAmt, 0);
                      const fmt = (value: number) => `₹${value.toFixed(0)}`;

                      return (
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
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-[#F5F5DC]/50 mb-1.5 block">Available From (Date)</label>
                              <input
                                type="date"
                                value={cat.availableFromDate || ''}
                                onChange={(e) => updateTicketCategory(cat.id, 'availableFromDate', e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-2.5 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all text-sm [color-scheme:dark]"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[#F5F5DC]/50 mb-1.5 block">Available From (Time)</label>
                              <input
                                type="time"
                                value={cat.availableFromTime || ''}
                                onChange={(e) => updateTicketCategory(cat.id, 'availableFromTime', e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-2.5 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all text-sm [color-scheme:dark]"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-[#F5F5DC]/50 mb-1.5 block">Available Until (Date)</label>
                              <input
                                type="date"
                                value={cat.availableUntilDate || ''}
                                onChange={(e) => updateTicketCategory(cat.id, 'availableUntilDate', e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-2.5 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all text-sm [color-scheme:dark]"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[#F5F5DC]/50 mb-1.5 block">Available Until (Time)</label>
                              <input
                                type="time"
                                value={cat.availableUntilTime || ''}
                                onChange={(e) => updateTicketCategory(cat.id, 'availableUntilTime', e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-2.5 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all text-sm [color-scheme:dark]"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 rounded-xl border border-[#2A2A2A] bg-[#111111] p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-[#E5A823]">Per-ticket Money Flow</h3>
                            <span className="text-[11px] text-[#F5F5DC]/50">{cat.name || `Category ${index + 1}`}</span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                            <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                              <p className="text-[10px] text-[#F5F5DC]/50">Base + GST</p>
                              <p className="text-sm font-bold text-[#F5F5DC]">{fmt(customerPays)}</p>
                            </div>
                            <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                              <p className="text-[10px] text-[#F5F5DC]/50">PG Fee</p>
                              <p className="text-sm font-bold text-[#F5F5DC]">{fmt(pgFee)}</p>
                            </div>
                            <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                              <p className="text-[10px] text-[#F5F5DC]/50">Platform Fee</p>
                              <p className="text-sm font-bold text-[#F5F5DC]">{fmt(platformFeeAmt)}</p>
                            </div>
                            <div className="rounded-lg border border-[#3E83B6]/50 bg-[#3E83B6]/10 p-2">
                              <p className="text-[10px] text-[#3E83B6]">Outlet Net</p>
                              <p className="text-sm font-bold text-[#3E83B6]">{fmt(outletNet)}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                              <label className="text-[11px] text-[#F5F5DC]/60">Discount for Customer %</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={cat.discount || ''}
                                onChange={(e) => updateTicketCategory(cat.id, 'discount', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                                className="mt-1 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                              />
                              <p className="text-[10px] text-[#F5F5DC]/50 mt-1">Amount: {fmt(discountAmt)}</p>
                            </div>

                            <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-[11px] text-[#F5F5DC]/60">Enable GST</label>
                                <input
                                  type="checkbox"
                                  checked={(cat.gstPercent || 0) > 0}
                                  onChange={(e) => updateTicketCategory(cat.id, 'gstPercent', e.target.checked ? (cat.gstPercent || 5) : 0)}
                                  className="h-4 w-4 rounded border-[#2A2A2A] bg-[#2A2A2A] text-[#E5A823] focus:ring-[#E5A823]"
                                />
                              </div>
                              {(cat.gstPercent || 0) > 0 ? (
                                <>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={cat.gstPercent || ''}
                                    onChange={(e) => updateTicketCategory(cat.id, 'gstPercent', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                                    className="mt-1 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <p className="text-[10px] text-[#F5F5DC]/50 mt-1">GST Amount: {fmt(gstAmt)}</p>
                                </>
                              ) : (
                                <p className="text-[10px] text-[#F5F5DC]/50 mt-1">GST disabled</p>
                              )}
                            </div>

                            <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                              <label className="text-[11px] text-[#F5F5DC]/60">Discount for Artist / Influencer %</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={cat.artistShare || ''}
                                onChange={(e) => updateTicketCategory(cat.id, 'artistShare', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                                className="mt-1 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                              />
                              <p className="text-[10px] text-[#F5F5DC]/50 mt-1">Artist Amount: {fmt(artistAmt)}</p>
                            </div>

                            <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                              <label className="text-[11px] text-[#F5F5DC]/60">Payment Gateway Fees %</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={cat.paymentGatewayFee ?? 5}
                                onChange={(e) => updateTicketCategory(cat.id, 'paymentGatewayFee', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                                className="mt-1 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                              />
                              <p className="text-[10px] text-[#F5F5DC]/50 mt-1">Amount: {fmt(pgFee)}</p>
                            </div>

                            <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                              <label className="text-[11px] text-[#F5F5DC]/60">Platform Fees %</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={cat.platformFee ?? 0}
                                onChange={(e) => updateTicketCategory(cat.id, 'platformFee', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                                className="mt-1 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                              />
                              <p className="text-[10px] text-[#F5F5DC]/50 mt-1">Amount: {fmt(platformFeeAmt)}</p>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-[#F5F5DC]/50">
                            Influencer Amount: {fmt(influencerAmt)}
                          </div>
                        </div>
                      </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Coupon Configuration Card */}
            <motion.div
              className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.35 }}
            >
              <div className="p-5 border-b border-[#2A2A2A] bg-[#1A1A1A]/50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-[#E5A823]" />
                    <h2 className="font-semibold text-[#F5F5DC]">Coupon Configuration</h2>
                    <span className="text-xs text-[#F5F5DC]/45">Optional</span>
                  </div>
                  <button
                    type="button"
                    onClick={generateUniqueCode}
                    className="px-3 py-1.5 text-xs rounded-lg bg-[#E5A823]/20 text-[#E5A823] hover:bg-[#E5A823]/30 transition-colors"
                  >
                    Generate Code
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Coupon Code</label>
                    <input
                      type="text"
                      name="couponCode"
                      value={promoForm.couponCode}
                      onChange={(e) =>
                        setPromoForm((prev) => ({
                          ...prev,
                          couponCode: e.target.value.toUpperCase().replace(/\s+/g, ''),
                        }))
                      }
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all"
                      placeholder="e.g. ADMIN20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Discount %</label>
                    <input
                      type="number"
                      name="couponDiscountPercent"
                      value={promoForm.couponDiscountPercent}
                      onChange={handlePromoInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all"
                      min={1}
                      max={100}
                      placeholder="e.g. 20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Source Type</label>
                    <select
                      name="sourceType"
                      value={promoForm.sourceType}
                      onChange={handlePromoInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all"
                    >
                      <option value="outlet">Outlet</option>
                      <option value="artist">Artist</option>
                      <option value="promoter">Promoter</option>
                      <option value="influencer">Influencer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Source Ref ID</label>
                    <input
                      type="text"
                      name="sourceRefId"
                      value={promoForm.sourceRefId}
                      onChange={handlePromoInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Source Name</label>
                    <input
                      type="text"
                      name="sourceRefName"
                      value={promoForm.sourceRefName}
                      onChange={handlePromoInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Starts At</label>
                    <input
                      type="datetime-local"
                      name="startsAt"
                      value={promoForm.startsAt}
                      onChange={handlePromoInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Ends At</label>
                    <input
                      type="datetime-local"
                      name="endsAt"
                      value={promoForm.endsAt}
                      onChange={handlePromoInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F5F5DC]/80 mb-2">Max Uses</label>
                    <input
                      type="number"
                      name="maxUses"
                      value={promoForm.maxUses}
                      onChange={handlePromoInputChange}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] transition-all"
                      min={1}
                      placeholder="Optional"
                    />
                  </div>
                </div>
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
