'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import DragDropUpload from '@/components/ui/DragDropUpload';
import { uploadFileDirectToSupabase } from '@/lib/browser-storage';

type BrowseCategory = { name: string; icon: string; subFilters: string[] };
type BrowseLocationCity = { name: string; icon: string; areas: string[] };
type BrowseLocationState = { state: string; cities: BrowseLocationCity[] };

const OTHER_CATEGORY_OPTION = '__other_category__';
const OTHER_SUBCATEGORY_OPTION = '__other_subcategory__';
const OTHER_AREA_OPTION = '__other_area__';
const OTHER_STATE_OPTION = '__other_state__';
const OTHER_DISTRICT_OPTION = '__other_district__';

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

function SellerFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editEventId = (searchParams.get('editEventId') || '').trim();
  const returnToParam = (searchParams.get('returnTo') || '').trim();
  const isEditMode = Boolean(editEventId);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    fullDescription: '',
    price: '',
    organizer: '',
    location: '',
    locationState: '',
    locationDistrict: '',
    locationArea: '',
    googleMapsLink: '',
    date: '',
    startTime: '',
    endTime: '',
    gatesOpen: '',
    entryAge: '',
    layout: '',
    seating: '',
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
    couponCode: '',
    couponDiscountPercent: '',
    sourceType: 'outlet' as 'outlet' | 'artist' | 'promoter' | 'influencer',
    sourceRefId: '',
    sourceRefName: '',
    startsAt: '',
    endsAt: '',
    maxUses: '',
  });
  const [promoRequests, setPromoRequests] = useState<Array<{ id: number; eventTitle: string; code: string; status: string }>>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketCategories, setTicketCategories] = useState<Array<{ 
    id: string; 
    name: string; 
    tagline?: string;
    price: number; 
    originalPrice?: number; 
    quantity: number; 
    availableFromDate?: string; 
    availableFromTime?: string; 
    availableUntilDate?: string; 
    availableUntilTime?: string;
    discount: number;
    platformFee: number;
    paymentGatewayFee: number;
    gstPercent: number;
    artistShare: number;
    influencerShare: number;
  }>>([]);
  const [categories, setCategories] = useState<BrowseCategory[]>([]);
  const [locationFilters, setLocationFilters] = useState<BrowseLocationState[]>([]);
  const [rules, setRules] = useState<Array<{ id: string; text: string }>>([{ id: '1', text: '' }]);
  const [customCategory, setCustomCategory] = useState('');
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [customArea, setCustomArea] = useState('');
  const [customState, setCustomState] = useState('');
  const [customDistrict, setCustomDistrict] = useState('');
  
  // Artists state
  const [artists, setArtists] = useState<Array<{ id: string; email: string; name: string | null; role: string }>>([]);
  const [selectedArtists, setSelectedArtists] = useState<Array<{ id: string; email: string; name: string | null }>>([]);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [showArtistDropdown, setShowArtistDropdown] = useState(false);
  const artistDropdownRef = useRef<HTMLDivElement>(null);

  const normalizeCategoryName = (value: string) => value.trim().replace(/\s+/g, ' ');

  const normalizeCategories = (raw: unknown): BrowseCategory[] => {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const name = typeof record.name === 'string' ? normalizeCategoryName(record.name) : '';
        if (!name) return null;
        const icon = typeof record.icon === 'string' && record.icon.trim() ? record.icon : 'Tag';
        const subFilters = Array.isArray(record.subFilters)
          ? record.subFilters.filter((sub): sub is string => typeof sub === 'string').map((sub) => normalizeCategoryName(sub)).filter(Boolean)
          : [];
        return { name, icon, subFilters };
      })
      .filter((item): item is BrowseCategory => item !== null);
  };

  const dedupeCategories = (items: BrowseCategory[]): BrowseCategory[] => {
    const categoryMap = new Map<string, BrowseCategory>();

    items.forEach((item) => {
      const key = item.name.toLowerCase();
      const existing = categoryMap.get(key);

      if (!existing) {
        categoryMap.set(key, {
          name: item.name,
          icon: item.icon || 'Tag',
          subFilters: Array.from(new Set(item.subFilters.map((sub) => normalizeCategoryName(sub)).filter(Boolean))),
        });
        return;
      }

      const mergedSubFilters = Array.from(
        new Set([...existing.subFilters, ...item.subFilters].map((sub) => normalizeCategoryName(sub)).filter(Boolean))
      );

      categoryMap.set(key, {
        name: existing.name,
        icon: existing.icon || item.icon || 'Tag',
        subFilters: mergedSubFilters,
      });
    });

    return Array.from(categoryMap.values());
  };

  const normalizeLocationFilters = (raw: unknown): BrowseLocationState[] => {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const state = typeof record.state === 'string' ? normalizeCategoryName(record.state) : '';
        const cities = Array.isArray(record.cities)
          ? record.cities
              .map((city) => {
                if (!city || typeof city !== 'object') return null;
                const cityRecord = city as Record<string, unknown>;
                const name = typeof cityRecord.name === 'string' ? normalizeCategoryName(cityRecord.name) : '';
                if (!name) return null;
                const icon = typeof cityRecord.icon === 'string' && cityRecord.icon.trim() ? cityRecord.icon : 'MapPin';
                const areas = Array.isArray(cityRecord.areas)
                  ? cityRecord.areas
                      .filter((area): area is string => typeof area === 'string')
                      .map((area) => normalizeCategoryName(area))
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

  const parseTimeRange = (value?: string): { startTime: string; endTime: string } => {
    if (!value) return { startTime: '', endTime: '' };
    const segments = value
      .split(/\s*-\s*/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    return {
      startTime: segments[0] || value,
      endTime: segments[1] || '',
    };
  };

  const splitDateAndTime = (value?: string): { date?: string; time?: string } => {
    if (!value) return {};
    const normalized = String(value).trim();
    if (!normalized) return {};

    const directMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
    if (directMatch) {
      return { date: directMatch[1], time: directMatch[2] };
    }

    const dateOnlyMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateOnlyMatch) {
      return { date: dateOnlyMatch[1] };
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return {};

    const iso = parsed.toISOString();
    return {
      date: iso.slice(0, 10),
      time: iso.slice(11, 16),
    };
  };

  const getMediaTypeFromUrl = (url: string): string => {
    if (/\.(mp4|webm|ogg|mov|m4v|avi)(\?|#|$)/i.test(url)) {
      return 'video/mp4';
    }
    return 'image/jpeg';
  };

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
          const adminFiltersResponse = await fetch('/api/admin/filters', { cache: 'no-store' });
          if (adminFiltersResponse.ok) {
            const data = await adminFiltersResponse.json();
            setCategories(normalizeCategories(data?.filters?.categories || []));
            setLocationFilters(normalizeLocationFilters(data?.filters?.locationFilters || []));
          } else {
            setCategories([]);
            setLocationFilters([]);
          }
        } catch (e) {
          console.error('Error loading categories:', e);
          setCategories([]);
          setLocationFilters([]);
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

  const resolveCategorySelection = (rawCategory?: unknown, rawSubcategory?: unknown) => {
    const normalizedCategory = normalizeCategoryName(typeof rawCategory === 'string' ? rawCategory : '');
    const normalizedSubcategory = normalizeCategoryName(typeof rawSubcategory === 'string' ? rawSubcategory : '');

    if (!normalizedCategory) {
      return {
        categorySelection: '',
        subcategorySelection: '',
        categoryCustomValue: '',
        subcategoryCustomValue: '',
      };
    }

    const matchedCategory = categories.find(
      (cat) => cat.name.toLowerCase() === normalizedCategory.toLowerCase()
    );

    if (!matchedCategory) {
      return {
        categorySelection: OTHER_CATEGORY_OPTION,
        subcategorySelection: normalizedSubcategory ? OTHER_SUBCATEGORY_OPTION : '',
        categoryCustomValue: normalizedCategory,
        subcategoryCustomValue: normalizedSubcategory,
      };
    }

    const matchedSubcategory = matchedCategory.subFilters.find(
      (sub) => sub.toLowerCase() === normalizedSubcategory.toLowerCase()
    );

    return {
      categorySelection: matchedCategory.name,
      subcategorySelection: normalizedSubcategory
        ? matchedSubcategory || OTHER_SUBCATEGORY_OPTION
        : '',
      categoryCustomValue: '',
      subcategoryCustomValue:
        normalizedSubcategory && !matchedSubcategory ? normalizedSubcategory : '',
    };
  };

  const resolveLocationSelection = (rawDistrict?: unknown, rawArea?: unknown, rawState?: unknown) => {
    const normalizedState = normalizeCategoryName(typeof rawState === 'string' ? rawState : '');
    const normalizedDistrict = normalizeCategoryName(typeof rawDistrict === 'string' ? rawDistrict : '');
    const normalizedArea = normalizeCategoryName(typeof rawArea === 'string' ? rawArea : '');

    if (!normalizedDistrict && !normalizedState) {
      return {
        districtSelection: '',
        areaSelection: '',
        stateSelection: '',
        customAreaValue: '',
        customStateValue: '',
        customDistrictValue: '',
      };
    }

    // Handle state resolution
    let resolvedState = '';
    let customStateValue = '';
    if (normalizedState) {
      const matchedState = locationFilters.find((state) =>
        state.state.toLowerCase() === normalizedState.toLowerCase()
      );
      if (matchedState) {
        resolvedState = matchedState.state;
      } else {
        resolvedState = OTHER_STATE_OPTION;
        customStateValue = normalizedState;
      }
    }

    // Handle district resolution
    let resolvedDistrict = '';
    let customDistrictValue = '';
    if (normalizedDistrict) {
      const stateToSearch = resolvedState === OTHER_STATE_OPTION ? null : locationFilters.find(state => state.state === resolvedState);
      const matchedDistrict = stateToSearch?.cities.find(
        (city) => city.name.toLowerCase() === normalizedDistrict.toLowerCase()
      );

      if (matchedDistrict) {
        resolvedDistrict = matchedDistrict.name;
      } else {
        resolvedDistrict = OTHER_DISTRICT_OPTION;
        customDistrictValue = normalizedDistrict;
      }
    }

    // Handle area resolution
    let resolvedArea = '';
    let customAreaValue = '';
    if (normalizedArea) {
      const stateToSearch = resolvedState === OTHER_STATE_OPTION ? null : locationFilters.find(state => state.state === resolvedState);
      const districtToSearch = resolvedDistrict === OTHER_DISTRICT_OPTION ? null : stateToSearch?.cities.find(
        (city) => city.name === resolvedDistrict
      );
      const matchedArea = districtToSearch?.areas.find(
        (area) => area.toLowerCase() === normalizedArea.toLowerCase()
      );

      if (matchedArea) {
        resolvedArea = matchedArea;
      } else {
        resolvedArea = OTHER_AREA_OPTION;
        customAreaValue = normalizedArea;
      }
    }

    return {
      districtSelection: resolvedDistrict,
      areaSelection: resolvedArea,
      stateSelection: resolvedState,
      customAreaValue,
      customStateValue,
      customDistrictValue,
    };
  };

  useEffect(() => {
    if (!isEditMode || !editEventId) return;

    let isCancelled = false;

    const loadEventForEdit = async () => {
      try {
        const response = await fetch(`/api/events/${encodeURIComponent(editEventId)}`, {
          cache: 'no-store',
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load event for editing.');
        }

        const event = payload?.event as Record<string, unknown> | undefined;
        if (!event || isCancelled) return;

        const eventTime = parseTimeRange(typeof event.time === 'string' ? event.time : '');

        const categorySelection = resolveCategorySelection(event.category, event.subcategory);
        const locationSelection = resolveLocationSelection(event.locationDistrict, event.locationArea, event.locationState);

        setFormData((prev) => ({
          ...prev,
          title: typeof event.title === 'string' ? event.title : '',
          subtitle: typeof event.subtitle === 'string' ? event.subtitle : '',
          description: typeof event.description === 'string' ? event.description : (typeof event.subtitle === 'string' ? event.subtitle : ''),
          fullDescription: typeof event.fullDescription === 'string' ? event.fullDescription : (typeof event.description === 'string' ? event.description : ''),
          price: typeof event.price === 'string' ? event.price : '',
          organizer: typeof event.promoterName === 'string' ? event.promoterName : '',
          location: typeof event.venue === 'string' ? event.venue : '',
          locationState: locationSelection.stateSelection,
          locationDistrict: locationSelection.districtSelection,
          locationArea: locationSelection.areaSelection,
          date: typeof event.date === 'string' ? event.date : '',
          startTime: eventTime.startTime,
          endTime: eventTime.endTime,
          about:
            (typeof event.about === 'string' && event.about) || (typeof event.fullDescription === 'string' && event.fullDescription) ||
            (typeof event.description === 'string' ? event.description : ''),
          googleMapsLink: typeof event.googleMapsLink === 'string' ? event.googleMapsLink : '',
          gatesOpen: typeof event.gatesOpen === 'string' ? event.gatesOpen : (eventTime.startTime || ''),
          entryAge: typeof event.entryAge === 'string' ? event.entryAge : '',
          layout: typeof event.layout === 'string' ? event.layout : '',
          seating: typeof event.seating === 'string' ? event.seating : '',
          category: categorySelection.categorySelection,
          subcategory: categorySelection.subcategorySelection,
        }));

        setCustomCategory(categorySelection.categoryCustomValue);
        setCustomSubcategory(categorySelection.subcategoryCustomValue);
        setCustomState(locationSelection.customStateValue);
        setCustomDistrict(locationSelection.customDistrictValue);
        setCustomArea(locationSelection.customAreaValue);

        const eventRules = Array.isArray(event.rules)
          ? (event.rules as unknown[])
              .filter((rule): rule is string => typeof rule === 'string')
              .map((rule, index) => ({ id: `${index + 1}-${Math.random().toString(36).slice(2, 7)}`, text: rule }))
          : [];
        setRules(eventRules.length > 0 ? eventRules : [{ id: '1', text: '' }]);

        const taggedArtistsRaw = Array.isArray(event.taggedArtists)
          ? (event.taggedArtists as Array<Record<string, unknown>>)
          : [];
        setSelectedArtists(
          taggedArtistsRaw
            .map((artist) => ({
              id: typeof artist.id === 'string' ? artist.id : '',
              email: typeof artist.email === 'string' ? artist.email : '',
              name: typeof artist.name === 'string' ? artist.name : null,
            }))
            .filter((artist) => Boolean(artist.id))
        );

        const imageList = Array.isArray(event.images)
          ? (event.images as unknown[]).filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
          : [];
        const mediaList = Array.isArray(event.mediaFiles)
          ? (event.mediaFiles as unknown[]).filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
          : [];
        const mergedMedia = Array.from(new Set([...imageList, ...mediaList]));
        setMediaFileUrls(
          mergedMedia.map((url, index) => ({
            url,
            type: getMediaTypeFromUrl(url),
            name: `existing-${index + 1}`,
          }))
        );
        setCoverImageUrl(typeof event.image === 'string' ? event.image : imageList[0] || '');
        setCoverImage(null);
        setMediaFiles([]);

        const firstRule = Array.isArray(event.couponRules)
          ? (event.couponRules as Array<Record<string, unknown>>)[0]
          : null;

        setPromoForm((prev) => ({
          ...prev,
          couponCode: typeof firstRule?.code === 'string' ? firstRule.code : '',
          couponDiscountPercent:
            firstRule?.discountPercent != null ? String(firstRule.discountPercent) : '',
          sourceType:
            firstRule?.sourceType === 'artist' ||
            firstRule?.sourceType === 'promoter' ||
            firstRule?.sourceType === 'influencer'
              ? firstRule.sourceType
              : 'outlet',
          sourceRefId: typeof firstRule?.sourceId === 'string' ? firstRule.sourceId : '',
          sourceRefName: typeof firstRule?.sourceName === 'string' ? firstRule.sourceName : '',
          startsAt: typeof firstRule?.startsAt === 'string' ? firstRule.startsAt.slice(0, 16) : '',
          endsAt: typeof firstRule?.endsAt === 'string' ? firstRule.endsAt.slice(0, 16) : '',
          maxUses: firstRule?.maxUses != null ? String(firstRule.maxUses) : '',
        }));

        const mappedTicketCategories = Array.isArray(event.ticketCategories)
          ? (event.ticketCategories as Array<Record<string, unknown>>).map((cat, index) => {
              const availableFrom = splitDateAndTime(
                typeof cat.availableFrom === 'string' ? cat.availableFrom : undefined
              );
              const availableUntil = splitDateAndTime(
                typeof cat.availableUntil === 'string' ? cat.availableUntil : undefined
              );

              return {
                id: typeof cat.id === 'string' && cat.id ? cat.id : `ticket-${index + 1}`,
                name: typeof cat.name === 'string' ? cat.name : `CATEGORY-${index + 1}`,
                tagline: typeof cat.tagline === 'string' ? cat.tagline : '',
                price: Number(cat.price || 0),
                originalPrice:
                  cat.originalPrice != null && Number.isFinite(Number(cat.originalPrice))
                    ? Number(cat.originalPrice)
                    : Number(cat.price || 0),
                quantity: Number(cat.quantity || 0),
                availableFromDate: availableFrom.date,
                availableFromTime: availableFrom.time,
                availableUntilDate: availableUntil.date,
                availableUntilTime: availableUntil.time,
                discount: Number(cat.discount || 0),
                platformFee: Number(cat.platformFee || 5),
                paymentGatewayFee: Number(cat.paymentGatewayFee || 5),
                gstPercent: Number(cat.gstPercent || 0),
                artistShare: Number(cat.artistShare || 0),
                influencerShare: Number(cat.influencerShare || 0),
              };
            })
          : [];

        if (mappedTicketCategories.length > 0) {
          setTicketCategories(mappedTicketCategories);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load event for editing.';
        setNotificationMessage(message);
        setShowNotification(true);
      }
    };

    loadEventForEdit();

    return () => {
      isCancelled = true;
    };
  }, [isEditMode, editEventId]);

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

  const parseDateTime = (dateValue?: string, timeValue?: string) => {
    if (!dateValue) return null;
    const timePart = timeValue || '00:00';
    const parsed = new Date(`${dateValue}T${timePart}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isFutureDateTime = (dateValue?: string, timeValue?: string) => {
    const parsed = parseDateTime(dateValue, timeValue);
    return Boolean(parsed && parsed.getTime() > Date.now());
  };

  const validateDateTimeRange = (startDate?: string, startTime?: string, endDate?: string, endTime?: string) => {
    const start = parseDateTime(startDate, startTime);
    if (!start) return 'Please enter a valid event date and start time.';

    if (start.getTime() <= Date.now()) {
      return 'Event date and start time must be in the future.';
    }

    if (endDate || endTime) {
      if (!endDate || !endTime) {
        return 'Please provide both end date and end time.';
      }
      const end = parseDateTime(endDate, endTime);
      if (!end) return 'Please enter a valid end date and end time.';
      if (end.getTime() <= Date.now()) return 'End date and end time must be in the future.';
      if (end < start) return 'End time must be after the start time.';
    }

    return '';
  };

  const validateTicketCategoryTimes = () => {
    for (const cat of ticketCategories) {
      const hasFromDate = Boolean(cat.availableFromDate);
      const hasFromTime = Boolean(cat.availableFromTime);
      const hasUntilDate = Boolean(cat.availableUntilDate);
      const hasUntilTime = Boolean(cat.availableUntilTime);

      if ((hasFromDate || hasFromTime) && (!hasFromDate || !hasFromTime)) {
        return `Ticket category ${cat.name || 'Unnamed'} requires both available-from date and time.`;
      }

      if ((hasUntilDate || hasUntilTime) && (!hasUntilDate || !hasUntilTime)) {
        return `Ticket category ${cat.name || 'Unnamed'} requires both available-until date and time.`;
      }

      if (hasFromDate && hasFromTime && hasUntilDate && hasUntilTime) {
        const from = parseDateTime(cat.availableFromDate, cat.availableFromTime);
        const until = parseDateTime(cat.availableUntilDate, cat.availableUntilTime);
        if (!from || !until) {
          return `Ticket category ${cat.name || 'Unnamed'} has an invalid availability date/time.`;
        }
        if (from.getTime() <= Date.now()) {
          return `Ticket category ${cat.name || 'Unnamed'} availability start must be in the future.`;
        }
        if (until.getTime() <= Date.now()) {
          return `Ticket category ${cat.name || 'Unnamed'} availability end must be in the future.`;
        }
        if (until < from) {
          return `Ticket category ${cat.name || 'Unnamed'} must end after it starts.`;
        }
      }
    }

    return '';
  };

  const generateUniqueCode = () => {
    const prefix = 'SELLER';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}${random}`;
    setPromoForm(prev => ({ ...prev, couponCode: code }));
  };

  const handleSendEventRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedCategory = normalizeCategoryName(
      formData.category === OTHER_CATEGORY_OPTION ? customCategory : formData.category
    );
    const resolvedSubcategory = normalizeCategoryName(
      formData.subcategory === OTHER_SUBCATEGORY_OPTION ? customSubcategory : formData.subcategory
    );
    const resolvedState = normalizeCategoryName(
      formData.locationState === OTHER_STATE_OPTION ? customState : formData.locationState
    );
    const resolvedDistrict = normalizeCategoryName(
      formData.locationDistrict === OTHER_DISTRICT_OPTION ? customDistrict : formData.locationDistrict
    );
    const resolvedArea = normalizeCategoryName(
      formData.locationArea === OTHER_AREA_OPTION ? customArea : formData.locationArea
    );

    if (!resolvedCategory) {
      setNotificationMessage('Please select or enter a valid category.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      return;
    }

    if (!resolvedSubcategory) {
      setNotificationMessage('Please select or enter a valid subcategory.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      return;
    }

    // Validate required fields
    if (!formData.title || !formData.date || !formData.startTime || !formData.location) {
      setNotificationMessage('Please fill in all required fields (Title, Date, Start Time, Location)');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      return;
    }

    if (!resolvedState || !resolvedDistrict || !resolvedArea) {
      setNotificationMessage('Please select or enter a valid state, district and area.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      return;
    }

    const eventDateTimeError = validateDateTimeRange(formData.date, formData.startTime, formData.date, formData.endTime);
    if (eventDateTimeError) {
      setNotificationMessage(eventDateTimeError);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      return;
    }

    const ticketTimeError = validateTicketCategoryTimes();
    if (ticketTimeError) {
      setNotificationMessage(ticketTimeError);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      return;
    }

    if (promoForm.couponCode && !promoForm.couponDiscountPercent) {
      setNotificationMessage('Please enter a discount percentage for the promo code.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
      return;
    }

    if (promoForm.couponDiscountPercent) {
      const parsedDiscount = Number(promoForm.couponDiscountPercent);
      if (!Number.isFinite(parsedDiscount) || parsedDiscount <= 0 || parsedDiscount > 100) {
        setNotificationMessage('Discount percentage must be between 1 and 100.');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
        return;
      }
    }

    if (promoForm.maxUses) {
      const parsedMaxUses = Number(promoForm.maxUses);
      if (!Number.isInteger(parsedMaxUses) || parsedMaxUses <= 0) {
        setNotificationMessage('Max uses must be a positive whole number.');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
        return;
      }
    }

    if (promoForm.startsAt && promoForm.endsAt) {
      const startAt = new Date(promoForm.startsAt).getTime();
      const endAt = new Date(promoForm.endsAt).getTime();
      if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) {
        setNotificationMessage('Coupon end time must be after start time.');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
        return;
      }
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
        subtitle: formData.subtitle || formData.description,
        date: formData.date,
        time: formData.startTime,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.location,
        locationState: resolvedState || undefined,
        locationDistrict: resolvedDistrict || undefined,
        locationArea: resolvedArea || undefined,
        category: resolvedCategory || 'General',
        subcategory: resolvedSubcategory || undefined,
        price: `₹${minPrice}`,
        image: coverImageUrlToUse,
        googleMapsLink: formData.googleMapsLink || undefined,
        numberOfTickets: ticketCategories.reduce((sum, cat) => sum + (cat.quantity || 0), 0),
        mediaFiles: mediaFilesBase64,
        description: formData.about || formData.description,
        fullDescription: formData.fullDescription || formData.about || formData.description,
        gatesOpen: formData.gatesOpen || formData.startTime,
        entryAge: formData.entryAge || '18+',
        layout: formData.layout || 'Standing',
        seating: formData.seating || 'General Admission',
        rules: rules.filter(r => r.text.trim()).map(r => r.text),
        taggedArtists: selectedArtists.map(a => ({ id: a.id, name: a.name, email: a.email })),
        couponRules: promoForm.couponCode ? [
          {
            code: promoForm.couponCode.trim().toUpperCase(),
            discountPercent: Number(promoForm.couponDiscountPercent || 0),
            sourceType: promoForm.sourceType,
            sourceId: promoForm.sourceRefId || undefined,
            sourceName: promoForm.sourceRefName || undefined,
            startsAt: promoForm.startsAt || undefined,
            endsAt: promoForm.endsAt || undefined,
            maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : undefined,
          }
        ] : undefined,
        ticketCategories: ticketCategories.map(cat => ({
          ...cat,
          tagline: (cat.tagline || '').trim() || undefined,
          originalPrice: cat.originalPrice || cat.price,
          paymentGatewayFee: cat.paymentGatewayFee || 5,
          gstPercent: cat.gstPercent || 0,
          availableFrom: cat.availableFromDate && cat.availableFromTime 
            ? `${cat.availableFromDate}T${cat.availableFromTime}` 
            : (cat.availableFromDate || undefined),
          availableUntil: cat.availableUntilDate && cat.availableUntilTime 
            ? `${cat.availableUntilDate}T${cat.availableUntilTime}` 
            : (cat.availableUntilDate || undefined)
        }))
      };

      const requestUrl = isEditMode && editEventId ? `/api/events/${encodeURIComponent(editEventId)}` : '/api/admin/event-requests';
      const requestMethod = isEditMode ? 'PUT' : 'POST';
      const requestBody = isEditMode ? eventData : { eventData };

      const response = await fetch(requestUrl, {
        method: requestMethod,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseBody = await response.json().catch(() => ({}));

      if (response.ok) {
        const successMessage = isEditMode
          ? 'Hosted event updated successfully.'
          : 'Your request has been sent to admin for approval.';
        setNotificationMessage(successMessage);
        setShowNotification(true);

        setTimeout(() => {
          setShowNotification(false);
        }, 5000);

        if (!isEditMode) {
          const { saveHostedEvent } = await import('@/lib/hosted-events');
          await saveHostedEvent({
            id: Date.now(),
            title: formData.title,
            date: formData.date,
            venue: formData.location,
            locationState: resolvedState || undefined,
            locationDistrict: resolvedDistrict || undefined,
            locationArea: resolvedArea || undefined,
            price: `₹${minPrice}`,
            imageColor: 'bg-blue-900',
            category: resolvedSubcategory ? `${resolvedCategory} • ${resolvedSubcategory}` : resolvedCategory,
            imageUrl: coverImageUrlToUse,
            createdAt: Date.now()
          });

          setFormData({
            title: '',
            subtitle: '',
            description: '',
            fullDescription: '',
            price: '',
            organizer: '',
            location: '',
            locationState: '',
            locationDistrict: '',
            locationArea: '',
            googleMapsLink: '',
            date: '',
            startTime: '',
            endTime: '',
            gatesOpen: '',
            entryAge: '',
            layout: '',
            seating: '',
            about: '',
            rules: '',
            category: '',
            subcategory: '',
          });
          setCustomCategory('');
          setCustomSubcategory('');
          setCustomState('');
          setCustomDistrict('');
          setCustomArea('');
          setImages([]);
          setCoverImage(null);
          setMediaFiles([]);
          setCoverImageUrl('');
          setMediaFileUrls([]);
          setTicketCategories([]);
          setRules([{ id: '1', text: '' }]);
          setSelectedArtists([]);
          setArtistSearchQuery('');

          if (promoForm.couponCode) {
            const newRequest = {
              id: Date.now(),
              eventTitle: formData.title,
              code: promoForm.couponCode,
              discountPercent: promoForm.couponDiscountPercent,
              status: 'Pending'
            };
            setPromoRequests(prev => [newRequest, ...prev]);
            setPromoForm({
              eventId: '',
              couponCode: '',
              couponDiscountPercent: '',
              sourceType: 'outlet',
              sourceRefId: '',
              sourceRefName: '',
              startsAt: '',
              endsAt: '',
              maxUses: '',
            });
          }
        }

        const fallbackReturn = isEditMode ? '/outlet/profile?tab=events' : '/outlet/profile?tab=events';
        const resolvedReturnTo = returnToParam.startsWith('/') ? returnToParam : fallbackReturn;

        setTimeout(() => {
          router.push(resolvedReturnTo);
        }, 2000);
      } else {
        setNotificationMessage(responseBody?.error || 'Failed to submit event request.');
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

      const maxFileBytes = uploadFile.type.startsWith('video/')
        ? 50 * 1024 * 1024
        : uploadFile.type.startsWith('image/')
          ? 10 * 1024 * 1024
          : 25 * 1024 * 1024;

      if (uploadFile.size > maxFileBytes) {
        const sizeLabel = Math.round(maxFileBytes / (1024 * 1024));
        const unit = uploadFile.type.startsWith('video/') ? 'video' : 'file';
        setNotificationMessage(`This ${unit} is too large. Please upload a file under ${sizeLabel}MB.`);
        setShowNotification(true);
        return null;
      }

      setUploadingFiles(prev => new Set(prev).add(fileId));
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      const data = await uploadFileDirectToSupabase(uploadFile, type);
      
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

  const selectedStateFilter = locationFilters.find(
    (item) => item.state.toLowerCase() === formData.locationState.toLowerCase()
  );
  const isCategoryOtherSelected = formData.category === OTHER_CATEGORY_OPTION;
  const isSubcategoryOtherSelected = formData.subcategory === OTHER_SUBCATEGORY_OPTION;
  const selectedCategory = !isCategoryOtherSelected
    ? categories.find((cat) => cat.name.toLowerCase() === formData.category.toLowerCase())
    : undefined;
  const selectedDistrictFilter = selectedStateFilter?.cities.find(
    (city) => city.name.toLowerCase() === formData.locationDistrict.toLowerCase()
  );
  const districtOptions = selectedStateFilter?.cities || [];
  const areaOptions = selectedDistrictFilter?.areas || [];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      {/* Header */}
      <div className="bg-[#0D0D0D] border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[#E5A823]">Seller Dashboard</h1>
            <span className="text-[#F5F5DC]/50">|</span>
            <span className="text-[#F5F5DC]/70">
              {isEditMode ? 'Edit your hosted event' : 'Create and manage your events'}
            </span>
          </div>
        </div>
      </div>

      {/* Notification Toast - Glass Morphism Theme */}
      {showNotification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full mx-4">
          {(() => {
            const isSuccessMessage =
              notificationMessage.includes('sent to admin') ||
              notificationMessage.toLowerCase().includes('updated successfully');

            return (
          <div className={`p-4 rounded-xl backdrop-blur-md border shadow-2xl ${
            isSuccessMessage
              ? 'bg-[#E5A823]/90 border-[#F5C542] text-[#0D0D0D]' 
              : 'bg-[#EB4D4B]/90 border-[#FF6B6B] text-white'
          }`}>
            <div className="flex items-center gap-3">
              {isSuccessMessage ? (
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
            );
          })()}
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

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-3">Subtitle / Tagline</label>
                      <input
                        type="text"
                        name="subtitle"
                        value={formData.subtitle}
                        onChange={handleInputChange}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        placeholder="Short subtitle shown under title"
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
                          if (value !== OTHER_CATEGORY_OPTION) {
                            setCustomCategory('');
                          }
                          setCustomSubcategory('');
                        }}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        required
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                        <option value={OTHER_CATEGORY_OPTION}>Other (Add new)</option>
                      </select>
                      {isCategoryOtherSelected && (
                        <input
                          type="text"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          className="mt-3 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                          placeholder="Enter custom category"
                          required
                        />
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
                        }}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        required
                        disabled={!formData.category}
                      >
                        <option value="">
                          {!formData.category ? 'Select category first' : 'Select subcategory'}
                        </option>
                        {selectedCategory?.subFilters?.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                        {formData.category && (
                          <option value={OTHER_SUBCATEGORY_OPTION}>Other (Add new)</option>
                        )}
                      </select>
                      {(isSubcategoryOtherSelected || isCategoryOtherSelected) && (
                        <input
                          type="text"
                          value={customSubcategory}
                          onChange={(e) => setCustomSubcategory(e.target.value)}
                          className="mt-3 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                          placeholder="Enter custom subcategory"
                          required
                        />
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
                          min={new Date().toISOString().split('T')[0]}
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
                          min={formData.startTime}
                          disabled={!formData.startTime}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] disabled:opacity-50 disabled:cursor-not-allowed [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-3">Location Filters *</label>
                      {(() => {
                        const selectedStateFilter = locationFilters.find(state => state.state === formData.locationState);
                        const districtOptions = selectedStateFilter ? selectedStateFilter.cities : [];
                        const selectedDistrictFilter = selectedStateFilter?.cities.find(city => city.name === formData.locationDistrict);
                        const areaOptions = selectedDistrictFilter ? selectedDistrictFilter.areas : [];

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-[#F5F5DC]/50 mb-2">State</label>
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
                                  if (value !== OTHER_STATE_OPTION) {
                                    setCustomState('');
                                  }
                                  setCustomDistrict('');
                                  setCustomArea('');
                                }}
                                className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                required
                              >
                                <option value="">Select state</option>
                                {locationFilters.map((state) => (
                                  <option key={state.state} value={state.state}>{state.state}</option>
                                ))}
                                <option value={OTHER_STATE_OPTION}>Other (Add new)</option>
                              </select>
                              {formData.locationState === OTHER_STATE_OPTION && (
                                <input
                                  type="text"
                                  value={customState}
                                  onChange={(e) => setCustomState(e.target.value)}
                                  className="mt-3 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                  placeholder="Enter custom state"
                                  required
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-xs text-[#F5F5DC]/50 mb-2">District / City</label>
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
                                  if (value !== OTHER_DISTRICT_OPTION) {
                                    setCustomDistrict('');
                                  }
                                  setCustomArea('');
                                }}
                                className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                required
                                disabled={!selectedStateFilter && formData.locationState !== OTHER_STATE_OPTION}
                              >
                                <option value="">
                                  {!selectedStateFilter && formData.locationState !== OTHER_STATE_OPTION ? 'Select state first' : 'Select district'}
                                </option>
                                {districtOptions.map((district) => (
                                  <option key={district.name} value={district.name}>{district.name}</option>
                                ))}
                                {(selectedStateFilter || formData.locationState === OTHER_STATE_OPTION) && <option value={OTHER_DISTRICT_OPTION}>Other (Add new)</option>}
                              </select>
                              {formData.locationDistrict === OTHER_DISTRICT_OPTION && (
                                <input
                                  type="text"
                                  value={customDistrict}
                                  onChange={(e) => setCustomDistrict(e.target.value)}
                                  className="mt-3 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                  placeholder="Enter custom district"
                                  required
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-xs text-[#F5F5DC]/50 mb-2">Area</label>
                              <select
                                name="locationArea"
                                value={formData.locationArea}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setFormData((prev) => ({ ...prev, locationArea: value }));
                                  if (value !== OTHER_AREA_OPTION) {
                                    setCustomArea('');
                                  }
                                }}
                                className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                required
                                disabled={!selectedDistrictFilter && formData.locationDistrict !== OTHER_DISTRICT_OPTION}
                              >
                                <option value="">
                                  {!selectedDistrictFilter && formData.locationDistrict !== OTHER_DISTRICT_OPTION ? 'Select district first' : 'Select area'}
                                </option>
                                {areaOptions.map((area) => (
                                  <option key={area} value={area}>{area}</option>
                                ))}
                                {(selectedDistrictFilter || formData.locationDistrict === OTHER_DISTRICT_OPTION) && <option value={OTHER_AREA_OPTION}>Other (Add new)</option>}
                              </select>
                              {formData.locationArea === OTHER_AREA_OPTION && (
                                <input
                                  type="text"
                                  value={customArea}
                                  onChange={(e) => setCustomArea(e.target.value)}
                                  className="mt-3 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                  placeholder="Enter custom area"
                                  required
                                />
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      
                      <div className="mt-4 relative">
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

                {/* Extra Venue Fields (maps, gates, age, layout) */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium mb-2">Google Maps Link</label>
                    <input
                      type="url"
                      name="googleMapsLink"
                      value={formData.googleMapsLink}
                      onChange={handleInputChange}
                      placeholder="https://maps.google.com/... or venue name"
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Gates Open</label>
                    <input
                      type="text"
                      name="gatesOpen"
                      value={formData.gatesOpen}
                      onChange={handleInputChange}
                      placeholder="e.g. 21:30"
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Entry Allowed (age)</label>
                    <input
                      type="text"
                      name="entryAge"
                      value={formData.entryAge}
                      onChange={handleInputChange}
                      placeholder="e.g. 18+"
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Layout</label>
                    <input
                      type="text"
                      name="layout"
                      value={formData.layout}
                      onChange={handleInputChange}
                      placeholder="e.g. Indoor Club"
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Seating</label>
                    <input
                      type="text"
                      name="seating"
                      value={formData.seating}
                      onChange={handleInputChange}
                      placeholder="e.g. General Admission"
                      className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                    />
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
                        {ticketCategories.map((cat, idx) => {
                          const gross = cat.price || 0;
                          const discountAmt = gross * (cat.discount / 100);
                          const taxableBase = Math.max(gross - discountAmt, 0);
                          const gstAmt = taxableBase * ((cat.gstPercent || 0) / 100);
                          const customerPays = Math.max(taxableBase + gstAmt, 0);
                          const pgFee = customerPays * ((cat.paymentGatewayFee ?? 5) / 100);
                          const platformFeeAmt = customerPays * (cat.platformFee / 100);
                          const artistAmt = gross * (cat.artistShare / 100);
                          const influencerAmt = gross * (cat.influencerShare / 100);
                          const outletNet = Math.max(customerPays - pgFee - platformFeeAmt - artistAmt - influencerAmt, 0);
                          const fmt = (n: number) => `₹${n.toFixed(0)}`;

                          return (
                          <div key={cat.id} className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
                            {/* Labels Row */}
                            <div className="grid grid-cols-12 gap-3 mb-2">
                              <div className="col-span-3">
                                <label className="text-xs text-[#F5F5DC]/50">Category</label>
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs text-[#F5F5DC]/50">Tagline</label>
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs text-[#F5F5DC]/50">Quantity</label>
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs text-[#F5F5DC]/50">Sale Price (₹)</label>
                              </div>
                              <div className="col-span-2">
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
                                <input
                                  type="text"
                                  value={cat.tagline || ''}
                                  onChange={(e) => {
                                    const tagline = e.target.value;
                                    setTicketCategories((prev) =>
                                      prev.map((c) => (c.id === cat.id ? { ...c, tagline } : c))
                                    );
                                  }}
                                  className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                  placeholder="e.g. Limited offer"
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
                              <div className="col-span-2">
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
                              <div className="col-span-2">
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
                                    min={new Date().toISOString().split('T')[0]}
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
                                    min={cat.availableFromDate || new Date().toISOString().split('T')[0]}
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

                              {/* Inline Per-ticket Money Flow for this category */}
                              <div className="mt-2 rounded-xl border border-[#2A2A2A] bg-[#111111] p-3">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-sm font-bold text-[#E5A823]">Per-ticket Money Flow</h5>
                                  <span className="text-[11px] text-[#F5F5DC]/50">{cat.name || `Category ${idx + 1}`}</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                                    <p className="text-[10px] text-[#F5F5DC]/50">Base + GST</p>
                                    <p className="text-sm font-bold text-[#F5F5DC]">{fmt(customerPays)}</p>
                                  </div>
                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                                    <p className="text-[10px] text-[#F5F5DC]/50">PG Fee (5%)</p>
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                                    <label className="text-[11px] text-[#F5F5DC]/60">Discount for Customer %</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={0.5}
                                      value={cat.discount || ''}
                                      onChange={(e) => {
                                        const num = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                        setTicketCategories((prev) =>
                                          prev.map((c) => (c.id === cat.id ? { ...c, discount: num } : c))
                                        );
                                      }}
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
                                        onChange={(e) => {
                                          const gstPercent = e.target.checked ? (cat.gstPercent || 5) : 0;
                                          setTicketCategories((prev) =>
                                            prev.map((c) => (c.id === cat.id ? { ...c, gstPercent } : c))
                                          );
                                        }}
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
                                          onChange={(e) => {
                                            const gstPercent = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                            setTicketCategories((prev) =>
                                              prev.map((c) => (c.id === cat.id ? { ...c, gstPercent } : c))
                                            );
                                          }}
                                          className="mt-1 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <p className="text-[10px] text-[#F5F5DC]/50 mt-1">GST Amount: {fmt(gstAmt)}</p>
                                      </>
                                    ) : (
                                      <p className="text-[10px] text-[#F5F5DC]/50 mt-1">GST disabled</p>
                                    )}
                                  </div>

                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                                    <label className="text-[11px] text-[#F5F5DC]/60">Discount for Artist or Influencer  %</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={0.5}
                                      value={cat.artistShare || ''}
                                      onChange={(e) => {
                                        const num = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                        setTicketCategories((prev) =>
                                          prev.map((c) => (c.id === cat.id ? { ...c, artistShare: num } : c))
                                        );
                                      }}
                                      className="mt-1 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                    />
                                    <p className="text-[10px] text-[#F5F5DC]/50 mt-1">Amount: {fmt(artistAmt)}</p>
                                  </div>

                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                                    <label className="text-[11px] text-[#F5F5DC]/60">Platform Fees %</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={0.5}
                                      value={cat.influencerShare || ''}
                                      onChange={(e) => {
                                        const num = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                        setTicketCategories((prev) =>
                                          prev.map((c) => (c.id === cat.id ? { ...c, influencerShare: num } : c))
                                        );
                                      }}
                                      className="mt-1 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                    />
                                    <p className="text-[10px] text-[#F5F5DC]/50 mt-1">Amount: {fmt(influencerAmt)}</p>
                                  </div>

                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                                    <label className="text-[11px] text-[#F5F5DC]/60">Payment Gateway Fees %</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={0.5}
                                      value={cat.platformFee || ''}
                                      onChange={(e) => {
                                        const num = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                        setTicketCategories((prev) =>
                                          prev.map((c) => (c.id === cat.id ? { ...c, platformFee: num } : c))
                                        );
                                      }}
                                      className="mt-1 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                    />
                                    <p className="text-[10px] text-[#F5F5DC]/50 mt-1">Amount: {fmt(platformFeeAmt)}</p>
                                  </div>

                                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-2">
                                    <label className="text-[11px] text-[#F5F5DC]/60">Payment Gateway Fees %</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={0.5}
                                      value={cat.paymentGatewayFee || ''}
                                      onChange={(e) => {
                                        const num = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                        setTicketCategories((prev) =>
                                          prev.map((c) => (c.id === cat.id ? { ...c, paymentGatewayFee: num } : c))
                                        );
                                      }}
                                      className="mt-1 w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                                    />
                                    <p className="text-[10px] text-[#F5F5DC]/50 mt-1">Amount: {fmt(pgFee)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )})}
                        <button
                          type="button"
                          onClick={() => {
                            const id = Math.random().toString(36).slice(2);
                            setTicketCategories((prev) => [...prev, { 
                              id, 
                              name: 'NEW', 
                              tagline: '',
                              price: 0, 
                              quantity: 0,
                              discount: 0,
                              platformFee: 5,
                              paymentGatewayFee: 5,
                              gstPercent: 0,
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
                    
                    {(coverImage || coverImageUrl) && (
                      <div className="mt-6">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E5A823]/30">
                          <img 
                            src={coverImageUrl || (coverImage ? URL.createObjectURL(coverImage) : '')}
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
                    Event Images & Videos ({mediaFileUrls.length} selected)
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
                    
                    {mediaFileUrls.length > 0 && (
                      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {mediaFileUrls.map((file, index) => (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={index} 
                            className="relative aspect-square rounded-xl overflow-hidden border border-[#2A2A2A] group"
                          >
                            {file.type.startsWith('video/') ? (
                              <div className="w-full h-full bg-[#0D0D0D] flex items-center justify-center">
                                <video className="w-full h-full object-cover">
                                  <source src={file.url} type={file.type} />
                                </video>
                                <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]/50">
                                  <Video className="w-8 h-8 text-[#E5A823]" />
                                </div>
                              </div>
                            ) : (
                              <img 
                                src={file.url}
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
                    {isEditMode ? 'Update Hosted Event' : 'Submit Event Request'}
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-3">Promo Code (Optional)</label>
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          name="couponCode"
                          value={promoForm.couponCode}
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
                        name="couponDiscountPercent"
                        value={promoForm.couponDiscountPercent}
                        onChange={handlePromoInputChange}
                        className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        placeholder="e.g. 15"
                        min="1"
                        max="100"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-3">Coupon Source Type</label>
                        <select
                          name="sourceType"
                          value={promoForm.sourceType}
                          onChange={handlePromoInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        >
                          <option value="outlet">Outlet</option>
                          <option value="artist">Artist</option>
                          <option value="promoter">Promoter</option>
                          <option value="influencer">Influencer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3">Max Uses (Optional)</label>
                        <input
                          type="number"
                          name="maxUses"
                          value={promoForm.maxUses}
                          onChange={handlePromoInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                          placeholder="e.g. 100"
                          min="1"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-3">Source Ref ID (Optional)</label>
                        <input
                          type="text"
                          name="sourceRefId"
                          value={promoForm.sourceRefId}
                          onChange={handlePromoInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                          placeholder="User UUID or internal reference"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3">Source Name (Optional)</label>
                        <input
                          type="text"
                          name="sourceRefName"
                          value={promoForm.sourceRefName}
                          onChange={handlePromoInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                          placeholder="Artist/Influencer display name"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-3">Coupon Starts At (Optional)</label>
                        <input
                          type="datetime-local"
                          name="startsAt"
                          value={promoForm.startsAt}
                          onChange={handlePromoInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3">Coupon Ends At (Optional)</label>
                        <input
                          type="datetime-local"
                          name="endsAt"
                          value={promoForm.endsAt}
                          onChange={handlePromoInputChange}
                          className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#E5A823]/20 bg-[#E5A823]/10 p-4">
                      <p className="text-sm text-[#F5F5DC]/80">
                        <strong className="text-[#E5A823]">Review your event:</strong>{' '}
                        {isEditMode
                          ? 'Make sure all details are correct before updating your hosted event.'
                          : 'Make sure all details are correct in the Basic Details and Media tabs before submitting.'}
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
                            {isEditMode ? 'Update Event' : 'Send Request'}
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
                  {isEditMode
                    ? 'Complete all sections, then go to the Promo Codes tab and click "Update Event" to save changes.'
                    : 'Complete all sections, then go to the Promo Codes tab and click "Send Request" to submit your event for admin approval.'}
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

export default function SellerFormPageRoute() {
  return (
    <Suspense fallback={null}>
      <SellerFormPage />
    </Suspense>
  );
}
