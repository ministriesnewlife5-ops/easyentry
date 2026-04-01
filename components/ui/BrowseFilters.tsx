'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Tag, Mic, PartyPopper, Disc, Smile, Drama,
  Palette, Building2, LucideIcon, ChevronLeft, ChevronRight,
  X, Check, ChevronDown, Loader2, Search, Star
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicEventCard } from '@/lib/public-events-store';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = { name: string; icon: string; iconImage?: string; subFilters: string[] };
type MainFilter = { name: string; icon: string; iconImage?: string; href?: string };
type City = { name: string; icon: string; iconImage?: string; areas: string[] };
type StateFilter = { state: string; cities: City[] };
type BrowseFiltersData = {
  mainFilters: MainFilter[];
  categories: Category[];
  locationFilters: StateFilter[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const iconMap: Record<string, LucideIcon> = {
  MapPin, Calendar, Tag, Mic, PartyPopper, Disc, Smile, Drama, Palette, Building2, Star
};

const defaultFilters: BrowseFiltersData = {
  mainFilters: [
    { name: 'DATE', icon: 'Calendar' },
    { name: 'PRICE', icon: 'Tag' },
    { name: 'ARTIST', icon: 'Mic', href: '/artist' },
    { name: 'INFLUENCER', icon: 'Star', href: '/promoters' },
    { name: 'VENUES', icon: 'Building2', href: '/venues' },
  ],
  categories: [
    { name: 'Gigs', icon: 'Mic', subFilters: ['Alternative', 'Afropop', 'Alt-rock'] },
    { name: 'Party', icon: 'PartyPopper', subFilters: ['House', 'Techno', 'Trance'] },
    { name: 'DJ', icon: 'Disc', subFilters: ['Hip Hop', 'R&B', 'Reggaeton'] },
    { name: 'Comedy', icon: 'Smile', subFilters: ['Stand-up', 'Improv', 'Sketch'] },
    { name: 'Theatre', icon: 'Drama', subFilters: ['Drama', 'Musical', 'Opera'] },
    { name: 'Art', icon: 'Palette', subFilters: ['Painting', 'Sculpture', 'Photography'] },
  ],
  locationFilters: [
    {
      state: 'Tamil Nadu',
      cities: [
        { name: 'Chennai', icon: 'MapPin', areas: ['Adyar', 'Anna Nagar', 'Besant Nagar', 'Chrompet', 'Egmore', 'Guindy', 'Kilpauk', 'Mylapore', 'Nungambakkam', 'OMR', 'T Nagar', 'Tambaram', 'Velachery'] },
        { name: 'Coimbatore', icon: 'MapPin', areas: ['RS Puram', 'Gandhipuram', 'Peelamedu'] },
      ]
    },
  ],
};

function getIconComponent(iconName: string): LucideIcon {
  return iconMap[iconName] || MapPin;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BrowseFilters({
  events = [],
  onFilterStateChange,
  onCategorySelect,
  selectedCategory,
}: {
  events?: PublicEventCard[];
  onFilterStateChange?: (hasActiveFilters: boolean) => void;
  onCategorySelect?: (category: string | null) => void;
  selectedCategory?: string | null;
}) {
  const [filters, setFilters] = useState<BrowseFiltersData>(defaultFilters);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Location state (BookMyShow style)
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [modalActiveState, setModalActiveState] = useState<string>('');

  // Category / filter state
  const [activeCategory, setActiveCategory] = useState<string | null>(selectedCategory || null);
  const [activeSubFilters, setActiveSubFilters] = useState<string[]>([]);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState<Category[]>([]);

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dateLabel, setDateLabel] = useState<string>('');

  // Price picker
  const [showPricePicker, setShowPricePicker] = useState(false);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(10000);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const [priceLabel, setPriceLabel] = useState<string>('');

  const router = useRouter();

  // ── Fetch filters from Supabase API ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/filters');
        if (res.ok) {
          const data = await res.json();
          if (data.filters) {
            setFilters(data.filters);
            // Auto-detect: default to first city of first state
            const firstState = data.filters.locationFilters?.[0];
            if (firstState) {
              const firstCity = firstState.cities?.[0];
              if (firstCity) {
                setSelectedCity(firstCity);
                setSelectedState(firstState.state);
                setModalActiveState(firstState.state);
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch filters:', e);
        // Use defaults — set first city
        const firstState = defaultFilters.locationFilters?.[0];
        if (firstState?.cities?.[0]) {
          setSelectedCity(firstState.cities[0]);
          setSelectedState(firstState.state);
          setModalActiveState(firstState.state);
        }
      } finally {
        setFiltersLoading(false);
      }
    })();
  }, []);

  // Set default modal state when filters load
  useEffect(() => {
    if (!modalActiveState && filters.locationFilters?.length > 0) {
      setModalActiveState(filters.locationFilters[0].state);
    }
  }, [filters.locationFilters, modalActiveState]);

  // ── Dynamic categories from events ───────────────────────────────────────
  useEffect(() => {
    if (events.length === 0) return;
    const categoryMap = new Map<string, string>();
    events.forEach(event => {
      if (event.category) {
        const norm = event.category.trim();
        if (norm && !categoryMap.has(norm.toLowerCase())) {
          const lower = norm.toLowerCase();
          let icon = 'Mic';
          if (lower.includes('dj') || lower.includes('disc')) icon = 'Disc';
          else if (lower.includes('party')) icon = 'PartyPopper';
          else if (lower.includes('comedy')) icon = 'Smile';
          else if (lower.includes('theatre') || lower.includes('drama')) icon = 'Drama';
          else if (lower.includes('art') || lower.includes('paint')) icon = 'Palette';
          categoryMap.set(norm.toLowerCase(), icon);
        }
      }
    });
    setDynamicCategories(Array.from(categoryMap.entries()).map(([name, icon]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), icon, subFilters: []
    })));
  }, [events]);

  useEffect(() => { setActiveCategory(selectedCategory || null); }, [selectedCategory]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const allCategories = [...filters.categories];
  dynamicCategories.forEach(d => {
    if (!allCategories.some(c => c.name.toLowerCase() === d.name.toLowerCase())) allCategories.push(d);
  });

  const hasActiveFilters = activeCategory !== null || activeSubFilters.length > 0 ||
    selectedAreas.length > 0 || !!dateLabel || !!priceLabel;

  // Filtered cities in modal based on search
  const filteredLocationFilters = locationSearch.trim()
    ? filters.locationFilters.map(sf => ({
        ...sf,
        cities: sf.cities.filter(c =>
          c.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
          c.areas.some(a => a.toLowerCase().includes(locationSearch.toLowerCase()))
        )
      })).filter(sf => sf.cities.length > 0)
    : filters.locationFilters;

  const currentStateFilter = filters.locationFilters.find(sf => sf.state === modalActiveState);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCategoryClick = (catName: string, isActive: boolean) => {
    const newCat = isActive ? null : catName;
    setActiveCategory(newCat);
    if (isActive) setActiveSubFilters([]);
    onCategorySelect?.(newCat);
    setTimeout(() => onFilterStateChange?.(newCat !== null || activeSubFilters.length > 0 || hasActiveFilters), 0);
  };

  const toggleSubFilter = (sub: string) => {
    const updated = activeSubFilters.includes(sub)
      ? activeSubFilters.filter(s => s !== sub)
      : [...activeSubFilters, sub];
    setActiveSubFilters(updated);
    setTimeout(() => onFilterStateChange?.(updated.length > 0 || activeCategory !== null || hasActiveFilters), 0);
  };

  const handleSelectCity = (state: string, city: City) => {
    setSelectedCity(city);
    setSelectedState(state);
    setSelectedAreas([]);
    setShowLocationModal(false);
    setTimeout(() => onFilterStateChange?.(hasActiveFilters), 0);
  };

  const toggleArea = (area: string) => {
    const updated = selectedAreas.includes(area)
      ? selectedAreas.filter(a => a !== area)
      : [...selectedAreas, area];
    setSelectedAreas(updated);
    setTimeout(() => onFilterStateChange?.(updated.length > 0 || !!dateLabel || !!priceLabel || activeCategory !== null), 0);
  };

  // ── Location button label ─────────────────────────────────────────────────
  const locationLabel = selectedAreas.length > 0
    ? selectedAreas.length === 1 ? selectedAreas[0] : `${selectedAreas[0]} +${selectedAreas.length - 1}`
    : (selectedCity?.name ?? 'Location');

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-[#0D0D0D] py-4 sticky top-16 z-40"
    >
      <div className="container mx-auto">

        {/* ── TOP FILTER BAR ── */}
        <div className="flex gap-3 mb-6 overflow-x-auto scrollbar-hide pb-2 md:pb-0">

          {/* LOCATION BUTTON — BookMyShow style */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLocationModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap border ${
              selectedCity
                ? 'bg-[#E5A823] text-[#0D0D0D] border-[#E5A823] shadow-[0_0_15px_rgba(229,168,35,0.4)]'
                : 'bg-[#2A2A2A] text-[#F5F5DC] border-[#2A2A2A] hover:border-[#E5A823]'
            }`}
          >
            <MapPin className="w-3 h-3" />
            {locationLabel}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </motion.button>

          {/* DATE button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowDatePicker(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap border ${
              dateLabel ? 'bg-[#E5A823] text-[#0D0D0D] border-[#E5A823] shadow-[0_0_15px_rgba(229,168,35,0.4)]' : 'bg-[#2A2A2A] text-[#F5F5DC] border-[#2A2A2A] hover:border-[#E5A823]'
            }`}
          >
            <Calendar className="w-3 h-3" />
            {dateLabel || 'DATE'}
          </motion.button>

          {/* PRICE button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowPricePicker(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap border ${
              priceLabel ? 'bg-[#E5A823] text-[#0D0D0D] border-[#E5A823] shadow-[0_0_15px_rgba(229,168,35,0.4)]' : 'bg-[#2A2A2A] text-[#F5F5DC] border-[#2A2A2A] hover:border-[#E5A823]'
            }`}
          >
            <Tag className="w-3 h-3" />
            {priceLabel || 'PRICE'}
          </motion.button>

          {/* Other main filters (ARTIST, VENUES) */}
          {filters.mainFilters
            .filter(f => f.href)
            .map((filter, i) => {
              const IconComp = getIconComponent(filter.icon);
              return (
                <motion.button key={filter.name}
                  whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                  onClick={() => router.push(filter.href!)}
                  className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap border bg-[#2A2A2A] text-[#F5F5DC] border-[#2A2A2A] hover:border-[#E5A823]"
                >
                  <IconComp className="w-3 h-3" />
                  {filter.name}
                </motion.button>
              );
            })}
        </div>

        {/* ── LOCATION MODAL — BookMyShow style ── */}
        <AnimatePresence>
          {showLocationModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setShowLocationModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="bg-[#0D0D0D] rounded-2xl border border-[#2A2A2A] w-full max-w-2xl shadow-2xl overflow-hidden"
                style={{ maxHeight: '85vh' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F5DC]">Select Location</h2>
                    <p className="text-xs text-[#F5F5DC]/40 mt-0.5">Choose your city to find events near you</p>
                  </div>
                  <button onClick={() => setShowLocationModal(false)} className="p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors">
                    <X className="w-5 h-5 text-[#F5F5DC]" />
                  </button>
                </div>

                {/* Search bar */}
                <div className="px-6 py-3 border-b border-[#2A2A2A]">
                  <div className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] px-3 py-2.5">
                    <Search className="w-4 h-4 text-[#F5F5DC]/30" />
                    <input
                      value={locationSearch}
                      onChange={e => setLocationSearch(e.target.value)}
                      placeholder="Search for city or area..."
                      className="flex-1 bg-transparent text-sm text-[#F5F5DC] placeholder-[#F5F5DC]/30 outline-none"
                      autoFocus
                    />
                    {locationSearch && <button onClick={() => setLocationSearch('')}><X className="w-3.5 h-3.5 text-[#F5F5DC]/40" /></button>}
                  </div>
                </div>

                <div className="flex" style={{ height: 'calc(85vh - 160px)' }}>
                  {/* Left: States list */}
                  <div className="w-36 border-r border-[#2A2A2A] overflow-y-auto flex-shrink-0">
                    {(locationSearch ? filteredLocationFilters : filters.locationFilters).map(sf => (
                      <button
                        key={sf.state}
                        onClick={() => setModalActiveState(sf.state)}
                        className={`w-full text-left px-4 py-3.5 text-sm font-medium transition-all border-l-2 ${
                          modalActiveState === sf.state
                            ? 'bg-[#E5A823]/10 text-[#E5A823] border-[#E5A823]'
                            : 'text-[#F5F5DC]/60 border-transparent hover:bg-[#1A1A1A] hover:text-[#F5F5DC]'
                        }`}
                      >
                        {sf.state}
                      </button>
                    ))}
                  </div>

                  {/* Right: Cities grid */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {locationSearch.trim() ? (
                      // Search results — show all matching cities across states
                      <div className="space-y-4">
                        {filteredLocationFilters.map(sf => (
                          <div key={sf.state}>
                            <p className="text-xs text-[#F5F5DC]/30 uppercase tracking-widest mb-2 font-semibold">{sf.state}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {sf.cities.map(city => (
                                <CityCard
                                  key={city.name} city={city}
                                  isSelected={selectedCity?.name === city.name && selectedState === sf.state}
                                  onClick={() => handleSelectCity(sf.state, city)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                        {filteredLocationFilters.length === 0 && (
                          <div className="py-12 text-center">
                            <MapPin className="w-8 h-8 text-[#2A2A2A] mx-auto mb-2" />
                            <p className="text-[#F5F5DC]/30 text-sm">No cities found for &quot;{locationSearch}&quot;</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Normal view — cities for the active state
                      <div>
                        {currentStateFilter ? (
                          <>
                            <p className="text-xs text-[#F5F5DC]/30 uppercase tracking-widest mb-3 font-semibold">
                              {currentStateFilter.state} • {currentStateFilter.cities.length} {currentStateFilter.cities.length === 1 ? 'city' : 'cities'}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {currentStateFilter.cities.map(city => (
                                <CityCard
                                  key={city.name} city={city}
                                  isSelected={selectedCity?.name === city.name && selectedState === currentStateFilter.state}
                                  onClick={() => handleSelectCity(currentStateFilter.state, city)}
                                />
                              ))}
                            </div>
                            {currentStateFilter.cities.length === 0 && (
                              <div className="py-12 text-center">
                                <p className="text-[#F5F5DC]/20 text-sm italic">No cities in this state yet.</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="py-12 text-center">
                            <p className="text-[#F5F5DC]/20 text-sm">Select a state from the left.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── AREA CHIPS — appear below the filter bar when a city is selected ── */}
        <AnimatePresence>
          {selectedCity && selectedCity.areas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="flex items-center gap-2">
                {/* Left Arrow */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const container = document.getElementById('areas-scroll-container');
                    if (container) container.scrollBy({ left: -200, behavior: 'smooth' });
                  }}
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#E5A823] flex items-center justify-center text-[#F5F5DC] hover:text-[#E5A823] transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>

                {/* Scrollable Areas */}
                <div id="areas-scroll-container" className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 flex-1">
                  <span className="text-xs text-[#F5F5DC]/30 self-center whitespace-nowrap pr-1 flex-shrink-0">Areas in {selectedCity.name}:</span>
                  {selectedCity.areas.map(area => {
                    const isActive = selectedAreas.includes(area);
                    return (
                      <motion.button
                        key={area}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => toggleArea(area)}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                          isActive
                            ? 'bg-[#E5A823] text-[#0D0D0D] border-[#E5A823]'
                            : 'bg-[#1A1A1A] text-[#F5F5DC]/60 border-[#2A2A2A] hover:border-[#E5A823]/50 hover:text-[#F5F5DC]'
                        }`}
                      >
                        {isActive && <Check className="w-2.5 h-2.5 inline mr-1" />}
                        {area}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Right Arrow */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const container = document.getElementById('areas-scroll-container');
                    if (container) container.scrollBy({ left: 200, behavior: 'smooth' });
                  }}
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#E5A823] flex items-center justify-center text-[#F5F5DC] hover:text-[#E5A823] transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── DATE PICKER MODAL ── */}
        <AnimatePresence>
          {showDatePicker && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
              onClick={() => setShowDatePicker(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="bg-[#0D0D0D] rounded-2xl border border-[#2A2A2A] p-6 w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors"><ChevronLeft className="w-5 h-5 text-[#F5F5DC]" /></button>
                  <h2 className="text-lg font-bold text-[#F5F5DC]">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors"><ChevronRight className="w-5 h-5 text-[#F5F5DC]" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                    <div key={d} className="text-center text-xs font-medium text-[#F5F5DC]/50 py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const days = [];
                    for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} className="h-10" />);
                    for (let day = 1; day <= daysInMonth; day++) {
                      const date = new Date(year, month, day);
                      const isStart = dateRangeStart && date.toDateString() === dateRangeStart.toDateString();
                      const isEnd = dateRangeEnd && date.toDateString() === dateRangeEnd.toDateString();
                      const isInRange = (dateRangeStart && dateRangeEnd && date > dateRangeStart && date < dateRangeEnd) ||
                        (dateRangeStart && !dateRangeEnd && hoveredDate && date > dateRangeStart && date <= hoveredDate);
                      const isToday = date.toDateString() === new Date().toDateString();
                      days.push(
                        <motion.button key={day} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }}
                          onHoverStart={() => setHoveredDate(date)} onHoverEnd={() => setHoveredDate(null)}
                          onClick={() => {
                            if (!dateRangeStart || (dateRangeStart && dateRangeEnd)) { setDateRangeStart(date); setDateRangeEnd(null); }
                            else if (date < dateRangeStart) { setDateRangeEnd(dateRangeStart); setDateRangeStart(date); }
                            else setDateRangeEnd(date);
                          }}
                          className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                            (isStart || isEnd) ? 'bg-[#0D0D0D] text-[#F5F5DC] border-2 border-[#F5F5DC]'
                              : isInRange ? 'bg-[#F5F5DC] text-[#0D0D0D]'
                              : isToday ? 'text-[#E5A823] border border-[#E5A823]/50'
                              : 'text-[#F5F5DC]/70 hover:bg-[#2A2A2A]'
                          }`}>{day}</motion.button>
                      );
                    }
                    return days;
                  })()}
                </div>
                <div className="mt-6 flex justify-center">
                  <div className="bg-[#0D0D0D] border border-[#F5F5DC] rounded-full px-6 py-3 flex items-center gap-3">
                    <span className="text-sm font-bold text-[#F5F5DC]">
                      {dateRangeStart ? dateRangeStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase() : 'SELECT'}
                    </span>
                    <span className="text-[#F5F5DC]">→</span>
                    <span className="text-sm font-bold text-[#F5F5DC]">
                      {dateRangeEnd ? dateRangeEnd.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()
                        : dateRangeStart ? dateRangeStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase() : 'DATE'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setDateRangeStart(null); setDateRangeEnd(null); setDateLabel(''); setShowDatePicker(false); }}
                    className="flex-1 rounded-xl bg-[#2A2A2A] px-4 py-3 text-sm font-semibold text-[#F5F5DC] hover:bg-[#3A3A3A] transition">Cancel</button>
                  <button
                    onClick={() => {
                      if (dateRangeStart) {
                        const s = dateRangeStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();
                        const e = dateRangeEnd ? dateRangeEnd.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase() : s;
                        setDateLabel(dateRangeEnd && dateRangeEnd.getTime() !== dateRangeStart.getTime() ? `${s} → ${e}` : s);
                        setShowDatePicker(false);
                        setTimeout(() => onFilterStateChange?.(true), 0);
                      }
                    }}
                    disabled={!dateRangeStart}
                    className="flex-1 rounded-xl bg-[#F5F5DC] px-4 py-3 text-sm font-bold text-[#0D0D0D] hover:bg-white disabled:opacity-50 transition">Apply</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PRICE PICKER MODAL ── */}
        <AnimatePresence>
          {showPricePicker && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
              onClick={() => setShowPricePicker(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="bg-[#0D0D0D] rounded-xl border border-[#2A2A2A] p-4 w-full max-w-xs shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <h2 className="text-sm font-bold text-[#F5F5DC] mb-4">Price Range</h2>
                <div className="relative h-8 mb-4">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#2A2A2A] rounded-full -translate-y-1/2" />
                  <div className="absolute top-1/2 h-1 bg-[#E5A823] rounded-full -translate-y-1/2"
                    style={{ left: `${(priceMin / 10000) * 100}%`, width: `${((priceMax - priceMin) / 10000) * 100}%` }} />
                  <motion.div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                    style={{ left: `${(priceMin / 10000) * 100}%` }}
                    whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.9 }}
                    onMouseDown={() => setIsDragging('min')}>
                    <div className="w-4 h-4 rounded-full bg-[#E5A823]" />
                  </motion.div>
                  <motion.div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                    style={{ left: `${(priceMax / 10000) * 100}%` }}
                    whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.9 }}
                    onMouseDown={() => setIsDragging('max')}>
                    <div className="w-4 h-4 rounded-full bg-[#E5A823]" />
                  </motion.div>
                  <div className="absolute inset-0 cursor-pointer"
                    onMouseMove={(e) => {
                      if (!isDragging) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      const val = Math.round(pct * 10000);
                      if (isDragging === 'min') setPriceMin(Math.min(val, priceMax - 100));
                      else setPriceMax(Math.max(val, priceMin + 100));
                    }}
                    onMouseUp={() => setIsDragging(null)} onMouseLeave={() => setIsDragging(null)} />
                </div>
                <div className="flex justify-center mb-4">
                  <div className="bg-[#0D0D0D] border border-[#F5F5DC]/20 rounded-full px-4 py-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F5F5DC]">{priceMin === 0 ? 'FREE' : `₹${priceMin}`}</span>
                    <span className="text-[#F5F5DC]/50">→</span>
                    <span className="text-xs font-bold text-[#F5F5DC]">{priceMax >= 10000 ? 'ANY' : `₹${priceMax}`}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setPriceMin(0); setPriceMax(10000); setPriceLabel(''); setShowPricePicker(false); }}
                    className="flex-1 rounded-lg bg-[#2A2A2A] px-3 py-2 text-xs font-semibold text-[#F5F5DC] hover:bg-[#3A3A3A] transition">Cancel</button>
                  <button
                    onClick={() => {
                      const minT = priceMin === 0 ? 'FREE' : `₹${priceMin}`;
                      const maxT = priceMax >= 10000 ? 'ANY' : `₹${priceMax}`;
                      setPriceLabel(priceMin === 0 && priceMax >= 10000 ? '' : `${minT}→${maxT}`);
                      setShowPricePicker(false);
                      setTimeout(() => onFilterStateChange?.(true), 0);
                    }}
                    className="flex-1 rounded-lg bg-[#E5A823] px-3 py-2 text-xs font-bold text-[#0D0D0D] hover:bg-[#F5C542] transition">Apply</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CATEGORY FILTERS ── */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
          {allCategories.map((cat, i) => {
            const isActive = activeCategory === cat.name;
            const isHovered = hoveredCategory === cat.name;
            const IconComp = getIconComponent(cat.icon);
            return (
              <motion.button key={cat.name}
                initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 200 }}
                whileHover={{ scale: 1.08, y: -5 }} whileTap={{ scale: 0.92 }}
                onHoverStart={() => setHoveredCategory(cat.name)}
                onHoverEnd={() => setHoveredCategory(null)}
                onClick={() => handleCategoryClick(cat.name, isActive)}
                className={`flex flex-col items-center justify-center min-w-[80px] h-[80px] p-2 rounded-xl transition-all border relative overflow-hidden ${
                  isActive ? 'bg-[#E5A823] border-[#E5A823] text-[#0D0D0D]'
                    : 'bg-[#2A2A2A] border-[#2A2A2A] text-[#F5F5DC]/70 hover:text-[#F5F5DC]'
                }`}
              >
                <motion.div className="absolute inset-0 bg-gradient-to-br from-[#E5A823]/20 to-[#EB4D4B]/20"
                  initial={{ opacity: 0 }} animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.3 }} />
                {isActive && <motion.div className="absolute inset-0 bg-[#E5A823]" initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 0.5 }} />}
                <motion.div animate={{ scale: isActive ? 1.2 : 1 }} transition={{ type: 'spring', stiffness: 300 }} className="relative z-10">
                  {cat.icon === 'CUSTOM' && cat.iconImage
                    ? <img src={cat.iconImage} alt={cat.name} className="w-6 h-6 mb-2 object-contain" />
                    : <IconComp className={`w-6 h-6 mb-2 transition-all ${isActive ? 'text-[#0D0D0D]' : isHovered ? 'text-[#E5A823]' : 'text-[#F5F5DC]/50'}`} />}
                </motion.div>
                <span className="text-xs font-bold relative z-10">{cat.name}</span>
                {isActive && <motion.div className="absolute bottom-2 w-1.5 h-1.5 bg-[#0D0D0D] rounded-full" initial={{ scale: 0 }} animate={{ scale: 1 }} />}
              </motion.button>
            );
          })}
        </div>

        {/* ── SUB FILTERS ── */}
        <AnimatePresence>
          {activeCategory && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }} transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="mt-4 pt-4 border-t border-[#F5F5DC]/10">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {/* ALL Button - First and default */}
                  <motion.button
                    initial={{ opacity: 0, x: -20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: 0, type: 'spring', stiffness: 300 }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveSubFilters([])}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
                      activeSubFilters.length === 0
                        ? 'bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] text-[#0D0D0D] border-transparent shadow-[0_0_15px_rgba(229,168,35,0.5)]'
                        : 'bg-[#2A2A2A] border-[#2A2A2A] text-[#F5F5DC]/70 hover:border-[#E5A823]/50'
                    }`}>ALL</motion.button>

                  {allCategories.find(c => c.name === activeCategory)?.subFilters.map((sub, i) => {
                    const isSubActive = activeSubFilters.includes(sub);
                    return (
                      <motion.button key={sub}
                        initial={{ opacity: 0, x: -20, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ delay: (i + 1) * 0.03, type: 'spring', stiffness: 300 }}
                        whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }}
                        onClick={() => toggleSubFilter(sub)}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
                          isSubActive
                            ? 'bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] text-[#0D0D0D] border-transparent shadow-[0_0_15px_rgba(229,168,35,0.5)]'
                            : 'bg-[#2A2A2A] border-[#2A2A2A] text-[#F5F5DC]/70 hover:border-[#E5A823]/50'
                        }`}>{sub}</motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── City Card Sub-component ──────────────────────────────────────────────────

function CityCard({ city, isSelected, onClick }: { city: City; isSelected: boolean; onClick: () => void }) {
  const IconComp = getIconComponent(city.icon);
  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
        isSelected
          ? 'bg-[#E5A823]/10 border-[#E5A823] text-[#E5A823]'
          : 'bg-[#1A1A1A] border-[#2A2A2A] text-[#F5F5DC]/70 hover:border-[#E5A823]/40 hover:text-[#F5F5DC]'
      }`}
    >
      {city.icon === 'CUSTOM' && city.iconImage
        ? <img src={city.iconImage} alt="" className="w-6 h-6 object-contain" />
        : <IconComp className={`w-5 h-5 ${isSelected ? 'text-[#E5A823]' : ''}`} />}
      <span className="text-xs font-semibold text-center leading-tight">{city.name}</span>
      {city.areas.length > 0 && (
        <span className={`text-[10px] ${isSelected ? 'text-[#E5A823]/70' : 'text-[#F5F5DC]/30'}`}>
          {city.areas.length} areas
        </span>
      )}
      {isSelected && <Check className="w-3 h-3 text-[#E5A823]" />}
    </motion.button>
  );
}
