'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, MapPin, Calendar, Tag, Mic, PartyPopper, Disc, Smile, Drama, Palette, Building2, LucideIcon } from 'lucide-react';

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

  useEffect(() => {
    setFilters(getStoredFilters());
  }, []);


  const handleSaveCategory = () => {
    if (!categoryForm.name.trim()) return;
    let updated: BrowseFiltersData;
    if (editingCategoryIndex !== null) {
      updated = {
        ...filters,
        categories: filters.categories.map((cat, i) => i === editingCategoryIndex ? categoryForm : cat),
      };
    } else {
      updated = {
        ...filters,
        categories: [...filters.categories, categoryForm],
      };
    }
    setFilters(updated);
    saveFilters(updated);
    setIsEditingCategory(false);
    setEditingCategoryIndex(null);
    setCategoryForm({ name: '', icon: 'Mic', subFilters: [] });
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
    setCategoryForm(filters.categories[index]);
    setIsEditingCategory(true);
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
                  <IconComponent className="w-4 h-4 text-[#E5A823]" />
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
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                >
                  {availableIcons.map((icon) => (
                    <option key={icon.name} value={icon.name}>{icon.label}</option>
                  ))}
                </select>
              </div>
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
    </article>
  );
}
