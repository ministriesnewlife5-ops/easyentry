'use client';

import { useState, useEffect } from 'react';
import { ImageIcon, Pencil, Trash2, X, Plus } from 'lucide-react';

type Banner = {
  id: number;
  tag: string;
  title: string;
  description: string;
  image: string;
  buttonLabel: string;
  buttonLink: string;
};

const STORAGE_KEY = 'easyentry.promo-banners';

function getStoredBanners(): Banner[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading banners:', e);
    return [];
  }
}

function saveBanners(banners: Banner[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(banners));
  } catch (e) {
    console.error('Error saving banners:', e);
  }
}

export default function AdsBannerManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<Banner>>({
    tag: '',
    title: '',
    description: '',
    image: '',
    buttonLabel: '',
    buttonLink: '',
  });
  const [previewImage, setPreviewImage] = useState<string>('');

  useEffect(() => {
    setBanners(getStoredBanners());
  }, []);

  const handleDelete = (id: number) => {
    const updated = banners.filter(b => b.id !== id);
    setBanners(updated);
    saveBanners(updated);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData(banner);
    setPreviewImage(banner.image);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingBanner(null);
    setPreviewImage('');
    setFormData({
      tag: '',
      title: '',
      description: '',
      image: '',
      buttonLabel: '',
      buttonLink: '',
    });
  };

  const handleCancel = () => {
    setEditingBanner(null);
    setIsCreating(false);
    setPreviewImage('');
    setFormData({
      tag: '',
      title: '',
      description: '',
      image: '',
      buttonLabel: '',
      buttonLink: '',
    });
  };

  const handleSave = () => {
    if (editingBanner) {
      const updated = banners.map(b => b.id === editingBanner.id ? { ...formData, id: editingBanner.id } as Banner : b);
      setBanners(updated);
      saveBanners(updated);
      setEditingBanner(null);
    } else if (isCreating) {
      const newBanner: Banner = {
        ...formData as Banner,
        id: Date.now(),
      };
      const updated = [...banners, newBanner];
      setBanners(updated);
      saveBanners(updated);
      setIsCreating(false);
    }
    setFormData({
      tag: '',
      title: '',
      description: '',
      image: '',
      buttonLabel: '',
      buttonLink: '',
    });
    setPreviewImage('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewImage(result);
        setFormData({ ...formData, image: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const isFormOpen = editingBanner !== null || isCreating;

  return (
    <article className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/80 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#F5F5DC]/80">Existing Banners</h3>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E5A823]/10 text-[#E5A823] text-xs font-semibold hover:bg-[#E5A823]/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Banner
            </button>
          </div>
          <ul className="space-y-3">
            {banners.map((banner) => (
              <li key={banner.id} className="rounded-lg border border-[#2A2A2A] bg-[#121212] p-3 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#E5A823]">{banner.tag}</p>
                    <p className="mt-1 font-semibold truncate">{banner.title}</p>
                    <p className="mt-1 text-sm text-[#F5F5DC]/65 line-clamp-2">{banner.description}</p>
                    <p className="mt-1 text-xs text-[#F5F5DC]/50">Btn: {banner.buttonLabel} → {banner.buttonLink}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(banner)}
                      className="p-1.5 rounded-lg bg-[#2A2A2A] text-[#F5F5DC]/70 hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="p-1.5 rounded-lg bg-[#2A2A2A] text-[#EB4D4B] hover:bg-[#EB4D4B] hover:text-white transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {banners.length === 0 && (
              <li className="text-center py-8 text-[#F5F5DC]/50">
                No banners created yet
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/80 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#F5F5DC]/80">
              {isCreating ? 'Create New Banner' : editingBanner ? 'Edit Banner' : 'Banner Preview'}
            </h3>
            {isFormOpen && (
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-lg bg-[#2A2A2A] text-[#F5F5DC]/70 hover:bg-[#EB4D4B] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isFormOpen ? (
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">Banner Tag</label>
                <input
                  value={formData.tag || ''}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                  placeholder="e.g., Exclusive, New Feature"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">Headline</label>
                <input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                  placeholder="Banner headline"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                  placeholder="Banner description"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">
                  Banner Image <span className="text-[#F5F5DC]/40">(Recommended: 1200 x 400 px)</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823] file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#E5A823] file:text-black hover:file:bg-[#F5C542]"
                  />
                </div>
                {previewImage && (
                  <div className="mt-2 relative w-full h-24 rounded-lg overflow-hidden border border-[#2A2A2A]">
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">Button Label</label>
                <input
                  value={formData.buttonLabel || ''}
                  onChange={(e) => setFormData({ ...formData, buttonLabel: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                  placeholder="e.g., EXPLORE EVENTS"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#F5F5DC]/60">Button Link (URL)</label>
                <input
                  value={formData.buttonLink || ''}
                  onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]"
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 rounded-lg bg-[#E5A823] px-4 py-2 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F5C542]"
                >
                  {editingBanner ? 'Save Changes' : 'Create Banner'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm font-semibold text-[#F5F5DC]/70 hover:bg-[#2A2A2A] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-full bg-[#2A2A2A] flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-[#F5F5DC]/30" />
              </div>
              <p className="text-[#F5F5DC]/50 text-sm">Select a banner to edit or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
