'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Trash2, X, MapPin, Calendar, Tag, Mic, PartyPopper,
  Disc, Smile, Drama, Palette, Building2, LucideIcon,
  ChevronRight, ChevronDown, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';

type Category = {
  name: string;
  icon: string;
  iconImage?: string;
  subFilters: string[];
};

type City = {
  name: string;
  icon: string;
  iconImage?: string;
  areas: string[];
};

type StateFilter = {
  state: string;
  cities: City[];
};

type MainFilter = {
  name: string;
  icon: string;
  iconImage?: string;
  href?: string;
};

type BrowseFiltersData = {
  mainFilters: MainFilter[];
  categories: Category[];
  locationFilters: StateFilter[];
};

const iconMap: Record<string, LucideIcon> = {
  MapPin, Calendar, Tag, Mic, PartyPopper, Disc, Smile, Drama, Palette, Building2
};

const availableIcons = [
  { name: 'MapPin', label: 'Location' },
  { name: 'Calendar', label: 'Calendar' },
  { name: 'Tag', label: 'Tag/Price' },
  { name: 'Mic', label: 'Microphone' },
  { name: 'PartyPopper', label: 'Party' },
  { name: 'Disc', label: 'Disc/DJ' },
  { name: 'Smile', label: 'Smile/Comedy' },
  { name: 'Drama', label: 'Drama/Theatre' },
  { name: 'Palette', label: 'Palette/Art' },
  { name: 'Building2', label: 'Building/Venue' },
  { name: 'CUSTOM', label: 'Custom Icon (PNG)' },
];

const defaultFilters: BrowseFiltersData = {
  mainFilters: [
    { name: 'DATE', icon: 'Calendar' },
    { name: 'PRICE', icon: 'Tag' },
    { name: 'ARTIST', icon: 'Mic', href: '/artist' },
    { name: 'VENUES', icon: 'Building2', href: '/venues' },
  ],
  categories: [
    { name: 'Gigs', icon: 'Mic', subFilters: ['Alternative', 'Afropop', 'Alt-rock', 'Britpop', 'Celtic', 'Chiptune'] },
    { name: 'Party', icon: 'PartyPopper', subFilters: ['House', 'Techno', 'Trance', 'Drum & Bass', 'Dubstep', 'EDM'] },
    { name: 'DJ', icon: 'Disc', subFilters: ['Hip Hop', 'R&B', 'Reggaeton', 'Latin', 'Jazz', 'Blues'] },
    { name: 'Comedy', icon: 'Smile', subFilters: ['Stand-up', 'Improv', 'Sketch', 'Dark Comedy', 'Satire'] },
    { name: 'Theatre', icon: 'Drama', subFilters: ['Drama', 'Musical', 'Opera', 'Ballet', 'Contemporary'] },
    { name: 'Art', icon: 'Palette', subFilters: ['Painting', 'Sculpture', 'Photography', 'Digital Art'] },
  ],
  locationFilters: [
    {
      state: 'Tamil Nadu',
      cities: [
        { name: 'Chennai', icon: 'MapPin', areas: ['Adyar', 'Anna Nagar', 'Besant Nagar', 'Chrompet', 'Egmore', 'Guindy', 'Kilpauk', 'Mylapore', 'Nungambakkam', 'OMR', 'T Nagar', 'Tambaram', 'Velachery'] },
        { name: 'Coimbatore', icon: 'MapPin', areas: ['RS Puram', 'Gandhipuram', 'Peelamedu', 'Singanallur'] },
      ]
    },
    {
      state: 'Maharashtra',
      cities: [
        { name: 'Mumbai', icon: 'MapPin', areas: ['Bandra', 'Andheri', 'Juhu', 'Colaba', 'Dadar', 'Powai', 'Worli'] },
        { name: 'Pune', icon: 'MapPin', areas: ['Koregaon Park', 'Kothrud', 'Aundh', 'Baner', 'Hadapsar'] },
      ]
    },
  ],
};

function getIconComponent(iconName: string): LucideIcon {
  return iconMap[iconName] || MapPin;
}

export default function BrowseFiltersManager() {
  const [filters, setFilters] = useState<BrowseFiltersData>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState<Category>({ name: '', icon: 'Mic', subFilters: [] });
  const [newSubFilter, setNewSubFilter] = useState('');
  const [categoryIconFile, setCategoryIconFile] = useState<string>('');

  const [expandedState, setExpandedState] = useState<number | null>(null);
  const [expandedCity, setExpandedCity] = useState<string | null>(null);

  const [showAddState, setShowAddState] = useState(false);
  const [newStateName, setNewStateName] = useState('');

  const [showAddCity, setShowAddCity] = useState(false);
  const [addCityToStateIndex, setAddCityToStateIndex] = useState<number | null>(null);
  const [cityForm, setCityForm] = useState<City>({ name: '', icon: 'MapPin', areas: [] });
  const [newArea, setNewArea] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/filters');
        if (res.ok) {
          const data = await res.json();
          if (data.filters) setFilters(data.filters);
        }
      } catch (e) {
        console.error('Failed to load filters:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveFilters = async (updated: BrowseFiltersData) => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/admin/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: updated }),
      });
      setSaveStatus(res.ok ? 'success' : 'error');
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const updateFilters = async (updated: BrowseFiltersData) => {
    setFilters(updated);
    await saveFilters(updated);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    if (categoryForm.icon === 'CUSTOM' && !categoryIconFile) { alert('Please upload a custom icon'); return; }
    const formData: Category = { ...categoryForm, iconImage: categoryForm.icon === 'CUSTOM' ? categoryIconFile : undefined };
    const updated = {
      ...filters,
      categories: editingCategoryIndex !== null
        ? filters.categories.map((c, i) => i === editingCategoryIndex ? formData : c)
        : [...filters.categories, formData],
    };
    await updateFilters(updated);
    setIsEditingCategory(false);
    setEditingCategoryIndex(null);
    setCategoryForm({ name: '', icon: 'Mic', subFilters: [] });
    setCategoryIconFile('');
  };

  const handleDeleteCategory = async (index: number) => {
    await updateFilters({ ...filters, categories: filters.categories.filter((_, i) => i !== index) });
  };

  const openEditCategory = (index: number) => {
    setEditingCategoryIndex(index);
    const cat = filters.categories[index];
    setCategoryForm(cat);
    setCategoryIconFile(cat.iconImage || '');
    setIsEditingCategory(true);
  };

  const handleAddState = async () => {
    if (!newStateName.trim()) return;
    const updated = {
      ...filters,
      locationFilters: [...(filters.locationFilters || []), { state: newStateName.trim(), cities: [] }],
    };
    await updateFilters(updated);
    setNewStateName('');
    setShowAddState(false);
  };

  const handleDeleteState = async (stateIndex: number) => {
    if (!confirm('Delete this state and all its cities?')) return;
    await updateFilters({ ...filters, locationFilters: (filters.locationFilters || []).filter((_, i) => i !== stateIndex) });
  };

  const openAddCity = (stateIndex: number) => {
    setAddCityToStateIndex(stateIndex);
    setCityForm({ name: '', icon: 'MapPin', areas: [] });
    setNewArea('');
    setShowAddCity(true);
  };

  const handleSaveCity = async () => {
    if (!cityForm.name.trim() || addCityToStateIndex === null) return;
    const locationFilters = JSON.parse(JSON.stringify(filters.locationFilters || []));
    locationFilters[addCityToStateIndex].cities.push({ ...cityForm });
    await updateFilters({ ...filters, locationFilters });
    setShowAddCity(false);
    setAddCityToStateIndex(null);
    setCityForm({ name: '', icon: 'MapPin', areas: [] });
    setNewArea('');
  };

  const handleDeleteCity = async (stateIndex: number, cityIndex: number) => {
    const locationFilters = JSON.parse(JSON.stringify(filters.locationFilters || []));
    locationFilters[stateIndex].cities.splice(cityIndex, 1);
    await updateFilters({ ...filters, locationFilters });
  };

  const handleAddArea = async (stateIndex: number, cityIndex: number, area: string) => {
    if (!area.trim()) return;
    const locationFilters = JSON.parse(JSON.stringify(filters.locationFilters || []));
    locationFilters[stateIndex].cities[cityIndex].areas.push(area.trim());
    await updateFilters({ ...filters, locationFilters });
  };

  const handleDeleteArea = async (stateIndex: number, cityIndex: number, areaIndex: number) => {
    const locationFilters = JSON.parse(JSON.stringify(filters.locationFilters || []));
    locationFilters[stateIndex].cities[cityIndex].areas.splice(areaIndex, 1);
    await updateFilters({ ...filters, locationFilters });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#E5A823]" />
        <span className="ml-3 text-[#F5F5DC]/60 text-sm">Loading filters...</span>
      </div>
    );
  }

  return (
    <article className="mt-4 space-y-4">
      {saveStatus !== 'idle' && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${saveStatus === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {saveStatus === 'success'
            ? <><CheckCircle2 className="w-4 h-4" /> Saved! Browse page will reflect changes immediately.</>
            : <><AlertCircle className="w-4 h-4" /> Save failed. Please check your connection.</>}
        </div>
      )}
      {saving && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E5A823]/10 border border-[#E5A823]/20 text-[#E5A823] text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving to database...
        </div>
      )}

      {/* LOCATION FILTERS */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/80 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#F5F5DC]/80">Location Filters</h3>
            <p className="text-xs text-[#F5F5DC]/40 mt-0.5">State → City → Areas  •  BookMyShow style</p>
          </div>
          <button onClick={() => setShowAddState(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E5A823]/10 text-[#E5A823] text-xs font-semibold hover:bg-[#E5A823]/20 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add State
          </button>
        </div>

        <div className="space-y-2">
          {(filters.locationFilters || []).length === 0 && (
            <div className="py-8 text-center">
              <MapPin className="w-8 h-8 text-[#2A2A2A] mx-auto mb-2" />
              <p className="text-[#F5F5DC]/30 text-sm">No states added yet.</p>
              <button onClick={() => setShowAddState(true)} className="mt-2 text-[#E5A823] text-xs hover:underline">+ Add your first state</button>
            </div>
          )}

          {(filters.locationFilters || []).map((stateFilter, si) => (
            <div key={si} className="rounded-lg border border-[#2A2A2A] bg-[#121212] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5">
                <button onClick={() => setExpandedState(expandedState === si ? null : si)} className="flex items-center gap-2 flex-1 text-left">
                  {expandedState === si ? <ChevronDown className="w-4 h-4 text-[#E5A823]" /> : <ChevronRight className="w-4 h-4 text-[#F5F5DC]/40" />}
                  <MapPin className="w-3.5 h-3.5 text-[#E5A823]" />
                  <span className="text-sm font-semibold text-[#F5F5DC]">{stateFilter.state}</span>
                  <span className="text-xs text-[#F5F5DC]/40">({stateFilter.cities.length} {stateFilter.cities.length === 1 ? 'city' : 'cities'})</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openAddCity(si)} className="px-2 py-1 rounded bg-[#E5A823]/10 text-[#E5A823] text-xs font-medium hover:bg-[#E5A823]/20 transition-colors">+ City</button>
                  <button onClick={() => handleDeleteState(si)} className="p-1.5 rounded bg-[#2A2A2A] text-[#EB4D4B] hover:bg-[#EB4D4B] hover:text-white transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>

              {expandedState === si && (
                <div className="px-3 pb-3 space-y-2 border-t border-[#2A2A2A] pt-2">
                  {stateFilter.cities.length === 0 && (
                    <p className="text-xs text-[#F5F5DC]/30 italic py-2 text-center">No cities. Click "+ City" above.</p>
                  )}
                  {stateFilter.cities.map((city, ci) => {
                    const cityKey = `${si}-${ci}`;
                    const isExpanded = expandedCity === cityKey;
                    const IconComp = getIconComponent(city.icon);
                    return (
                      <div key={ci} className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2">
                          <button onClick={() => setExpandedCity(isExpanded ? null : cityKey)} className="flex items-center gap-2 flex-1 text-left">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#E5A823]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#F5F5DC]/30" />}
                            {city.icon === 'CUSTOM' && city.iconImage
                              ? <img src={city.iconImage} alt="" className="w-3.5 h-3.5 object-contain" />
                              : <IconComp className="w-3.5 h-3.5 text-[#E5A823]/70" />}
                            <span className="text-sm text-[#F5F5DC]">{city.name}</span>
                            <span className="text-xs text-[#F5F5DC]/30">({city.areas.length} areas)</span>
                          </button>
                          <button onClick={() => handleDeleteCity(si, ci)} className="p-1 rounded bg-[#1A1A1A] text-[#EB4D4B] hover:bg-[#EB4D4B] hover:text-white transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>

                        {isExpanded && (
                          <div className="px-3 pb-3 border-t border-[#2A2A2A] pt-2">
                            <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
                              {city.areas.length === 0 && <span className="text-xs text-[#F5F5DC]/20 italic">No areas yet</span>}
                              {city.areas.map((area, ai) => (
                                <span key={ai} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2A2A2A] text-xs text-[#F5F5DC]/70">
                                  {area}
                                  <button onClick={() => handleDeleteArea(si, ci, ai)} className="text-[#EB4D4B] hover:text-white"><X className="w-2.5 h-2.5" /></button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                placeholder="Add area and press Enter..."
                                className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-1.5 text-xs outline-none focus:border-[#E5A823] transition"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value;
                                    if (val.trim()) { handleAddArea(si, ci, val); (e.target as HTMLInputElement).value = ''; }
                                  }
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  const inp = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                  if (inp.value.trim()) { handleAddArea(si, ci, inp.value); inp.value = ''; }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#E5A823] text-[#0D0D0D] text-xs font-bold hover:bg-[#F5C542] transition-colors"
                              >Add</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/80 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#F5F5DC]/80">Event Categories</h3>
          <button onClick={() => { setEditingCategoryIndex(null); setCategoryForm({ name: '', icon: 'Mic', subFilters: [] }); setIsEditingCategory(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E5A823]/10 text-[#E5A823] text-xs font-semibold hover:bg-[#E5A823]/20 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        </div>
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {filters.categories.map((cat, index) => {
            const IconComp = getIconComponent(cat.icon);
            return (
              <li key={index} onClick={() => openEditCategory(index)}
                className="cursor-pointer flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#121212] p-3 hover:bg-[#2A2A2A]/40 transition-colors">
                <div className="flex items-center gap-2">
                  {cat.icon === 'CUSTOM' && cat.iconImage ? <img src={cat.iconImage} alt="" className="w-4 h-4 object-contain" /> : <IconComp className="w-4 h-4 text-[#E5A823]" />}
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-xs text-[#F5F5DC]/40">({cat.subFilters.length} sub-filters)</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(index); }}
                  className="p-1.5 rounded-lg bg-[#2A2A2A] text-[#EB4D4B] hover:bg-[#EB4D4B] hover:text-white transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ADD STATE MODAL */}
      {showAddState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#2A2A2A] bg-[#101018] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#F5F5DC]">Add State</h3>
              <button onClick={() => setShowAddState(false)} className="p-1.5 rounded-lg bg-[#2A2A2A] text-[#F5F5DC]/70"><X className="w-4 h-4" /></button>
            </div>
            <label className="block text-xs text-[#F5F5DC]/60 mb-1">State Name</label>
            <input value={newStateName} onChange={(e) => setNewStateName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddState()}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none focus:border-[#E5A823] transition mb-4"
              placeholder="e.g., Karnataka" autoFocus />
            <div className="flex gap-2">
              <button onClick={handleAddState} className="flex-1 rounded-lg bg-[#E5A823] px-4 py-2 text-sm font-bold text-[#0D0D0D] hover:bg-[#F5C542] transition">Add State</button>
              <button onClick={() => setShowAddState(false)} className="px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm text-[#F5F5DC]/70 hover:bg-[#2A2A2A] transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CITY MODAL */}
      {showAddCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#101018] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#F5F5DC]">
                Add City {addCityToStateIndex !== null ? `to ${(filters.locationFilters || [])[addCityToStateIndex]?.state}` : ''}
              </h3>
              <button onClick={() => setShowAddCity(false)} className="p-1.5 rounded-lg bg-[#2A2A2A] text-[#F5F5DC]/70"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="block text-xs text-[#F5F5DC]/60 mb-1">City Name</label>
                <input value={cityForm.name} onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none focus:border-[#E5A823] transition"
                  placeholder="e.g., Bangalore" autoFocus />
              </div>
              <div>
                <label className="block text-xs text-[#F5F5DC]/60 mb-1">Areas (optional)</label>
                <div className="flex gap-2 mb-2">
                  <input value={newArea} onChange={(e) => setNewArea(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && newArea.trim()) { setCityForm({ ...cityForm, areas: [...cityForm.areas, newArea.trim()] }); setNewArea(''); } }}
                    className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none focus:border-[#E5A823] transition" placeholder="Add area..." />
                  <button onClick={() => { if (newArea.trim()) { setCityForm({ ...cityForm, areas: [...cityForm.areas, newArea.trim()] }); setNewArea(''); } }}
                    className="px-3 py-2 rounded-lg bg-[#E5A823] text-[#0D0D0D] font-bold hover:bg-[#F5C542] transition"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {cityForm.areas.map((a, ai) => (
                    <span key={ai} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2A2A2A] text-xs text-[#F5F5DC]">
                      {a}<button onClick={() => setCityForm({ ...cityForm, areas: cityForm.areas.filter((_, i) => i !== ai) })} className="text-[#EB4D4B]"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={handleSaveCity} className="flex-1 rounded-lg bg-[#E5A823] px-4 py-2 text-sm font-bold text-[#0D0D0D] hover:bg-[#F5C542] transition">Add City</button>
                <button onClick={() => setShowAddCity(false)} className="px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm text-[#F5F5DC]/70 hover:bg-[#2A2A2A] transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {isEditingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#101018] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#F5F5DC]">{editingCategoryIndex !== null ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => { setIsEditingCategory(false); setEditingCategoryIndex(null); }} className="p-1.5 rounded-lg bg-[#2A2A2A] text-[#F5F5DC]/70"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="block text-xs text-[#F5F5DC]/60 mb-1">Category Name</label>
                <input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none focus:border-[#E5A823] transition" placeholder="e.g., Gigs" />
              </div>
              <div>
                <label className="block text-xs text-[#F5F5DC]/60 mb-1">Icon</label>
                <select value={categoryForm.icon} onChange={(e) => { setCategoryForm({ ...categoryForm, icon: e.target.value }); if (e.target.value !== 'CUSTOM') setCategoryIconFile(''); }}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none focus:border-[#E5A823] transition">
                  {availableIcons.map(icon => <option key={icon.name} value={icon.name}>{icon.label}</option>)}
                </select>
              </div>
              {categoryForm.icon === 'CUSTOM' && (
                <div>
                  <label className="block text-xs text-[#F5F5DC]/60 mb-1">Upload PNG Icon</label>
                  <input type="file" accept=".png,.jpg,.jpeg,.webp" id="cat-icon-upload" className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) { const r = new FileReader(); r.onloadend = () => setCategoryIconFile(r.result as string); r.readAsDataURL(file); } }} />
                  <label htmlFor="cat-icon-upload" className="block cursor-pointer rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm text-center text-[#F5F5DC]/60 hover:bg-[#2A2A2A] transition">
                    {categoryIconFile ? 'Change Image' : 'Select Image'}
                  </label>
                  {categoryIconFile && <img src={categoryIconFile} alt="" className="mt-2 w-8 h-8 object-contain" />}
                </div>
              )}
              <div>
                <label className="block text-xs text-[#F5F5DC]/60 mb-1">Sub-Filters</label>
                <div className="flex gap-2 mb-2">
                  <input value={newSubFilter} onChange={(e) => setNewSubFilter(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && newSubFilter.trim()) { setCategoryForm({ ...categoryForm, subFilters: [...categoryForm.subFilters, newSubFilter.trim()] }); setNewSubFilter(''); } }}
                    className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none focus:border-[#E5A823] transition" placeholder="Add sub-filter..." />
                  <button onClick={() => { if (newSubFilter.trim()) { setCategoryForm({ ...categoryForm, subFilters: [...categoryForm.subFilters, newSubFilter.trim()] }); setNewSubFilter(''); } }}
                    className="px-3 py-2 rounded-lg bg-[#E5A823] text-[#0D0D0D] font-bold hover:bg-[#F5C542] transition"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {categoryForm.subFilters.map((sub, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2A2A2A] text-xs text-[#F5F5DC]">
                      {sub}<button onClick={() => setCategoryForm({ ...categoryForm, subFilters: categoryForm.subFilters.filter((_, i) => i !== idx) })} className="text-[#EB4D4B]"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={handleSaveCategory} className="flex-1 rounded-lg bg-[#E5A823] px-4 py-2 text-sm font-bold text-[#0D0D0D] hover:bg-[#F5C542] transition">
                  {editingCategoryIndex !== null ? 'Save Changes' : 'Add Category'}
                </button>
                <button onClick={() => { setIsEditingCategory(false); setEditingCategoryIndex(null); }}
                  className="px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm text-[#F5F5DC]/70 hover:bg-[#2A2A2A] transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
