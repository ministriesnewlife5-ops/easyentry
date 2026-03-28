'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, MapPin, Calendar, Tag, Mic, PartyPopper, Disc, Smile, Drama, Palette, Building2, LucideIcon } from 'lucide-react';

type Category = {
  name: string;
  icon: string;
  iconImage?: string;
  subFilters: string[];
};

type CityFilter = {
  name: string;
  icon: string;
  iconImage?: string;
  areas: string[];
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
  cityFilters: CityFilter[];
};

const STORAGE_KEY = 'easyentry.browse-filters';

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
      // Ensure all required properties exist
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

function saveFilters(data: BrowseFiltersData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving filters:', e);
  }
}

export default function BrowseFiltersManager() {
  const [filters, setFilters] = useState<BrowseFiltersData>(defaultFilters);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState<Category>({ name: '', icon: 'Mic', subFilters: [] });
  const [newSubFilter, setNewSubFilter] = useState('');
  const [categoryIconFile, setCategoryIconFile] = useState<string>('');
  
  // City filters state
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [editingCityIndex, setEditingCityIndex] = useState<number | null>(null);
  const [cityForm, setCityForm] = useState<CityFilter>({ name: '', icon: 'MapPin', areas: [] });
  const [newArea, setNewArea] = useState('');
  const [cityIconFile, setCityIconFile] = useState<string>('');

  useEffect(() => {
    setFilters(getStoredFilters());
  }, []);


  const handleSaveCategory = () => {
    if (!categoryForm.name.trim()) return;
    // Require icon image when CUSTOM is selected
    if (categoryForm.icon === 'CUSTOM' && !categoryIconFile) {
      alert('Please upload a custom icon image');
      return;
    }
    const formData: Category = {
      ...categoryForm,
      iconImage: categoryForm.icon === 'CUSTOM' ? categoryIconFile : undefined,
    };
    let updated: BrowseFiltersData;
    if (editingCategoryIndex !== null) {
      updated = {
        ...filters,
        categories: filters.categories.map((cat, i) => i === editingCategoryIndex ? formData : cat),
      };
    } else {
      updated = {
        ...filters,
        categories: [...filters.categories, formData],
      };
    }
    setFilters(updated);
    saveFilters(updated);
    setIsEditingCategory(false);
    setEditingCategoryIndex(null);
    setCategoryForm({ name: '', icon: 'Mic', subFilters: [] });
    setCategoryIconFile('');
  };

  const handleDeleteCategory = (index: number) => {
    const updated = {
      ...filters,
      categories: filters.categories.filter((_, i) => i !== index),
    };
    setFilters(updated);
    saveFilters(updated);
  };

  const handleAddSubFilter = () => {
    if (!newSubFilter.trim()) return;
    setCategoryForm({
      ...categoryForm,
      subFilters: [...categoryForm.subFilters, newSubFilter.trim()],
    });
    setNewSubFilter('');
  };

  const handleRemoveSubFilter = (index: number) => {
    setCategoryForm({
      ...categoryForm,
      subFilters: categoryForm.subFilters.filter((_, i) => i !== index),
    });
  };

  const openEditCategory = (index: number) => {
    setEditingCategoryIndex(index);
    const cat = filters.categories[index];
    setCategoryForm(cat);
    setCategoryIconFile(cat.iconImage || '');
    setIsEditingCategory(true);
  };

  // City filter handlers
  const handleSaveCity = () => {
    if (!cityForm.name.trim()) return;
    const formData: CityFilter = {
      ...cityForm,
      iconImage: cityForm.icon === 'CUSTOM' ? cityIconFile : undefined,
    };
    let updated: BrowseFiltersData;
    if (editingCityIndex !== null) {
      updated = {
        ...filters,
        cityFilters: filters.cityFilters.map((city, i) => i === editingCityIndex ? formData : city),
      };
    } else {
      updated = {
        ...filters,
        cityFilters: [...filters.cityFilters, formData],
      };
    }
    setFilters(updated);
    saveFilters(updated);
    setIsEditingCity(false);
    setEditingCityIndex(null);
    setCityForm({ name: '', icon: 'MapPin', areas: [] });
    setCityIconFile('');
  };

  const handleDeleteCity = (index: number) => {
    const updated = {
      ...filters,
      cityFilters: filters.cityFilters.filter((_, i) => i !== index),
    };
    setFilters(updated);
    saveFilters(updated);
  };

  const handleAddArea = () => {
    if (!newArea.trim()) return;
    setCityForm({
      ...cityForm,
      areas: [...cityForm.areas, newArea.trim()],
    });
    setNewArea('');
  };

  const handleRemoveArea = (index: number) => {
    setCityForm({
      ...cityForm,
      areas: cityForm.areas.filter((_, i) => i !== index),
    });
  };

  const openEditCity = (index: number) => {
    setEditingCityIndex(index);
    const city = filters.cityFilters[index];
    setCityForm(city);
    setCityIconFile(city.iconImage || '');
    setIsEditingCity(true);
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || MapPin;
  };

  return (
    <article className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
      {/* Categories with Sub-Filters Section */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/80 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#F5F5DC]/80">Categories with Sub-Filters</h3>
          <button
            onClick={() => {
              setEditingCategoryIndex(null);
              setCategoryForm({ name: '', icon: 'Mic', subFilters: [] });
              setIsEditingCategory(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E5A823]/10 text-[#E5A823] text-xs font-semibold hover:bg-[#E5A823]/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Category
          </button>
        </div>
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {filters.categories.map((cat, index) => {
            const IconComponent = getIconComponent(cat.icon);
            return (
              <li 
                key={index} 
                onClick={() => openEditCategory(index)}
                className="cursor-pointer flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#121212] p-3 hover:bg-[#2A2A2A]/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {cat.icon === 'CUSTOM' && cat.iconImage ? (
                    <img src={cat.iconImage} alt={cat.name} className="w-4 h-4 object-contain" />
                  ) : (
                    <IconComponent className="w-4 h-4 text-[#E5A823]" />
                  )}
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-xs text-[#F5F5DC]/50">({cat.subFilters.length} sub-filters)</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(index);
                  }}
                  className="p-1.5 rounded-lg bg-[#2A2A2A] text-[#EB4D4B] hover:bg-[#EB4D4B] hover:text-white transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* City Filters Section */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/80 p-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#F5F5DC]/80">City Filters with Areas</h3>
          <button
            onClick={() => {
              setEditingCityIndex(null);
              setCityForm({ name: '', icon: 'MapPin', areas: [] });
              setIsEditingCity(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E5A823]/10 text-[#E5A823] text-xs font-semibold hover:bg-[#E5A823]/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add City
          </button>
        </div>
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {filters.cityFilters.map((city, index) => {
            const IconComponent = getIconComponent(city.icon);
            return (
              <li 
                key={index} 
                onClick={() => openEditCity(index)}
                className="cursor-pointer flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#121212] p-3 hover:bg-[#2A2A2A]/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {city.icon === 'CUSTOM' && city.iconImage ? (
                    <img src={city.iconImage} alt={city.name} className="w-4 h-4 object-contain" />
                  ) : (
                    <IconComponent className="w-4 h-4 text-[#E5A823]" />
                  )}
                  <span className="text-sm font-medium">{city.name}</span>
                  <span className="text-xs text-[#F5F5DC]/50">({city.areas.length} areas)</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCity(index);
                  }}
                  className="p-1.5 rounded-lg bg-[#2A2A2A] text-[#EB4D4B] hover:bg-[#EB4D4B] hover:text-white transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>


      {/* Edit Category (with Sub-Filters) Modal */}
      {isEditingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#101018] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#F5F5DC]">
                {editingCategoryIndex !== null ? 'Edit Category' : 'Add Category'}
              </h3>
              <button
                onClick={() => {
                  setIsEditingCategory(false);
                  setEditingCategoryIndex(null);
                }}
                className="p-1.5 rounded-lg bg-[#2A2A2A] text-[#F5F5DC]/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">Category Name</label>
                <input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                  placeholder="e.g., Gigs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">Icon</label>
                <select
                  value={categoryForm.icon}
                  onChange={(e) => {
                    setCategoryForm({ ...categoryForm, icon: e.target.value });
                    if (e.target.value !== 'CUSTOM') {
                      setCategoryIconFile('');
                    }
                  }}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                >
                  {availableIcons.map((icon) => (
                    <option key={icon.name} value={icon.name}>{icon.label}</option>
                  ))}
                </select>
              </div>
              {categoryForm.icon === 'CUSTOM' && (
                <div>
                  <label className="mb-1 block text-xs text-[#F5F5DC]/60">Upload PNG Icon</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCategoryIconFile(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="category-icon-upload"
                    />
                    <label
                      htmlFor="category-icon-upload"
                      className="flex-1 cursor-pointer rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm text-[#F5F5DC]/70 hover:bg-[#2A2A2A] transition-colors text-center"
                    >
                      {categoryIconFile ? 'Change Image' : 'Select PNG Image'}
                    </label>
                    {categoryIconFile && (
                      <button
                        onClick={() => setCategoryIconFile('')}
                        className="p-2 rounded-lg bg-[#2A2A2A] text-[#EB4D4B] hover:bg-[#EB4D4B] hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {categoryIconFile && (
                    <div className="mt-2 p-2 rounded-lg border border-[#2A2A2A] bg-[#161616]">
                      <img src={categoryIconFile} alt="Custom icon preview" className="w-8 h-8 object-contain" />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">Sub-Filters</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={newSubFilter}
                    onChange={(e) => setNewSubFilter(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubFilter()}
                    className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                    placeholder="Add sub-filter..."
                  />
                  <button
                    onClick={handleAddSubFilter}
                    className="px-3 py-2 rounded-lg bg-[#E5A823] text-[#0D0D0D] text-sm font-semibold hover:bg-[#F5C542] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {categoryForm.subFilters.map((sub, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#2A2A2A] text-xs text-[#F5F5DC]"
                    >
                      {sub}
                      <button
                        onClick={() => handleRemoveSubFilter(idx)}
                        className="text-[#EB4D4B] hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveCategory}
                  className="flex-1 rounded-lg bg-[#E5A823] px-4 py-2 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F5C542]"
                >
                  {editingCategoryIndex !== null ? 'Save Changes' : 'Add Category'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingCategory(false);
                    setEditingCategoryIndex(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm font-semibold text-[#F5F5DC]/70 hover:bg-[#2A2A2A] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit City (with Areas) Modal */}
      {isEditingCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#101018] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#F5F5DC]">
                {editingCityIndex !== null ? 'Edit City' : 'Add City'}
              </h3>
              <button
                onClick={() => {
                  setIsEditingCity(false);
                  setEditingCityIndex(null);
                }}
                className="p-1.5 rounded-lg bg-[#2A2A2A] text-[#F5F5DC]/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">City Name</label>
                <input
                  value={cityForm.name}
                  onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                  placeholder="e.g., Chennai"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">Icon</label>
                <select
                  value={cityForm.icon}
                  onChange={(e) => {
                    setCityForm({ ...cityForm, icon: e.target.value });
                    if (e.target.value !== 'CUSTOM') {
                      setCityIconFile('');
                    }
                  }}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                >
                  {availableIcons.map((icon) => (
                    <option key={icon.name} value={icon.name}>{icon.label}</option>
                  ))}
                </select>
              </div>
              {cityForm.icon === 'CUSTOM' && (
                <div>
                  <label className="mb-1 block text-xs text-[#F5F5DC]/60">Upload PNG Icon</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCityIconFile(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="city-icon-upload"
                    />
                    <label
                      htmlFor="city-icon-upload"
                      className="flex-1 cursor-pointer rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm text-[#F5F5DC]/70 hover:bg-[#2A2A2A] transition-colors text-center"
                    >
                      {cityIconFile ? 'Change Image' : 'Select PNG Image'}
                    </label>
                    {cityIconFile && (
                      <button
                        onClick={() => setCityIconFile('')}
                        className="p-2 rounded-lg bg-[#2A2A2A] text-[#EB4D4B] hover:bg-[#EB4D4B] hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {cityIconFile && (
                    <div className="mt-2 p-2 rounded-lg border border-[#2A2A2A] bg-[#161616]">
                      <img src={cityIconFile} alt="Custom icon preview" className="w-8 h-8 object-contain" />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">Areas</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
                    className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                    placeholder="Add area..."
                  />
                  <button
                    onClick={handleAddArea}
                    className="px-3 py-2 rounded-lg bg-[#E5A823] text-[#0D0D0D] text-sm font-semibold hover:bg-[#F5C542] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {cityForm.areas.map((area, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#2A2A2A] text-xs text-[#F5F5DC]"
                    >
                      {area}
                      <button
                        onClick={() => handleRemoveArea(idx)}
                        className="text-[#EB4D4B] hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveCity}
                  className="flex-1 rounded-lg bg-[#E5A823] px-4 py-2 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F5C542]"
                >
                  {editingCityIndex !== null ? 'Save Changes' : 'Add City'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingCity(false);
                    setEditingCityIndex(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm font-semibold text-[#F5F5DC]/70 hover:bg-[#2A2A2A] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
