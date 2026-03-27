'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Tag, Mic, PartyPopper, Disc, Smile, Drama, Palette, Building2, LucideIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PublicEventCard } from '@/lib/public-events-store';

type Category = {
  name: string;
  icon: string;
  subFilters: string[];
};

type MainFilter = {
  name: string;
  icon: string;
  href?: string;
};

type BrowseFiltersData = {
  mainFilters: MainFilter[];
  categories: Category[];
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
    { name: 'OUTLET TYPE', icon: 'Building2' },
    { name: 'VENUES', icon: 'Building2', href: '/venues' },
  ],
  categories: [
    { name: 'Outlet Type', icon: 'Building2', subFilters: ['Restobar', 'Nightclub', 'Lounge', 'Pub', 'Bar', 'Restaurant', 'Cafe', 'Event Space', 'Auditorium', 'Open Air'] },
    { name: 'Gigs', icon: 'Mic', subFilters: ['Alternative', 'Afropop', 'Alt-rock', 'Black metal', 'Britpop', 'Celtic', 'Chamber pop', 'Chiptune', 'Cumbia', 'Dance'] },
    { name: 'Party', icon: 'PartyPopper', subFilters: ['House', 'Techno', 'Trance', 'Drum & Bass', 'Dubstep', 'EDM', 'Garage', 'Disco', 'Funk', 'Soul'] },
    { name: 'DJ', icon: 'Disc', subFilters: ['Hip Hop', 'R&B', 'Reggaeton', 'Latin', 'Jazz', 'Blues', 'Folk', 'Country', 'Electronic', 'Ambient'] },
    { name: 'Comedy', icon: 'Smile', subFilters: ['Stand-up', 'Improv', 'Sketch', 'Dark Comedy', 'Satire', 'Observational', 'Slapstick', 'Musical Comedy', 'Romantic Comedy'] },
    { name: 'Theatre', icon: 'Drama', subFilters: ['Drama', 'Musical', 'Opera', 'Ballet', 'Contemporary', 'Experimental', 'Immersive', 'Street Theatre', 'Puppetry', 'Mime'] },
    { name: 'Art', icon: 'Palette', subFilters: ['Painting', 'Sculpture', 'Photography', 'Digital Art', 'Installation', 'Performance Art', 'Mixed Media', 'Printmaking', 'Ceramics', 'Textiles'] },
  ],
};

function getStoredFilters(): BrowseFiltersData {
  if (typeof window === 'undefined') return defaultFilters;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultFilters;
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
  const [showOutletTypeDropdown, setShowOutletTypeDropdown] = useState(false);
  const [selectedOutletType, setSelectedOutletType] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);
  const outletTypeRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Outlet type options
  const outletTypes = ['Restobar', 'Nightclub', 'Lounge', 'Pub', 'Bar', 'Restaurant', 'Cafe', 'Event Space', 'Auditorium', 'Open Air'];

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
    setFilters(getStoredFilters());

    const handleStorageChange = () => {
      setFilters(getStoredFilters());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
  const hasActiveFilters = activeCategory !== null || activeSubFilters.length > 0 || activeFilters.some(f => f !== 'CHENNAI');

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || MapPin;
  };

  const toggleFilter = (name: string, href?: string) => {
    if (href) {
      router.push(href);
      return;
    }
    // Handle DATE filter - open date picker
    if (name === 'DATE') {
      setShowDatePicker(true);
      return;
    }
    // Handle OUTLET TYPE filter - toggle dropdown
    if (name === 'OUTLET TYPE') {
      setShowOutletTypeDropdown(!showOutletTypeDropdown);
      return;
    }
    const newFilters = activeFilters.includes(name)
      ? activeFilters.filter(f => f !== name)
      : [...activeFilters, name];
    setActiveFilters(newFilters);
    setTimeout(() => {
      const hasActive = activeCategory !== null || activeSubFilters.length > 0 || newFilters.some(f => f !== 'CHENNAI');
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
          {filters.mainFilters.map((filter, i) => {
            const isActive = activeFilters.includes(filter.name);
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
                  <IconComponent className={`w-3 h-3 ${isActive ? 'text-black' : ''}`} />
                </motion.div>
                {filter.name}
              </motion.button>
            );
          })}
        </div>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowDatePicker(false)}
          >
            <div className="rounded-xl border border-[#2A2A2A] bg-[#101018] p-6" onClick={e => e.stopPropagation()}>
              <label className="block text-sm font-medium mb-3">Select Event Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  if (e.target.value) {
                    const dateLabel = new Date(e.target.value).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    });
                    // Update filters to show selected date
                    const newFilters = [...activeFilters.filter(f => f !== 'DATE'), dateLabel];
                    setActiveFilters(newFilters);
                  }
                  setShowDatePicker(false);
                }}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-2 text-sm outline-none transition focus:border-[#E5A823]"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="flex-1 rounded-lg bg-[#2A2A2A] px-4 py-2 text-sm font-semibold text-[#F5F5DC] transition hover:bg-[#3A3A3A]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Outlet Type Dropdown */}
        {showOutletTypeDropdown && (
          <motion.div
            ref={outletTypeRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 z-50"
          >
            <div className="rounded-xl border border-[#2A2A2A] bg-[#101018] p-4 shadow-xl">
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto min-w-[200px]">
                {outletTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedOutletType(type);
                      // Update filters to show selected outlet type
                      const newFilters = [...activeFilters.filter(f => f !== 'OUTLET TYPE'), type.toUpperCase()];
                      setActiveFilters(newFilters);
                      setShowOutletTypeDropdown(false);
                      setTimeout(() => {
                        const hasActive = activeCategory !== null || activeSubFilters.length > 0 || newFilters.some(f => f !== 'CHENNAI');
                        onFilterStateChange?.(hasActive);
                      }, 0);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border text-left ${
                      selectedOutletType === type
                        ? 'bg-[#E5A823] text-[#0D0D0D] border-[#E5A823]'
                        : 'bg-[#2A2A2A] text-[#F5F5DC] border-[#2A2A2A] hover:border-[#E5A823]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

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
                  <IconComponent className={`w-6 h-6 mb-2 transition-all ${
                    isActive 
                      ? 'text-[#0D0D0D]' 
                      : isHovered
                        ? 'text-[#E5A823]'
                        : 'text-[#F5F5DC]/50'
                  }`} />
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
