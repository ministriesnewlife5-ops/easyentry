'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, Camera, MapPin, Globe, 
  Building2, Edit2, CheckCircle2,
  Instagram, Phone, Mail,
  Users, Loader2, CalendarDays, Clock3, IndianRupee, ExternalLink,
  Plus
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type ActiveTab = 'details' | 'about' | 'events';

type OutletEventItem = {
  requestId: string;
  publicEventId?: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  category: string;
  price: string;
  image: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  lifecycle: 'waiting_approval' | 'upcoming' | 'completed';
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
  isPublished: boolean;
  publicEventUrl?: string;
};

type OutletEventsResponse = {
  upcomingEvents: OutletEventItem[];
  completedEvents: OutletEventItem[];
  waitingApprovalEvents: OutletEventItem[];
};

function OutletProfileContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [eventsData, setEventsData] = useState<OutletEventsResponse>({
    upcomingEvents: [],
    completedEvents: [],
    waitingApprovalEvents: [],
  });
  
  const [formData, setFormData] = useState({
    venueName: '',
    venueType: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    capacity: '',
    website: '',
    instagram: '',
    twitter: '',
    facebook: '',
  });

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (requestedTab === 'events') {
      setActiveTab('events');
      return;
    }

    if (requestedTab === 'about') {
      setActiveTab('about');
      return;
    }

    setActiveTab('details');
  }, [searchParams]);

  const fetchVenueProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/venue/profile');
      const data = await response.json();
      
      if (data.venue) {
        setFormData({
          venueName: data.venue.venueName || '',
          venueType: data.venue.venueType || '',
          email: data.venue.email || '',
          phone: data.venue.phone || '',
          location: data.venue.location || '',
          bio: data.venue.bio || '',
          capacity: data.venue.capacity || '',
          website: data.venue.website || '',
          instagram: data.venue.instagram || '',
          twitter: data.venue.twitter || '',
          facebook: data.venue.facebook || '',
        });
        setProfileImage(data.venue.imageUrl);
        setCoverImage(data.venue.coverImage);
      } else {
        // Pre-fill email from session
        setFormData(prev => ({
          ...prev,
          email: session?.user?.email || '',
        }));
      }
    } catch (error) {
      console.error('Failed to fetch venue profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email]);

  const fetchOutletEvents = useCallback(async () => {
    try {
      setIsEventsLoading(true);
      const response = await fetch('/api/outlet/events', {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch outlet events');
      }

      setEventsData({
        upcomingEvents: data.upcomingEvents || [],
        completedEvents: data.completedEvents || [],
        waitingApprovalEvents: data.waitingApprovalEvents || [],
      });
    } catch (error) {
      console.error('Failed to fetch outlet events:', error);
    } finally {
      setIsEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchVenueProfile();
      fetchOutletEvents();
    }
  }, [status, session, fetchVenueProfile, fetchOutletEvents]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'profile') {
          setProfileImage(reader.result as string);
        } else {
          setCoverImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const venueData = {
        ...formData,
        imageUrl: profileImage,
        coverImage: coverImage,
      };

      const response = await fetch('/api/venue/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(venueData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile saved successfully! Your venue is now visible on the venues page.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save profile' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5A823]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      <div className="bg-[#0D0D0D] border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[#E5A823]">Outlet Profile</h1>
            <span className="text-[#F5F5DC]/50">|</span>
            <span className="text-[#F5F5DC]/70">Manage your venue details</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/seller-form"
              className="px-6 py-2 border-2 border-[#E5A823] text-[#E5A823] font-bold rounded-lg flex items-center gap-2 hover:bg-[#E5A823]/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Host Event
            </Link>
          </div>
        </div>
      </div>

      {message && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {[
              { id: 'details', label: 'Basic Details', icon: Edit2 },
              { id: 'about', label: 'About & Social', icon: Building2 },
              { id: 'events', label: 'Events', icon: CalendarDays },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#E5A823] text-[#E5A823]'
                    : 'border-transparent text-[#F5F5DC]/60 hover:text-[#F5F5DC]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {activeTab === 'details' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#E5A823]" />
                  Venue Images
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Venue Photo</label>
                    <div 
                      onClick={() => profileInputRef.current?.click()}
                      className="relative w-40 h-40 rounded-2xl bg-[#2A2A2A] border-2 border-dashed border-[#E5A823]/30 flex items-center justify-center cursor-pointer hover:border-[#E5A823] transition-colors overflow-hidden"
                    >
                      {profileImage ? (
                        <Image src={profileImage} alt="Profile" fill className="object-cover" />
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-[#E5A823] mx-auto mb-2" />
                          <span className="text-sm text-[#F5F5DC]/50">Upload Venue</span>
                        </div>
                      )}
                    </div>
                    <input ref={profileInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile')} className="hidden" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3">Cover Photo</label>
                    <div 
                      onClick={() => coverInputRef.current?.click()}
                      className="relative w-full h-40 rounded-xl bg-[#2A2A2A] border-2 border-dashed border-[#E5A823]/30 flex items-center justify-center cursor-pointer hover:border-[#E5A823] transition-colors overflow-hidden"
                    >
                      {coverImage ? (
                        <Image src={coverImage} alt="Cover" fill className="object-cover" />
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-[#E5A823] mx-auto mb-2" />
                          <span className="text-sm text-[#F5F5DC]/50">Upload Cover</span>
                        </div>
                      )}
                    </div>
                    <input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} className="hidden" />
                  </div>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#E5A823]" />
                  Venue Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Venue Name *</label>
                    <input type="text" name="venueName" value={formData.venueName} onChange={handleInputChange} required className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Pasha - The Park" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Venue Type *</label>
                    <input type="text" name="venueType" value={formData.venueType} onChange={handleInputChange} required className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Nightclub" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#E5A823]" /> Capacity *
                    </label>
                    <input type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} required min="1" max="10000" className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. 500" />
                    <p className="text-xs text-[#F5F5DC]/40 mt-1">Maximum number of people your venue can hold</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Location *</label>
                    <input type="text" name="location" value={formData.location} onChange={handleInputChange} required className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="e.g. Chennai, Tamil Nadu" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold mb-4">Contact & Social</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#E5A823]" /> Email
                    </label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#E5A823]" /> Phone
                    </label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#E5A823]" /> Website
                    </label>
                    <input type="url" name="website" value={formData.website} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-[#E5A823]" /> Instagram
                    </label>
                    <input type="text" name="instagram" value={formData.instagram} onChange={handleInputChange} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" />
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium mb-2">Bio / Description</label>
                  <textarea name="bio" value={formData.bio} onChange={handleInputChange} rows={6} className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]" placeholder="Tell us about your venue, the kind of events you host..." />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                  <p className="text-sm text-[#F5F5DC]/60">Upcoming Events</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-400">{eventsData.upcomingEvents.length}</p>
                </div>
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                  <p className="text-sm text-[#F5F5DC]/60">Waiting for Approval</p>
                  <p className="mt-2 text-3xl font-bold text-orange-400">{eventsData.waitingApprovalEvents.length}</p>
                </div>
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                  <p className="text-sm text-[#F5F5DC]/60">Completed Events</p>
                  <p className="mt-2 text-3xl font-bold text-[#E5A823]">{eventsData.completedEvents.length}</p>
                </div>
              </div>

              {isEventsLoading ? (
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#E5A823]" />
                  <span className="text-[#F5F5DC]/70">Loading your events...</span>
                </div>
              ) : (
                <>
                  <EventsSection
                    title="Waiting for Approval"
                    description="These requests are sent by you and are still waiting for admin action."
                    events={eventsData.waitingApprovalEvents}
                  />
                  <EventsSection
                    title="Upcoming Events"
                    description="These events are approved and scheduled for today or later."
                    events={eventsData.upcomingEvents}
                  />
                  <EventsSection
                    title="Completed Events"
                    description="These approved events already happened."
                    events={eventsData.completedEvents}
                  />
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="flex justify-end pt-6 border-t border-[#2A2A2A]">
          {activeTab === 'details' && (
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className="px-8 py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              Next: About & Social
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {activeTab === 'about' && (
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-400 text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Save Profile
                </>
              )}
            </button>
          )}
          {activeTab === 'events' && null}
        </div>
      </form>
    </div>
  );
}

function EventsSection({
  title,
  description,
  events,
}: {
  title: string;
  description: string;
  events: OutletEventItem[];
}) {
  return (
    <section className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#F5F5DC]">{title}</h3>
          <p className="mt-1 text-sm text-[#F5F5DC]/55">{description}</p>
        </div>
        <span className="rounded-full border border-[#2A2A2A] bg-[#101018] px-3 py-1 text-xs text-[#F5F5DC]/60">
          {events.length} event{events.length === 1 ? '' : 's'}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#2A2A2A] bg-[#101018] px-4 py-8 text-center text-sm text-[#F5F5DC]/50">
          No events in this section yet.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {events.map((event) => (
            <article key={`${title}-${event.requestId}`} className="rounded-xl border border-[#2A2A2A] bg-[#101018] overflow-hidden">
              <div className="grid gap-5 p-5 lg:grid-cols-[140px_1fr]">
                <div className="relative h-36 overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#2A2A2A]">
                  {event.image ? (
                    <Image src={event.image} alt={event.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#F5F5DC]/40">
                      No image
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xl font-semibold text-[#F5F5DC]">{event.title}</h4>
                        <StatusBadge status={event.status} />
                      </div>
                      <p className="mt-1 text-sm text-[#F5F5DC]/60">{event.subtitle}</p>
                    </div>

                    {event.publicEventUrl && (
                      <Link
                        href={event.publicEventUrl}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E5A823]/40 bg-[#E5A823]/10 px-3 py-2 text-sm font-medium text-[#E5A823] hover:bg-[#E5A823]/20"
                      >
                        View live event
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InfoItem icon={<CalendarDays className="w-4 h-4 text-[#E5A823]" />} label="Date" value={event.date} />
                    <InfoItem icon={<Clock3 className="w-4 h-4 text-[#E5A823]" />} label="Time" value={event.time} />
                    <InfoItem icon={<MapPin className="w-4 h-4 text-[#E5A823]" />} label="Venue" value={event.venue} />
                    <InfoItem icon={<IndianRupee className="w-4 h-4 text-[#E5A823]" />} label="Price" value={event.price} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <MetaItem label="Category" value={event.category} />
                    <MetaItem label="Submitted" value={new Date(event.submittedAt).toLocaleString()} />
                    <MetaItem label="Reviewed By" value={event.reviewedBy || 'Pending'} />
                    <MetaItem label="Reviewed At" value={event.reviewedAt ? new Date(event.reviewedAt).toLocaleString() : 'Pending'} />
                  </div>

                  <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                    <p className="text-xs uppercase tracking-wide text-[#F5F5DC]/45">Description</p>
                    <p className="mt-2 text-sm leading-6 text-[#F5F5DC]/75">{event.description}</p>
                  </div>

                  {event.rejectionReason && (
                    <div className="rounded-xl border border-[#EB4D4B]/20 bg-[#EB4D4B]/10 p-4 text-sm text-[#FF8A87]">
                      {event.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: OutletEventItem['status'] }) {
  const styles = {
    pending: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    approved: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    rejected: 'bg-[#EB4D4B]/10 text-[#EB4D4B] border-[#EB4D4B]/20',
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#F5F5DC]/45">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm text-[#F5F5DC]/80">{value}</p>
    </div>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[#F5F5DC]/45">{label}</p>
      <p className="mt-1 text-sm text-[#F5F5DC]/80">{value}</p>
    </div>
  );
}

// Default export wrapped in Suspense for SSR compatibility
export default function OutletProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5A823]" />
      </div>
    }>
      <OutletProfileContent />
    </Suspense>
  );
}
