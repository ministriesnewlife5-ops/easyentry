'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Calendar, Clock3, ImageIcon, IndianRupee, Info, MapPin, Percent, Sparkles, Ticket, Upload, X, Loader2, Users } from 'lucide-react';
import DragDropUpload from '@/components/ui/DragDropUpload';

type EventTemplate = {
  id: string | number;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  category: string;
  image: string;
  description: string;
  fullDescription: string;
  gatesOpen: string;
  entryAge: string;
  layout: string;
  seating: string;
};

type TicketCategory = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  commissionPercent: number;
  availableFrom?: string;
  availableUntil?: string;
};

export default function OutletHostEventPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [eventImages, setEventImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [numberOfTickets, setNumberOfTickets] = useState('');
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([]);
  const [websiteEventTemplates, setWebsiteEventTemplates] = useState<EventTemplate[]>([]);
  const [eventData, setEventData] = useState({
    title: '',
    subtitle: '',
    date: '',
    time: '',
    venue: '',
    googleMapsLink: '',
    category: '',
    price: '',
    image: '',
    description: '',
    fullDescription: '',
    gatesOpen: '',
    entryAge: '21+',
    layout: 'Indoor Club',
    seating: 'Standing',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated' && session?.user?.role !== 'outlet') {
      router.push('/events');
    }
  }, [status, session, router]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch('/api/events', { cache: 'no-store' });
        if (!response.ok) {
          setWebsiteEventTemplates([]);
          return;
        }

        const data = await response.json();
        const detailedEvents = Array.isArray(data.detailedEvents) ? data.detailedEvents : [];

        const templates: EventTemplate[] = detailedEvents.map((event: any) => ({
          id: String(event.id),
          title: event.title || 'Untitled Event',
          subtitle: event.subtitle || '',
          date: event.date || '',
          time: event.time || '',
          venue: event.venue || '',
          price: event.price ? `₹${String(event.price).replace(/^₹/, '')}` : '₹0',
          category: event.category || '',
          image: event.image || '',
          description: event.description || '',
          fullDescription: event.fullDescription || event.description || '',
          gatesOpen: event.gatesOpen || '',
          entryAge: event.entryAge || '21+',
          layout: event.layout || 'Indoor Club',
          seating: event.seating || 'Standing',
        }));

        setWebsiteEventTemplates(templates);
      } catch {
        setWebsiteEventTemplates([]);
      }
    };

    loadTemplates();
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = websiteEventTemplates.find((item) => String(item.id) === templateId);
    if (!template) return;
    setEventData({
      title: template.title,
      subtitle: template.subtitle,
      date: template.date,
      time: template.time,
      venue: template.venue,
      googleMapsLink: template.venue
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(template.venue)}`
        : '',
      category: template.category,
      price: template.price,
      image: template.image,
      description: template.description,
      fullDescription: template.fullDescription,
      gatesOpen: template.gatesOpen,
      entryAge: template.entryAge,
      layout: template.layout,
      seating: template.seating,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEventData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setEventImages((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const addTicketCategory = () => {
    const category: TicketCategory = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      quantity: 0,
      commissionPercent: 0,
      availableFrom: undefined,
      availableUntil: undefined,
    };
    setTicketCategories([...ticketCategories, category]);
  };

  const removeTicketCategory = (categoryId: string) => {
    setTicketCategories(ticketCategories.filter(c => c.id !== categoryId));
  };

  const updateTicketCategory = (categoryId: string, updates: Partial<TicketCategory>) => {
    setTicketCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? { ...category, ...updates }
          : category
      )
    );
  };

  const removeImageAt = (indexToRemove: number) => {
    setEventImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // Derived totals for the summary preview
  const totalTicketsFromCategories = ticketCategories.reduce((sum, t) => sum + t.quantity, 0);
  const estimatedTotalRevenue = ticketCategories.reduce((sum, t) => sum + t.price * t.quantity, 0);
  const estimatedTotalCommission = ticketCategories.reduce(
    (sum, t) => sum + (t.price * t.commissionPercent / 100) * t.quantity,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Enrich ticket categories with computed commissionAmount
      const enrichedTicketCategories = ticketCategories.map((t) => ({
        ...t,
        commissionAmount: parseFloat(((t.price * t.commissionPercent) / 100).toFixed(2)),
      }));

      const response = await fetch('/api/admin/event-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventData: {
            title: eventData.title,
            subtitle: eventData.subtitle,
            date: eventData.date,
            time: eventData.time,
            venue: eventData.venue,
            googleMapsLink: eventData.googleMapsLink,
            category: eventData.category,
            price: eventData.price,
            image: eventData.image,
            description: eventData.description,
            fullDescription: eventData.fullDescription,
            gatesOpen: eventData.gatesOpen,
            entryAge: eventData.entryAge,
            layout: eventData.layout,
            seating: eventData.seating,
            numberOfTickets: numberOfTickets ? parseInt(numberOfTickets) : totalTicketsFromCategories,
            ticketCategories: enrichedTicketCategories,
            // Commission summary fields
            commissionPercent: enrichedTicketCategories.length > 0
              ? enrichedTicketCategories[0].commissionPercent   // keep first as a reference, full detail is in each tier
              : 0,
            estimatedTotalRevenue,
            estimatedTotalCommission,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubmitMessage({
          type: 'success',
          text: data.adminNotificationSent
            ? 'Event request submitted successfully. It is now in the admin dashboard and has been emailed to admin for approval.'
            : 'Event request submitted successfully. It is now in the admin dashboard and waiting for admin approval.',
        });
        setEventData({ title: '', subtitle: '', date: '', time: '', venue: '', googleMapsLink: '', category: '', price: '', image: '', description: '', fullDescription: '', gatesOpen: '', entryAge: '21+', layout: 'Indoor Club', seating: 'Standing' });
        setSelectedTemplate('');
        setEventImages([]);
        setNumberOfTickets('');
        setTicketCategories([]);
      } else {
        const errorData = await response.json();
        setSubmitMessage({ type: 'error', text: errorData.error || 'Failed to submit event request' });
      }
    } catch {
      setSubmitMessage({ type: 'error', text: 'An error occurred while submitting the request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">Loading...</div>;
  }

  if (!session?.user || session.user.role !== 'outlet') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#101018] p-6 md:p-8">
          <h1 className="text-3xl font-bold text-[#E5A823]">Host Event</h1>
          <p className="mt-2 text-sm text-[#F5F5DC]/65">Use templates from existing website events, then customize your listing.</p>

          <div className="mt-6 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/70 p-4">
            <label className="block text-sm font-medium mb-2">Start from website event template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
            >
              <option value="">Select template</option>
              {websiteEventTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title} · {template.venue}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">

            {/* ── Basic Information ── */}
            <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/70 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4 text-[#E5A823]">
                <Info className="w-4 h-4" />
                <h2 className="font-semibold">Basic Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">Event Title</label>
                  <input name="title" value={eventData.title} onChange={handleInputChange} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">Subtitle</label>
                  <input name="subtitle" value={eventData.subtitle} onChange={handleInputChange} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                </div>
                <div>
                  <label className="block text-sm mb-2">Category</label>
                  <select name="category" value={eventData.category} onChange={handleInputChange} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#E5A823]">
                    <option value="">Select category</option>
                    <option value="Commercial">Commercial</option>
                    <option value="EDM">EDM</option>
                    <option value="Bollywood">Bollywood</option>
                    <option value="Techno">Techno</option>
                    <option value="Live">Live</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Ticket Price (base / display)</label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/55" />
                    <input name="price" value={eventData.price} onChange={handleInputChange} required placeholder="₹1500" className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Schedule & Venue ── */}
            <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/70 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4 text-[#E5A823]">
                <Calendar className="w-4 h-4" />
                <h2 className="font-semibold">Schedule & Venue</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Event Date</label>
                  <input type="date" name="date" value={eventData.date} onChange={handleInputChange} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                </div>
                <div>
                  <label className="block text-sm mb-2">Time Slot</label>
                  <div className="relative">
                    <Clock3 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/55" />
                    <input name="time" value={eventData.time} onChange={handleInputChange} required placeholder="22:00 - 04:00" className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">Venue</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/55" />
                    <input name="venue" value={eventData.venue} onChange={handleInputChange} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">Google Maps Link</label>
                  <input
                    name="googleMapsLink"
                    value={eventData.googleMapsLink}
                    onChange={handleInputChange}
                    placeholder="https://maps.google.com/..."
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#E5A823]"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Gates Open</label>
                  <input name="gatesOpen" value={eventData.gatesOpen} onChange={handleInputChange} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                </div>
                <div>
                  <label className="block text-sm mb-2">Entry Allowed</label>
                  <div className="relative">
                    <Ticket className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/55" />
                    <input name="entryAge" value={eventData.entryAge} onChange={handleInputChange} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Experience Details ── */}
            <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/70 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4 text-[#E5A823]">
                <Sparkles className="w-4 h-4" />
                <h2 className="font-semibold">Experience Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Layout</label>
                  <input name="layout" value={eventData.layout} onChange={handleInputChange} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                </div>
                <div>
                  <label className="block text-sm mb-2">Seating Arrangement</label>
                  <input name="seating" value={eventData.seating} onChange={handleInputChange} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">Cover Image URL</label>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/55" />
                    <input name="image" value={eventData.image} onChange={handleInputChange} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">Event Images ({eventImages.length} selected)</label>
                  <DragDropUpload
                    type="image"
                    maxSize={10}
                    onFileSelect={(file) => setEventImages((prev) => [...prev, file])}
                    className="w-full h-24 rounded-xl"
                    label="Drop event images here"
                  />
                  {eventImages.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {eventImages.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2">
                          <span className="truncate text-sm text-[#F5F5DC]/80">{file.name}</span>
                          <button type="button" onClick={() => removeImageAt(index)} className="rounded-md p-1 text-[#F5F5DC]/60 hover:bg-[#2A2A2A] hover:text-[#EB4D4B] transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">Short Description</label>
                  <textarea name="description" value={eventData.description} onChange={handleInputChange} rows={3} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">Full Description</label>
                  <textarea name="fullDescription" value={eventData.fullDescription} onChange={handleInputChange} rows={5} required className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#E5A823]" />
                </div>
              </div>
            </div>

            {/* ── Ticket Details & Commission ── */}
            <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/70 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4 text-[#E5A823]">
                <Ticket className="w-4 h-4" />
                <h2 className="font-semibold">Ticket Details & Commission</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Total Number of Tickets (optional override)</label>
                  <div className="relative">
                    <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/55" />
                    <input
                      type="number"
                      value={numberOfTickets}
                      onChange={(e) => setNumberOfTickets(e.target.value)}
                      placeholder="Auto-calculated from categories below"
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#E5A823]"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-3">Ticket Categories</h3>
                  <div className="space-y-3">
                    {ticketCategories.map((category, index) => {
                      const commAmt = category.price * category.commissionPercent / 100;
                      const totalRev = category.price * category.quantity;
                      const totalComm = commAmt * category.quantity;

                      return (
                        <div key={category.id} className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h4 className="text-sm font-medium text-[#E5A823]">Ticket Category {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeTicketCategory(category.id)}
                              className="text-[#EB4D4B] hover:bg-[#EB4D4B]/10 rounded-lg p-1.5 transition-colors"
                              aria-label="Remove ticket category"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-[#F5F5DC]/70 mb-1">Category Name <span className="text-[#EB4D4B]">*</span></label>
                              <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateTicketCategory(category.id, { name: e.target.value })}
                                placeholder="e.g., General, VIP, Premium"
                                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E5A823]"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[#F5F5DC]/70 mb-1">Price (₹) <span className="text-[#EB4D4B]">*</span></label>
                              <input
                                type="number"
                                value={category.price || ''}
                                onChange={(e) => updateTicketCategory(category.id, { price: parseFloat(e.target.value) || 0 })}
                                placeholder="e.g., 1500"
                                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E5A823]"
                              />
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-[#F5F5DC]/70 mb-1">Quantity <span className="text-[#EB4D4B]">*</span></label>
                              <div className="relative">
                                <Users className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/55" />
                                <input
                                  type="number"
                                  value={category.quantity || ''}
                                  onChange={(e) => updateTicketCategory(category.id, { quantity: parseInt(e.target.value) || 0 })}
                                  placeholder="e.g., 200"
                                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#E5A823]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-[#F5F5DC]/70 mb-1">
                                Commission % <span className="text-[#EB4D4B]">*</span>
                                <span className="ml-1 text-[#F5F5DC]/40">(your cut per ticket sold)</span>
                              </label>
                              <div className="relative">
                                <Percent className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/55" />
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={category.commissionPercent || ''}
                                  onChange={(e) => updateTicketCategory(category.id, { commissionPercent: parseFloat(e.target.value) || 0 })}
                                  placeholder="e.g., 10"
                                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#E5A823]"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-[#F5F5DC]/70 mb-1">Available From (Optional)</label>
                              <input
                                type="datetime-local"
                                value={category.availableFrom || ''}
                                onChange={(e) => updateTicketCategory(category.id, { availableFrom: e.target.value || undefined })}
                                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E5A823]"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[#F5F5DC]/70 mb-1">Available Until (Optional)</label>
                              <input
                                type="datetime-local"
                                value={category.availableUntil || ''}
                                onChange={(e) => updateTicketCategory(category.id, { availableUntil: e.target.value || undefined })}
                                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E5A823]"
                              />
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div className="rounded-md bg-[#0D0D0D] border border-[#2A2A2A] px-3 py-2">
                              <p className="text-xs text-[#F5F5DC]/50">Quantity</p>
                              <p className="font-medium text-[#F5F5DC]">{category.quantity}</p>
                            </div>
                            <div className="rounded-md bg-[#0D0D0D] border border-[#2A2A2A] px-3 py-2">
                              <p className="text-xs text-[#F5F5DC]/50">Per ticket money flow</p>
                              <p className="font-medium text-[#F5F5DC]">Ticket: ₹{category.price.toLocaleString('en-IN')}</p>
                              <p className="text-xs text-emerald-400">Commission: ₹{commAmt.toFixed(2)}</p>
                            </div>
                            <div className="rounded-md bg-[#0D0D0D] border border-[#2A2A2A] px-3 py-2">
                              <p className="text-xs text-[#F5F5DC]/50">Money Flow</p>
                              <p className="font-medium text-[#F5F5DC]">Revenue: ₹{totalRev.toLocaleString('en-IN')}</p>
                              <p className="text-xs text-emerald-400">Commission: ₹{totalComm.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={addTicketCategory}
                      className="w-full bg-[#E5A823]/20 border border-[#E5A823]/40 text-[#E5A823] rounded-lg px-3 py-2 text-sm font-medium hover:bg-[#E5A823]/30 transition-colors"
                    >
                      + Add Ticket Category
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Submit ── */}
            <div className="space-y-4">
              {submitMessage && (
                <div className={`rounded-lg px-4 py-3 ${submitMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-[#EB4D4B]/10 border border-[#EB4D4B]/20 text-[#EB4D4B]'}`}>
                  <p className="text-sm">{submitMessage.text}</p>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#E5A823] px-6 py-3 font-bold text-[#0D0D0D] hover:bg-[#F5C542] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Submitting...' : 'Submit Event Request'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
