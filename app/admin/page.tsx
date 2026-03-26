import { BarChart3, CalendarDays, CircleCheckBig, ImageIcon, IndianRupee, Mic2, Settings, Ticket, TrendingUp, Users, Megaphone, FileText } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import Link from 'next/link';
import SettingsContent from '@/components/SettingsContent';
import EventRequestsSection from '@/components/EventRequestsSection';
import { getAllPublishedEvents, getPublishedEventCards } from '@/lib/public-events-store';
import { getAllEventRequests } from '@/lib/event-request-store';
import { appUsers } from '@/lib/auth-store';

const stats = [
  { label: 'Revenue this month', value: '₹4.82L', delta: '↑ 24% vs last month', icon: IndianRupee },
  { label: 'Tickets sold', value: '2,481', delta: '↑ 342 this week', icon: Ticket },
  { label: 'Code-driven bookings', value: '74%', delta: '↑ 12% vs last month', icon: TrendingUp },
  { label: 'Avg event rating', value: '4.8', delta: '↑ 0.3 this month', icon: CircleCheckBig },
];

const revenueBars = [
  28, 42, 30, 55, 48, 36, 66, 52, 58, 70, 
  34, 44, 60, 78, 51, 40, 84, 62, 88, 64, 
  76, 55, 68, 92, 45, 72, 85, 58, 95, 70
];

const bookingSources = [
  { name: 'Artist codes', value: 58 },
  { name: 'Instagram', value: 18 },
  { name: 'Walk-in', value: 12 },
  { name: 'Direct Search', value: 7 },
  { name: 'Partners', value: 5 },
];

const recentActivity = [
  { user: 'Rahul Sharma', action: 'booked', event: 'DJ Arjun — House Night', time: '2 mins ago', amount: '₹1,200' },
  { user: 'Ananya Iyer', action: 'joined', event: 'Waitlist: Indie Open Mic', time: '15 mins ago', amount: null },
  { user: 'Vikram Singh', action: 'booked', event: 'Sufi Evening', time: '42 mins ago', amount: '₹2,500' },
  { user: 'Priya Patel', action: 'reviewed', event: 'Retro Bollywood', time: '1 hour ago', amount: null, rating: 5 },
  { user: 'Siddharth M.', action: 'booked', event: 'Techno Underground', time: '2 hours ago', amount: '₹1,800' },
];

const promoBannerPresets = [
  {
    id: 1,
    tag: 'New Feature',
    title: "Find Chennai's hottest shows",
    description: 'Discover the best DJ nights at Gatsby, Pasha, and more. Connect your music for personalized alerts.',
    image: 'https://images.unsplash.com/photo-1574391884720-2e45599e9633?auto=format&fit=crop&q=80&w=800',
    primaryButton: 'SPOTIFY',
    secondaryButton: 'APPLE MUSIC',
  },
  {
    id: 2,
    tag: 'Exclusive',
    title: 'Experience Madras Nightlife',
    description: 'From ECR raves to rooftop parties in OMR, find your vibe in the city.',
    image: 'https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=800',
    primaryButton: 'EXPLORE EVENTS',
    secondaryButton: '',
  },
];

export default async function AdminPage({
  searchParams,
}: any) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = await searchParams;
  const activeSection = resolvedSearchParams?.section || 'overview';

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    redirect('/events');
  }

  // Fetch real data from the database
  const publishedEvents = getAllPublishedEvents();
  const eventCards = getPublishedEventCards();
  const eventRequests = getAllEventRequests();
  
  // Get real artists (users with artist role)
  const enrolledArtists = appUsers.filter(user => user.role === 'artist');
  
  // Get real influencers/promoters (users with promoter role)
  const enrolledInfluencers = appUsers.filter(user => user.role === 'promoter');

  // Map published events to the format used in the admin dashboard
  const allWebsiteEvents = publishedEvents.map(event => ({
    id: event.id,
    name: event.title,
    provider: event.promoterName || 'Easy Entry',
    location: event.venue,
    date: event.date,
  }));

  // Map artists to the format used in the admin dashboard
  const allEnrolledArtists = enrolledArtists.map(artist => ({
    id: artist.id,
    name: artist.name.toUpperCase(),
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=random&color=fff&size=200`,
    location: 'Chennai, Tamil Nadu',
    completedEvents: 0,
    upcomingEvents: 0,
    ticketsSoldByCode: 0,
  }));

  // Map influencers to the format used in the admin dashboard
  const allInfluencers = enrolledInfluencers.map(influencer => ({
    id: influencer.id,
    name: influencer.name,
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(influencer.name)}&background=random&color=fff&size=200`,
    location: 'Chennai, Tamil Nadu',
    ticketsSoldByCode: 0,
  }));

  // Get upcoming events for the overview section (limit to 6)
  const upcomingEvents = publishedEvents
    .slice(0, 6)
    .map((event, index) => {
      const colors = ['bg-[#E5A823]', 'bg-emerald-400', 'bg-[#EB4D4B]', 'bg-violet-400', 'bg-blue-400', 'bg-orange-400'];
      return {
        name: event.title,
        date: `${event.date} · ${event.time}`,
        sold: '0/100',
        color: colors[index % colors.length],
      };
    });

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      <div className="mx-auto flex w-full max-w-[1440px] gap-5 px-4 py-6 md:px-6">
        <aside className="hidden w-72 shrink-0 rounded-2xl border border-[#2A2A2A] bg-gradient-to-b from-[#111111] to-[#0A0A0A] md:block">
          <div className="border-b border-[#2A2A2A] p-5">
            <p className="text-2xl font-bold tracking-tight text-[#E5A823]">Easy Entry</p>
            <p className="mt-1 text-sm text-[#F5F5DC]/65">Admin Dashboard</p>
            <div className="mt-4 rounded-xl border border-[#2A2A2A] bg-[#1B1B1B]/60 px-3 py-2">
              <p className="text-base font-semibold">Pasha Chennai</p>
              <p className="text-xs text-[#F5F5DC]/50">Anna Salai · Outlet ID #1412</p>
            </div>
          </div>
          <nav className="space-y-1 p-3 text-sm font-medium">
            <Link href="/admin" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'overview' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <BarChart3 className="h-4 w-4" />
              Overview
            </Link>
            <Link href="/admin?section=events" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'events' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <CalendarDays className="h-4 w-4" />
              Events
            </Link>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]">
              <IndianRupee className="h-4 w-4" />
              Revenue
            </button>
            <Link href="/admin?section=artists" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'artists' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <Mic2 className="h-4 w-4" />
              Artists
            </Link>
            <Link href="/admin?section=influencers" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'influencers' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <Megaphone className="h-4 w-4" />
              Influencers
            </Link>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]">
              <Users className="h-4 w-4" />
              Customers
            </button>
            <Link href="/admin?section=requests" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'requests' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <FileText className="h-4 w-4" />
              Event Requests
            </Link>
            <Link href="/admin?section=settings" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'settings' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <Link href="/admin?section=ads" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'ads' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <ImageIcon className="h-4 w-4" />
              Ads Banner
            </Link>
          </nav>
        </aside>

        <section className="w-full">
          <header className="rounded-2xl border border-[#2A2A2A] bg-gradient-to-r from-[#111111] to-[#0D0D0D] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {activeSection === 'ads' ? 'Advertisement Banners' : 
                   activeSection === 'events' ? 'All Platform Events' : 
                   activeSection === 'artists' ? 'All Enrolled Artists' :
                   activeSection === 'influencers' ? 'All Influencers' :
                   activeSection === 'requests' ? 'Event Requests' :
                   activeSection === 'settings' ? 'Settings' :
                   'Good evening, Pasha'}
                </h1>
                <p className="mt-1 text-sm text-[#F5F5DC]/65">
                  {activeSection === 'ads' ? 'Create and manage promotion banners from promo data presets' : 
                   activeSection === 'events' ? `Manage and view all ${allWebsiteEvents.length} events across the platform` : 
                   activeSection === 'artists' ? `Manage and view all ${allEnrolledArtists.length} artists enrolled on the platform` :
                   activeSection === 'influencers' ? `Manage and view all ${allInfluencers.length} influencers collaborating on the platform` :
                   activeSection === 'requests' ? 'Review and approve event requests from outlet providers' :
                   activeSection === 'settings' ? 'Manage your account settings and security' :
                   `Thursday, 20 March 2026 · ${upcomingEvents.length} events this week`}
                </p>
              </div>
              {activeSection === 'ads' && (
                <span className="rounded-full bg-[#E5A823]/10 px-4 py-2 text-xs font-semibold text-[#E5A823]">Promo Banner Data</span>
              )}
            </div>
          </header>

          {activeSection === 'events' ? (
            <article className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5 overflow-x-auto">
              <table className="w-full text-left text-sm text-[#F5F5DC]">
                <thead className="border-b border-[#2A2A2A] text-xs uppercase text-[#F5F5DC]/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Event Name</th>
                    <th className="px-4 py-3 font-semibold">Outlet Provider</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {allWebsiteEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-[#2A2A2A]/40 transition-colors">
                      <td className="px-4 py-4 font-medium text-[#E5A823]">{event.name}</td>
                      <td className="px-4 py-4">{event.provider}</td>
                      <td className="px-4 py-4 text-[#F5F5DC]/80">{event.location}</td>
                      <td className="px-4 py-4">{event.date}</td>
                      <td className="px-4 py-4">
                        <Link href={`/events/${event.id}`} className="text-xs font-semibold px-3 py-1.5 bg-[#2A2A2A] rounded-lg hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ) : activeSection === 'artists' ? (
            <article className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5 overflow-x-auto">
              <table className="w-full text-left text-sm text-[#F5F5DC]">
                <thead className="border-b border-[#2A2A2A] text-xs uppercase text-[#F5F5DC]/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Artist</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Events Completed</th>
                    <th className="px-4 py-3 font-semibold">Upcoming Events</th>
                    <th className="px-4 py-3 font-semibold">Tickets Sold (Coupon)</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {allEnrolledArtists.map((artist) => (
                    <tr key={artist.id} className="hover:bg-[#2A2A2A]/40 transition-colors">
                      <td className="px-4 py-4">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#2A2A2A]">
                          <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-[#E5A823]">{artist.name}</td>
                      <td className="px-4 py-4 text-[#F5F5DC]/80">{artist.location}</td>
                      <td className="px-4 py-4">{artist.completedEvents}</td>
                      <td className="px-4 py-4">{artist.upcomingEvents}</td>
                      <td className="px-4 py-4">{artist.ticketsSoldByCode}</td>
                      <td className="px-4 py-4">
                        <Link href={`/artist/${artist.id}`} className="text-xs font-semibold px-3 py-1.5 bg-[#2A2A2A] rounded-lg hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ) : activeSection === 'influencers' ? (
            <article className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5 overflow-x-auto">
              <table className="w-full text-left text-sm text-[#F5F5DC]">
                <thead className="border-b border-[#2A2A2A] text-xs uppercase text-[#F5F5DC]/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Influencer</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Tickets Sold (Coupon)</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {allInfluencers.map((inf) => (
                    <tr key={inf.id} className="hover:bg-[#2A2A2A]/40 transition-colors">
                      <td className="px-4 py-4">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#2A2A2A]">
                          <img src={inf.image} alt={inf.name} className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-[#E5A823]">{inf.name}</td>
                      <td className="px-4 py-4 text-[#F5F5DC]/80">{inf.location}</td>
                      <td className="px-4 py-4">{inf.ticketsSoldByCode}</td>
                      <td className="px-4 py-4">
                        <Link href="/promoter/profile" className="text-xs font-semibold px-3 py-1.5 bg-[#2A2A2A] rounded-lg hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ) : activeSection === 'ads' ? (
            <article className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/80 p-4">
                  <h3 className="text-sm font-semibold text-[#F5F5DC]/80">Existing Banner Samples</h3>
                  <ul className="mt-3 space-y-3">
                    {promoBannerPresets.map((banner) => (
                      <li key={banner.id} className="rounded-lg border border-[#2A2A2A] bg-[#121212] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#E5A823]">{banner.tag}</p>
                        <p className="mt-1 font-semibold">{banner.title}</p>
                        <p className="mt-1 text-sm text-[#F5F5DC]/65">{banner.description}</p>
                        <p className="mt-2 truncate text-xs text-[#F5F5DC]/50">{banner.image}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <form className="rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/80 p-4">
                  <h3 className="text-sm font-semibold text-[#F5F5DC]/80">Create Advertisement Banner</h3>
                  <div className="mt-3 grid gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-[#F5F5DC]/60">Banner Tag</label>
                      <input defaultValue="Exclusive" className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-[#F5F5DC]/60">Headline</label>
                      <input defaultValue="Experience Madras Nightlife" className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-[#F5F5DC]/60">Description</label>
                      <textarea defaultValue="From ECR raves to rooftop parties in OMR, find your vibe in the city." rows={3} className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-[#F5F5DC]/60">Banner Image URL</label>
                      <div className="relative">
                        <ImageIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5F5DC]/45" />
                        <input defaultValue="https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=800" className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] py-2 pl-8 pr-3 text-sm outline-none transition focus:border-[#E5A823]" />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-[#F5F5DC]/60">Primary Button</label>
                        <input defaultValue="EXPLORE EVENTS" className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-[#F5F5DC]/60">Secondary Button</label>
                        <input defaultValue="APPLE MUSIC" className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm outline-none transition focus:border-[#E5A823]" />
                      </div>
                    </div>
                    <button type="button" className="mt-1 rounded-lg bg-[#E5A823] px-4 py-2 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F5C542]">
                      Save Banner
                    </button>
                  </div>
                </form>
              </div>
            </article>
          ) : activeSection === 'requests' ? (
            <EventRequestsSection />
          ) : activeSection === 'settings' ? (
            <SettingsContent userEmail={session?.user?.email} />
          ) : (
            <>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => (
                  <article key={item.label} className="rounded-2xl border border-[#2A2A2A] bg-[#101018] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm text-[#F5F5DC]/70">{item.label}</p>
                      <item.icon className="h-4 w-4 text-[#E5A823]" />
                    </div>
                    <p className="text-4xl font-bold leading-none">{item.value}</p>
                    <p className="mt-3 text-sm font-semibold text-emerald-400">{item.delta}</p>
                  </article>
                ))}
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <article className="rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
                  <h2 className="text-xl font-semibold">Upcoming events</h2>
                  <ul className="mt-4 divide-y divide-[#2A2A2A]">
                    {upcomingEvents.map((event) => (
                      <li key={event.name} className="flex items-center justify-between gap-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${event.color}`} />
                          <div>
                            <p className="truncate text-base font-semibold">{event.name}</p>
                            <p className="text-sm text-[#F5F5DC]/55">{event.date}</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-[#E5A823]">{event.sold}</p>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
                  <h2 className="text-xl font-semibold">Revenue this month</h2>
                  <div className="mt-6 flex h-44 items-end gap-2 overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/90 px-3 pb-3 pt-4">
                    {revenueBars.map((height, index) => (
                      <div key={`${height}-${index}`} className="flex flex-1 flex-col justify-end">
                        <div className="rounded-t-sm bg-gradient-to-t from-[#E5A823]/80 to-[#EB4D4B]/80" style={{ height: `${height * 1.3}px` }} />
                      </div>
                    ))}
                  </div>
                </article>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <article className="rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
                  <h2 className="text-xl font-semibold">Bookings by source</h2>
                  <div className="mt-4 space-y-4">
                    {bookingSources.map((item) => (
                      <div key={item.name}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <p className="text-[#F5F5DC]/80">{item.name}</p>
                          <p className="font-semibold text-[#E5A823]">{item.value}%</p>
                        </div>
                        <div className="h-2 rounded-full bg-[#2A2A2A]">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#E5A823] to-[#EB4D4B]" style={{ width: `${item.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
                  <h2 className="text-xl font-semibold">Top artists by tickets</h2>
                  <ul className="mt-4 space-y-3">
                    {allEnrolledArtists.slice(0, 6).map((artist) => (
                      <li key={artist.id} className="flex items-center justify-between rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/70 px-3 py-2.5">
                        <p className="font-medium">{artist.name}</p>
                        <p className="font-semibold text-[#E5A823]">{artist.ticketsSoldByCode}</p>
                      </li>
                    ))}
                    {allEnrolledArtists.length === 0 && (
                      <li className="text-center py-8 text-[#F5F5DC]/50">
                        No enrolled artists yet
                      </li>
                    )}
                  </ul>
                </article>
              </div>
              <article className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
                <h2 className="text-xl font-semibold">Recent Activity</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] text-[#F5F5DC]/50">
                        <th className="pb-3 font-medium">Customer</th>
                        <th className="pb-3 font-medium">Action</th>
                        <th className="pb-3 font-medium">Event</th>
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {recentActivity.map((activity, idx) => (
                        <tr key={idx} className="group transition-colors hover:bg-[#2A2A2A]/20">
                          <td className="py-4 font-medium text-[#F5F5DC]">{activity.user}</td>
                          <td className="py-4">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              activity.action === 'booked' ? 'bg-emerald-400/10 text-emerald-400' :
                              activity.action === 'reviewed' ? 'bg-blue-400/10 text-blue-400' :
                              'bg-orange-400/10 text-orange-400'
                            }`}>
                              {activity.action}
                            </span>
                          </td>
                          <td className="py-4 text-[#F5F5DC]/80">{activity.event}</td>
                          <td className="py-4 text-[#F5F5DC]/60">{activity.time}</td>
                          <td className="py-4 text-right font-semibold text-[#E5A823]">
                            {activity.amount || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </>
          )}

        </section>
      </div>
    </div>
  );
}
