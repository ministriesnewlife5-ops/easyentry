'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Tag, Mic, PartyPopper, Disc, Smile, Drama, Palette, Building2, LucideIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PublicEventCard } from '@/lib/public-events-store';

type Category = {
  name: string;
  icon: string;
  iconImage?: string;
  subFilters: string[];
};

type MainFilter = {
  name: string;
  icon: string;
  iconImage?: string;
  href?: string;
};

type CityFilter = {
  name: string;
  icon: string;
  iconImage?: string;
  areas: string[];
};

type BrowseFiltersData = {
  mainFilters: MainFilter[];
  categories: Category[];
  cityFilters: CityFilter[];
};

const STORAGE_KEY = 'easyentry.browse-filters';

const iconMap: Record<string, LucideIcon> = {
  MapPin, Calendar, Tag, Mic, PartyPopper, Disc, Smile, Drama, Palette, Building2
};

const defaultFilters: BrowseFiltersData = {
  mainFilters: [
    { name: 'CHENNAI', icon: 'MapPin' },
    { name: 'DATE', icon: 'Calendar' },
    { name: 'PRICE', icon: 'Tag' },
    { name: 'ARTIST', icon: 'Tag', href: '/artist' },
    { name: 'VENUES', icon: 'Building2', href: '/venues' },
  ],
  categories: [
    { name: 'Gigs', icon: 'Mic', subFilters: ['Alternative', 'Afropop', 'Alt-rock', 'Black metal', 'Britpop', 'Celtic', 'Chamber pop', 'Chiptune', 'Cumbia', 'Dance'] },
    { name: 'Party', icon: 'PartyPopper', subFilters: ['House', 'Techno', 'Trance', 'Drum & Bass', 'Dubstep', 'EDM', 'Garage', 'Disco', 'Funk', 'Soul'] },
    { name: 'DJ', icon: 'Disc', subFilters: ['Hip Hop', 'R&B', 'Reggaeton', 'Latin', 'Jazz', 'Blues', 'Folk', 'Country', 'Electronic', 'Ambient'] },
    { name: 'Comedy', icon: 'Smile', subFilters: ['Stand-up', 'Improv', 'Sketch', 'Dark Comedy', 'Satire', 'Observational', 'Slapstick', 'Musical Comedy', 'Romantic Comedy'] },
    { name: 'Theatre', icon: 'Drama', subFilters: ['Drama', 'Musical', 'Opera', 'Ballet', 'Contemporary', 'Experimental', 'Immersive', 'Street Theatre', 'Puppetry', 'Mime'] },
    { name: 'Art', icon: 'Palette', subFilters: ['Painting', 'Sculpture', 'Photography', 'Digital Art', 'Installation', 'Performance Art', 'Mixed Media', 'Printmaking', 'Ceramics', 'Textiles'] },
  ],
  cityFilters: [
    {
      name: 'Chennai',
      icon: 'MapPin',
      areas: [
        'Adyar', 'Anna Nagar', 'Besant Nagar', 'Chrompet', 'Egmore',
        'Guindy', 'Kilpauk', 'Kodambakkam', 'Mylapore', 'Nungambakkam',
        'OMR (IT Corridor)', 'Parrys', 'Perambur', 'Royapettah', 'Saidapet',
        'T Nagar', 'Tambaram', 'Teynampet', 'Thiruvanmiyur', 'Velachery',
        'Vadapalani', 'West Mambalam', 'Pallavaram', 'Alwarpet', 'Ashok Nagar'
      ]
    }
  ],
};

function getStoredFilters(): BrowseFiltersData {
  if (typeof window === 'undefined') return defaultFilters;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        mainFilters: parsed.mainFilters || defaultFilters.mainFilters,
        categories: parsed.categories || defaultFilters.categories,
        cityFilters: parsed.cityFilters || defaultFilters.cityFilters,
      };
    }
    return defaultFilters;
  } catch (e) {
    console.error('Error reading filters:', e);
    return defaultFilters;
  }
}

export default function BrowseFilters({ 
  events = [],
  onFilterStateChange,
  onCategorySelect,
  selectedCategory
}: { 
  events?: PublicEventCard[];
  onFilterStateChange?: (hasActiveFilters: boolean) => void;
  onCategorySelect?: (category: string | null) => void;
  selectedCategory?: string | null;
}) {
  const [filters, setFilters] = useState<BrowseFiltersData>(defaultFilters);
  const [activeCategory, setActiveCategory] = useState<string | null>(selectedCategory || null);
  const [activeFilters, setActiveFilters] = useState<string[]>(['CHENNAI']);
  const [activeSubFilters, setActiveSubFilters] = useState<string[]>([]);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState<Category[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showPricePicker, setShowPricePicker] = useState(false);
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(10000);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<'min' | 'max' | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityFilter | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Extract unique categories from events
  useEffect(() => {
    if (events.length > 0) {
      const categoryMap = new Map<string, string>();
      
      events.forEach(event => {
        if (event.category) {
          const normalized = event.category.trim();
          if (normalized && !categoryMap.has(normalized.toLowerCase())) {
            // Map common categories to icons
            let icon = 'Mic';
            const lower = normalized.toLowerCase();
            if (lower.includes('dj') || lower.includes('disc')) icon = 'Disc';
            else if (lower.includes('party')) icon = 'PartyPopper';
            else if (lower.includes('comedy') || lower.includes('smile')) icon = 'Smile';
            else if (lower.includes('theatre') || lower.includes('drama')) icon = 'Drama';
            else if (lower.includes('art') || lower.includes('paint')) icon = 'Palette';
            else if (lower.includes('edm') || lower.includes('techno') || lower.includes('house')) icon = 'PartyPopper';
            else if (lower.includes('live') || lower.includes('commercial') || lower.includes('bollywood')) icon = 'Mic';
            
            categoryMap.set(normalized.toLowerCase(), icon);
          }
        }
      });

      const newCategories: Category[] = Array.from(categoryMap.entries()).map(([name, icon]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        icon,
        subFilters: []
      }));

      setDynamicCategories(newCategories);
    }
  }, [events]);

  // Update active category when selectedCategory prop changes
  useEffect(() => {
    setActiveCategory(selectedCategory || null);
  }, [selectedCategory]);

  useEffect(() => {
    const stored = getStoredFilters();
    setFilters(stored);
    
    // Check if current active filters contain a city that is not in the first position
    // If only default 'CHENNAI' is active but another city is first, update it
    if (stored.cityFilters.length > 0 && activeFilters.length === 1 && activeFilters[0] === 'CHENNAI') {
      const firstCity = stored.cityFilters[0].name.toUpperCase();
      if (firstCity !== 'CHENNAI') {
        setActiveFilters([firstCity]);
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        setFilters(getStoredFilters());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [activeFilters]);

  // Combine default and dynamic categories, avoiding duplicates
  const allCategories = [...filters.categories];
  dynamicCategories.forEach(dynamicCat => {
    const exists = allCategories.some(cat => 
      cat.name.toLowerCase() === dynamicCat.name.toLowerCase()
    );
    if (!exists) {
      allCategories.push(dynamicCat);
    }
  });

  // Check if there are any active filters beyond default CHENNAI
  const hasActiveFilters = activeCategory !== null || activeSubFilters.length > 0 || activeFilters.some(f => {
    // Check if it's a city or area filter
    const isCityOrArea = filters.cityFilters.some(cf => 
      cf.name.toUpperCase() === f.toUpperCase() || 
      cf.areas.some(a => a.toUpperCase() === f.toUpperCase())
    );
    if (isCityOrArea) return false; // Base location doesn't count as "active filter" for reset purposes usually, or it does? 
    // In original code: f !== 'CHENNAI'
    // Let's stick to the logic that if it's not the first city, it's an active filter.
    const firstCity = filters.cityFilters[0]?.name.toUpperCase() || 'CHENNAI';
    return f !== firstCity;
  });

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || MapPin;
  };

  // Dynamically update main filters based on city filters if available
  const cityButtons = filters.cityFilters.map(city => ({
    name: city.name.toUpperCase(),
    icon: city.icon,
    iconImage: city.iconImage,
    href: undefined as string | undefined
  }));
  const nonCityFilters = filters.mainFilters.filter(f => f.icon !== 'MapPin');
  const mainFiltersWithCities = [...cityButtons, ...nonCityFilters];

  const toggleFilter = (name: string, href?: string) => {
    if (href) {
      router.push(href);
      return;
    }

    // Check if this is a city filter
    const cityFilter = filters.cityFilters.find(cf => cf.name.toUpperCase() === name.toUpperCase());
    if (cityFilter) {
      setSelectedCity(cityFilter);
      setShowLocationPicker(true);
      return;
    }

    // Handle DATE filter - open date picker
    if (name === 'DATE') {
      setShowDatePicker(true);
      return;
    }
    // Handle PRICE filter - open price slider
    if (name === 'PRICE') {
      setShowPricePicker(true);
      return;
    }
    
    const newFilters = activeFilters.includes(name)
      ? activeFilters.filter(f => f !== name)
      : [...activeFilters, name];
    setActiveFilters(newFilters);
    
    setTimeout(() => {
      const firstCity = filters.cityFilters[0]?.name.toUpperCase() || 'CHENNAI';
      const hasActive = activeCategory !== null || activeSubFilters.length > 0 || newFilters.some(f => {
        // A filter is active if it's not the primary city and not an area of any city
        const isCity = filters.cityFilters.some(cf => cf.name.toUpperCase() === f);
        const isArea = filters.cityFilters.some(cf => cf.areas.some(a => a.toUpperCase() === f));
        if (isCity) return f !== firstCity;
        if (isArea) return true;
        return true;
      });
      onFilterStateChange?.(hasActive);
    }, 0);
  };

  const toggleSubFilter = (sub: string) => {
    const newSubFilters = activeSubFilters.includes(sub)
      ? activeSubFilters.filter(s => s !== sub)
      : [...activeSubFilters, sub];
    setActiveSubFilters(newSubFilters);
    setTimeout(() => {
      onFilterStateChange?.(newSubFilters.length > 0 || activeCategory !== null || activeFilters.some(f => f !== 'CHENNAI'));
    }, 0);
  };

  const handleCategoryClick = (catName: string, isActive: boolean) => {
    const newCategory = isActive ? null : catName;
    setActiveCategory(newCategory);
    if (isActive) {
      setActiveSubFilters([]);
    }
    // Notify parent component about category selection
    onCategorySelect?.(newCategory);
    setTimeout(() => {
      const hasActive = newCategory !== null || (!isActive && activeSubFilters.length > 0) || activeFilters.some(f => f !== 'CHENNAI');
      onFilterStateChange?.(hasActive);
    }, 0);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-[#0D0D0D] py-4 sticky top-16 z-40"
    >
      <div className="container mx-auto">
        {/* Main Filters (Location, Date, Price) */}
        <div className="flex gap-3 mb-6 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
          {mainFiltersWithCities.map((filter, i) => {
            let filterName = filter.name;
            let isActive = activeFilters.includes(filter.name.toUpperCase());

            // Special handling for Location filter label
            if (filter.icon === 'MapPin') {
              const cityFilter = filters.cityFilters.find(cf => cf.name.toUpperCase() === filter.name.toUpperCase());
              if (cityFilter) {
                const activeAreas = cityFilter.areas.filter(area => activeFilters.includes(area.toUpperCase()));
                if (activeAreas.length > 0) {
                  filterName = activeAreas.length === 1 
                    ? activeAreas[0] 
                    : `${activeAreas[0]} + ${activeAreas.length - 1}`;
                  isActive = true;
                } else if (activeFilters.includes(cityFilter.name.toUpperCase())) {
                  filterName = cityFilter.name;
                  isActive = true;
                }
              }
            }

            const IconComponent = getIconComponent(filter.icon);
            return (
              <motion.button
                key={filter.name}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleFilter(filter.name, filter.href)}
                className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap border ${
                  isActive 
                    ? 'bg-[#E5A823] text-[#0D0D0D] border-[#E5A823] hover:bg-[#F5C542] shadow-[0_0_15px_rgba(229,168,35,0.4)]' 
                    : 'bg-[#2A2A2A] text-[#F5F5DC] border-[#2A2A2A] hover:text-white hover:border-[#E5A823] hover:shadow-[0_0_10px_rgba(229,168,35,0.3)]'
                }`}
              >
                <motion.div
                  animate={{ rotate: isActive ? 360 : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {filter.icon === 'CUSTOM' && filter.iconImage ? (
                    <img src={filter.iconImage} alt={filterName} className="w-3 h-3 object-contain" />
                  ) : (
                    <IconComponent className={`w-3 h-3 ${isActive ? 'text-black' : ''}`} />
                  )}
                </motion.div>
                {filterName}
              </motion.button>
            );
          })}
        </div>

        {/* Date Range Picker Modal */}
        <AnimatePresence>
          {showDatePicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
              onClick={() => setShowDatePicker(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-[#0D0D0D] rounded-2xl border border-[#2A2A2A] p-6 w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                {/* Header with month navigation */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#F5F5DC]" />
                  </button>
                  <h2 className="text-lg font-bold text-[#F5F5DC]">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-[#F5F5DC]" />
                  </button>
                </div>

                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-[#F5F5DC]/50 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = currentMonth.getFullYear();
                    const month = currentMonth.getMonth();
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const days = [];
                    
                    // Empty cells for days before the first day of month
                    for (let i = 0; i < firstDay; i++) {
                      days.push(<div key={`empty-${i}`} className="h-10" />);
                    }
                    
                    // Days of the month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const date = new Date(year, month, day);
                      const isStart = dateRangeStart && date.toDateString() === dateRangeStart.toDateString();
                      const isEnd = dateRangeEnd && date.toDateString() === dateRangeEnd.toDateString();
                      const isHovered = hoveredDate && date.toDateString() === hoveredDate.toDateString();
                      const isHoverInRange = dateRangeStart && !dateRangeEnd && hoveredDate && date > dateRangeStart && date <= hoveredDate;
                      const isInRange = (dateRangeStart && dateRangeEnd && date > dateRangeStart && date < dateRangeEnd) || isHoverInRange;
                      const isToday = date.toDateString() === new Date().toDateString();
                      
                      days.push(
                        <motion.button
                          key={day}
                          whileHover={{ scale: 1.15, zIndex: 10 }}
                          whileTap={{ scale: 0.95 }}
                          onHoverStart={() => setHoveredDate(date)}
                          onHoverEnd={() => setHoveredDate(null)}
                          onClick={() => {
                            if (!dateRangeStart || (dateRangeStart && dateRangeEnd)) {
                              setDateRangeStart(date);
                              setDateRangeEnd(null);
                            } else if (dateRangeStart && !dateRangeEnd) {
                              if (date < dateRangeStart) {
                                setDateRangeEnd(dateRangeStart);
                                setDateRangeStart(date);
                              } else {
                                setDateRangeEnd(date);
                              }
                            }
                          }}
                          className={`
                            h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all relative
                            ${isStart || isEnd 
                              ? 'bg-[#0D0D0D] text-[#F5F5DC] border-2 border-[#F5F5DC] shadow-[0_0_10px_rgba(245,245,220,0.5)]' 
                              : isInRange 
                                ? 'bg-[#F5F5DC] text-[#0D0D0D]' 
                                : isToday 
                                  ? 'text-[#E5A823] border border-[#E5A823]/50' 
                                  : 'text-[#F5F5DC]/70 hover:text-[#F5F5DC] hover:bg-[#2A2A2A]'
                            }
                          `}
                        >
                          {day}
                          {isHovered && !isStart && !isEnd && !isInRange && (
                            <motion.div
                              className="absolute inset-0 rounded-full border-2 border-[#E5A823]/50"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            />
                          )}
                        </motion.button>
                      );
                    }
                    return days;
                  })()}
                </div>

                {/* Selected range display */}
                <div className="mt-6 flex justify-center">
                  <div className="bg-[#0D0D0D] border border-[#F5F5DC] rounded-full px-6 py-3 flex items-center gap-3">
                    <span className="text-sm font-bold text-[#F5F5DC]">
                      {dateRangeStart 
                        ? dateRangeStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()
                        : 'SELECT'
                      }
                    </span>
                    <span className="text-[#F5F5DC]">→</span>
                    <span className="text-sm font-bold text-[#F5F5DC]">
                      {dateRangeEnd 
                        ? dateRangeEnd.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()
                        : dateRangeStart 
                          ? dateRangeStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()
                          : 'DATE'
                      }
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setDateRangeStart(null);
                      setDateRangeEnd(null);
                      setShowDatePicker(false);
                    }}
                    className="flex-1 rounded-xl bg-[#2A2A2A] px-4 py-3 text-sm font-semibold text-[#F5F5DC] transition hover:bg-[#3A3A3A]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (dateRangeStart) {
                        const startStr = dateRangeStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();
                        const endStr = dateRangeEnd 
                          ? dateRangeEnd.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()
                          : startStr;
                        const dateLabel = dateRangeEnd && dateRangeEnd.getTime() !== dateRangeStart.getTime()
                          ? `${startStr} → ${endStr}`
                          : startStr;
                        const newFilters = [...activeFilters.filter(f => f !== 'DATE'), dateLabel];
                        setActiveFilters(newFilters);
                        setShowDatePicker(false);
                        setTimeout(() => {
                          onFilterStateChange?.(newFilters.length > 0 || activeCategory !== null || activeSubFilters.length > 0);
                        }, 0);
                      }
                    }}
                    disabled={!dateRangeStart}
                    className="flex-1 rounded-xl bg-[#F5F5DC] px-4 py-3 text-sm font-bold text-[#0D0D0D] transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location Picker Modal */}
        <AnimatePresence>
          {showLocationPicker && selectedCity && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
              onClick={() => setShowLocationPicker(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-[#0D0D0D] rounded-2xl border border-[#2A2A2A] p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#F5F5DC]">Select Location</h2>
                    <p className="text-sm text-[#F5F5DC]/60">Browse events in {selectedCity.name}</p>
                  </div>
                  <button
                    onClick={() => setShowLocationPicker(false)}
                    className="p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors"
                  >
                    <X className="w-5 h-5 text-[#F5F5DC]" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                  <div className="space-y-4">
                    {/* Entire City Checkbox */}
                    <div 
                      onClick={() => {
                        const cityName = selectedCity.name.toUpperCase();
                        const isCityActive = activeFilters.includes(cityName);
                        
                        let newFilters: string[];
                        if (isCityActive) {
                          // If city was active, unselect everything? Or just city?
                          // Usually "Entire City" unselected means user wants to pick specific areas or nothing.
                          newFilters = activeFilters.filter(f => f !== cityName);
                        } else {
                          // Select city, clear all areas
                          newFilters = [
                            ...activeFilters.filter(f => !selectedCity.areas.some(a => a.toUpperCase() === f.toUpperCase())),
                            cityName
                          ];
                        }
                        
                        setActiveFilters(newFilters);
                        setTimeout(() => {
                          onFilterStateChange?.(newFilters.length > 0 || activeCategory !== null || activeSubFilters.length > 0);
                        }, 0);
                      }}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        activeFilters.includes(selectedCity.name.toUpperCase())
                          ? 'bg-[#E5A823]/10 border-[#E5A823] text-[#E5A823]'
                          : 'bg-[#1A1A1A] border-[#2A2A2A] text-[#F5F5DC]/80 hover:border-[#E5A823]/50'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-base">Entire {selectedCity.name}</span>
                        <span className="text-xs opacity-60">Show events from all areas in {selectedCity.name}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                        activeFilters.includes(selectedCity.name.toUpperCase())
                          ? 'bg-[#E5A823] border-[#E5A823]'
                          : 'border-[#F5F5DC]/20'
                      }`}>
                        {activeFilters.includes(selectedCity.name.toUpperCase()) && <Check className="w-4 h-4 text-black" />}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-[#2A2A2A]"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase tracking-widest">
                        <span className="bg-[#0D0D0D] px-2 text-[#F5F5DC]/40">Sub-Areas</span>
                      </div>
                    </div>

                    {/* Individual areas Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedCity.areas && selectedCity.areas.length > 0 ? (
                        selectedCity.areas.map((area) => {
                          const areaName = area.toUpperCase();
                          const isAreaActive = activeFilters.includes(areaName);
                          return (
                            <div
                              key={area}
                              onClick={() => {
                                let newFilters: string[];
                                if (isAreaActive) {
                                  newFilters = activeFilters.filter(f => f !== areaName);
                                } else {
                                  // Add area, remove "Entire City" if it was selected
                                  newFilters = [
                                    ...activeFilters.filter(f => f !== selectedCity.name.toUpperCase()),
                                    areaName
                                  ];
                                }
                                
                                setActiveFilters(newFilters);
                                setTimeout(() => {
                                  onFilterStateChange?.(newFilters.length > 0 || activeCategory !== null || activeSubFilters.length > 0);
                                }, 0);
                              }}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                                isAreaActive
                                  ? 'bg-[#E5A823]/5 border-[#E5A823]/50 text-[#E5A823]'
                                  : 'bg-[#1A1A1A] border-[#2A2A2A] text-[#F5F5DC]/70 hover:border-[#E5A823]/30'
                              }`}
                            >
                              <span className="text-sm font-medium">{area}</span>
                              <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${
                                isAreaActive
                                  ? 'bg-[#E5A823] border-[#E5A823]'
                                  : 'border-[#F5F5DC]/20'
                              }`}>
                                {isAreaActive && <Check className="w-3 h-3 text-black" />}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-10 text-center">
                          <p className="text-[#F5F5DC]/40 italic">No specific areas defined for this city.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#2A2A2A] flex gap-3">
                  <button
                    onClick={() => {
                      // Optional: Reset all locations
                      const firstCity = filters.cityFilters[0]?.name.toUpperCase() || 'CHENNAI';
                      setActiveFilters([firstCity]);
                      setShowLocationPicker(false);
                    }}
                    className="flex-1 rounded-xl bg-[#2A2A2A] px-4 py-3 text-sm font-semibold text-[#F5F5DC] transition hover:bg-[#3A3A3A]"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setShowLocationPicker(false)}
                    className="flex-1 rounded-xl bg-[#E5A823] px-4 py-3 text-sm font-bold text-[#0D0D0D] transition hover:bg-[#F5C542]"
                  >
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Price Range Picker Modal */}
        <AnimatePresence>
          {showPricePicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
              onClick={() => setShowPricePicker(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-[#0D0D0D] rounded-xl border border-[#2A2A2A] p-4 w-full max-w-xs shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-[#F5F5DC]">Price Range</h2>
                </div>

                {/* Dual Handle Slider */}
                <div className="relative h-8 mb-4">
                  {/* Track background */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#2A2A2A] rounded-full -translate-y-1/2" />
                  
                  {/* Active track between handles */}
                  <div 
                    className="absolute top-1/2 h-1 bg-[#E5A823] rounded-full -translate-y-1/2"
                    style={{
                      left: `${(priceMin / 10000) * 100}%`,
                      width: `${((priceMax - priceMin) / 10000) * 100}%`
                    }}
                  />

                  {/* Min handle */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                    style={{ left: `${(priceMin / 10000) * 100}%` }}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                    onHoverStart={() => setHoveredHandle('min')}
                    onHoverEnd={() => setHoveredHandle(null)}
                    onMouseDown={() => setIsDragging('min')}
                  >
                    <div className={`w-4 h-4 rounded-full bg-[#E5A823] transition-all ${isDragging === 'min' ? 'ring-2 ring-[#E5A823]/50' : ''}`}>
                      {hoveredHandle === 'min' && !isDragging && (
                        <motion.div
                          className="absolute inset-0 rounded-full border border-[#E5A823]/50"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.2, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </div>
                  </motion.div>

                  {/* Max handle */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                    style={{ left: `${(priceMax / 10000) * 100}%` }}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                    onHoverStart={() => setHoveredHandle('max')}
                    onHoverEnd={() => setHoveredHandle(null)}
                    onMouseDown={() => setIsDragging('max')}
                  >
                    <div className={`w-4 h-4 rounded-full bg-[#E5A823] transition-all ${isDragging === 'max' ? 'ring-2 ring-[#E5A823]/50' : ''}`}>
                      {hoveredHandle === 'max' && !isDragging && (
                        <motion.div
                          className="absolute inset-0 rounded-full border border-[#E5A823]/50"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.2, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </div>
                  </motion.div>

                  {/* Mouse tracking overlay */}
                  <div
                    className="absolute inset-0 cursor-pointer"
                    onMouseMove={(e) => {
                      if (!isDragging) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percent = Math.max(0, Math.min(1, x / rect.width));
                      const value = Math.round(percent * 10000);
                      
                      if (isDragging === 'min') {
                        setPriceMin(Math.min(value, priceMax - 100));
                      } else if (isDragging === 'max') {
                        setPriceMax(Math.max(value, priceMin + 100));
                      }
                    }}
                    onMouseUp={() => setIsDragging(null)}
                    onMouseLeave={() => setIsDragging(null)}
                  />
                </div>

                {/* Selected price display */}
                <div className="flex justify-center mb-4">
                  <div className="bg-[#0D0D0D] border border-[#F5F5DC]/20 rounded-full px-4 py-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F5F5DC]">
                      {priceMin === 0 ? 'FREE' : `₹${priceMin}`}
                    </span>
                    <span className="text-[#F5F5DC]/50">→</span>
                    <span className="text-xs font-bold text-[#F5F5DC]">
                      {priceMax >= 10000 ? 'ANY' : `₹${priceMax}`}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPriceMin(0);
                      setPriceMax(10000);
                      setShowPricePicker(false);
                    }}
                    className="flex-1 rounded-lg bg-[#2A2A2A] px-3 py-2 text-xs font-semibold text-[#F5F5DC] transition hover:bg-[#3A3A3A]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const minText = priceMin === 0 ? 'FREE' : `₹${priceMin}`;
                      const maxText = priceMax >= 10000 ? 'ANY' : `₹${priceMax}`;
                      const priceLabel = priceMin === 0 && priceMax >= 10000 
                        ? 'ANY PRICE' 
                        : `${minText} → ${maxText}`;
                      const newFilters = [...activeFilters.filter(f => f !== 'PRICE'), priceLabel];
                      setActiveFilters(newFilters);
                      setShowPricePicker(false);
                      setTimeout(() => {
                        onFilterStateChange?.(newFilters.length > 0 || activeCategory !== null || activeSubFilters.length > 0);
                      }, 0);
                    }}
                    className="flex-1 rounded-lg bg-[#E5A823] px-3 py-2 text-xs font-bold text-[#0D0D0D] transition hover:bg-[#F5C542]"
                  >
                    Apply
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Filters - Now includes dynamic categories from events */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
          {allCategories.map((cat, i) => {
            const isActive = activeCategory === cat.name;
            const isHovered = hoveredCategory === cat.name;
            const IconComponent = getIconComponent(cat.icon);
            return (
              <motion.button
                key={cat.name}
                initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 200 }}
                whileHover={{ 
                  scale: 1.08, 
                  y: -5,
                  rotateY: 5,
                  transition: { type: "spring", stiffness: 300 }
                }}
                whileTap={{ scale: 0.92 }}
                onHoverStart={() => setHoveredCategory(cat.name)}
                onHoverEnd={() => setHoveredCategory(null)}
                onClick={() => handleCategoryClick(cat.name, isActive)}
                className={`flex flex-col items-center justify-center min-w-[80px] h-[80px] p-2 rounded-xl transition-all group border relative overflow-hidden ${
                  isActive
                    ? 'bg-[#E5A823] border-[#E5A823] text-[#0D0D0D]'
                    : 'bg-[#2A2A2A] border-[#2A2A2A] text-[#F5F5DC]/70 hover:text-[#F5F5DC]'
                }`}
              >
                {/* Animated background glow */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-[#E5A823]/20 to-[#EB4D4B]/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Ripple effect */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-[#E5A823]"
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
                
                <motion.div
                  animate={{ 
                    scale: isActive ? 1.2 : 1,
                    rotate: isHovered ? [0, -10, 10, 0] : 0
                  }}
                  transition={{ 
                    scale: { type: "spring", stiffness: 300 },
                    rotate: { duration: 0.5 }
                  }}
                  className="relative z-10"
                >
                  {cat.icon === 'CUSTOM' && cat.iconImage ? (
                    <img src={cat.iconImage} alt={cat.name} className="w-6 h-6 mb-2 object-contain" />
                  ) : (
                    <IconComponent className={`w-6 h-6 mb-2 transition-all ${
                      isActive 
                        ? 'text-[#0D0D0D]' 
                        : isHovered
                          ? 'text-[#E5A823]'
                          : 'text-[#F5F5DC]/50'
                    }`} />
                  )}
                </motion.div>
                <span className="text-xs font-bold relative z-10">{cat.name}</span>
                
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    className="absolute bottom-2 w-1.5 h-1.5 bg-[#0D0D0D] rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Sub Filters - Appear when category is selected */}
        <AnimatePresence>
          {activeCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <motion.div 
                className="mt-4 pt-4 border-t border-[#F5F5DC]/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {allCategories
                    .find((cat) => cat.name === activeCategory)
                    ?.subFilters.map((sub, i) => {
                      const isSubActive = activeSubFilters.includes(sub);
                      return (
                        <motion.button
                          key={sub}
                          initial={{ opacity: 0, x: -20, scale: 0.8 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          transition={{ delay: i * 0.03, type: "spring", stiffness: 300 }}
                          whileHover={{ 
                            scale: 1.1, 
                            y: -2,
                            boxShadow: "0 0 20px rgba(229, 168, 35, 0.4)"
                          }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleSubFilter(sub)}
                          className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
                            isSubActive
                              ? 'bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] text-[#0D0D0D] border-transparent shadow-[0_0_15px_rgba(229,168,35,0.5)]'
                              : 'bg-[#2A2A2A] border-[#2A2A2A] text-[#F5F5DC]/70 hover:text-[#F5F5DC] hover:border-[#E5A823]/50'
                          }`}
                        >
                          {sub}
                        </motion.button>
                      );
                    })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
