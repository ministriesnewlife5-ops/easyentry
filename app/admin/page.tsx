import { BarChart3, CalendarDays, CircleCheckBig, ImageIcon, IndianRupee, Mic2, Settings, Ticket, TrendingUp, Users, Megaphone, FileText, Plus, UserPlus, Store } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import Link from 'next/link';
import SettingsContent from '@/components/SettingsContent';
import EventRequestsSection from '@/components/EventRequestsSection';
import AdsBannerManager from '@/components/AdsBannerManager';
import BrowseFiltersManager from '@/components/BrowseFiltersManager';
import AdminEventHostSection from '@/components/AdminEventHostSection';
import AdminOnboardingSection from '@/components/AdminOnboardingSection';
import OutletProvidersTable from '@/components/OutletProvidersTable';
import ArtistsTable from '@/components/ArtistsTable';
import InfluencersTable from '@/components/InfluencersTable';
import EventsTable from '@/components/EventsTable';
import { getAllPublishedEvents, getPublishedEventCards } from '@/lib/public-events-store';
import { getAllEventRequests } from '@/lib/event-request-store';
import { getAllUsers } from '@/lib/auth-store';

// Data structures will be populated with real data from database
let revenueBars: number[] = [];
let bookingSources: { name: string; value: number }[] = [];
let recentActivity: any[] = [];

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
  const publishedEvents = await getAllPublishedEvents();
  const eventCards = await getPublishedEventCards();
  const eventRequests = await getAllEventRequests();
  const allUsers = await getAllUsers();
  
  // Get real artists (users with artist role)
  const enrolledArtists = allUsers.filter((user: { role: string }) => user.role === 'artist');
  
  // Get real influencers/promoters (users with promoter role)
  const enrolledInfluencers = allUsers.filter((user: { role: string }) => user.role === 'promoter');
  
  // Get outlet providers (users with outlet or outlet_provider role)
  const outletProviders = allUsers.filter((user: { role: string }) => user.role === 'outlet' || user.role === 'outlet_provider');

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
    name: (artist.name || 'Unknown').toUpperCase(),
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name || 'Unknown')}&background=random&color=fff&size=200`,
    location: 'Chennai, Tamil Nadu',
    completedEvents: 0,
    upcomingEvents: 0,
    ticketsSoldByCode: 0,
  }));

  // Map influencers to the format used in the admin dashboard
  const allInfluencers = enrolledInfluencers.map(influencer => ({
    id: influencer.id,
    name: influencer.name || 'Unknown',
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(influencer.name || 'Unknown')}&background=random&color=fff&size=200`,
    location: 'Chennai, Tamil Nadu',
    ticketsSoldByCode: 0,
  }));

  // Map outlet providers to the format used in the admin dashboard
  const allOutletProviders = outletProviders.map(provider => ({
    id: provider.id,
    name: provider.name || 'Unnamed',
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name || 'Unknown')}&background=random&color=fff&size=200`,
    email: provider.email,
    joinedDate: new Date(provider.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    isVerified: provider.is_verified,
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

  // Stats based on real data
  const stats = [
    { label: 'Total Events', value: publishedEvents.length.toString(), delta: 'Published events', icon: CalendarDays },
    { label: 'Artists Enrolled', value: enrolledArtists.length.toString(), delta: 'Active artists', icon: Mic2 },
    { label: 'Promoters', value: enrolledInfluencers.length.toString(), delta: 'Active promoters', icon: Megaphone },
    { label: 'Outlet Providers', value: outletProviders.length.toString(), delta: 'Active outlets', icon: Store },
    { label: 'Total Users', value: allUsers.length.toString(), delta: 'Registered users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      <div className="mx-auto flex w-full max-w-[1440px] gap-5 px-4 py-6 md:px-6">
        <aside className="hidden w-72 shrink-0 rounded-2xl border border-[#2A2A2A] bg-gradient-to-b from-[#111111] to-[#0A0A0A] md:block">
          <div className="border-b border-[#2A2A2A] p-5">
            <p className="text-2xl font-bold tracking-tight text-[#E5A823]">Easy Entry</p>
            <p className="mt-1 text-sm text-[#F5F5DC]/65">Admin Dashboard</p>
            <div className="mt-4 rounded-xl border border-[#2A2A2A] bg-[#1B1B1B]/60 px-3 py-2">
              <p className="text-base font-semibold">{session?.user?.name || 'Admin'}</p>
              <p className="text-xs text-[#F5F5DC]/50">{session?.user?.email}</p>
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
            <Link href="/admin?section=outlet-providers" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'outlet-providers' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <Store className="h-4 w-4" />
              Outlet Providers
            </Link>
            <Link href="/admin?section=requests" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'requests' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <FileText className="h-4 w-4" />
              Event Requests
            </Link>
            <Link href="/admin?section=host-event" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'host-event' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <Plus className="h-4 w-4" />
              Host Event
            </Link>
            <Link href="/admin?section=onboarding" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'onboarding' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <UserPlus className="h-4 w-4" />
              Onboard Users
            </Link>
            <Link href="/admin?section=settings" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'settings' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <Link href="/admin?section=ads" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'ads' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <ImageIcon className="h-4 w-4" />
              Ads Banner
            </Link>
            <Link href="/admin?section=browse-filters" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ${activeSection === 'browse-filters' ? 'bg-[#E5A823]/15 text-[#E5A823]' : 'text-[#F5F5DC]/70 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]'}`}>
              <Settings className="h-4 w-4" />
              Browse Filters
            </Link>
          </nav>
        </aside>

        <section className="w-full">
          <header className="rounded-2xl border border-[#2A2A2A] bg-gradient-to-r from-[#111111] to-[#0D0D0D] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {activeSection === 'ads' ? 'Advertisement Banners' : 
                   activeSection === 'browse-filters' ? 'Browse Filters' :
                   activeSection === 'events' ? 'All Platform Events' : 
                   activeSection === 'artists' ? 'All Enrolled Artists' :
                   activeSection === 'influencers' ? 'All Influencers' :
                   activeSection === 'outlet-providers' ? 'All Outlet Providers' :
                   activeSection === 'requests' ? 'Event Requests' :
                   activeSection === 'host-event' ? 'Host New Event' :
                   activeSection === 'onboarding' ? 'Onboard Users' :
                   activeSection === 'settings' ? 'Settings' :
                   'Admin Dashboard'}
                </h1>
                <p className="mt-1 text-sm text-[#F5F5DC]/65">
                  {activeSection === 'ads' ? 'Create and manage promotion banners from promo data presets' : 
                   activeSection === 'browse-filters' ? 'Manage main filters and category filters for browsing events' :
                   activeSection === 'events' ? `Manage and view all ${allWebsiteEvents.length} events across the platform` : 
                   activeSection === 'artists' ? `Manage and view all ${allEnrolledArtists.length} artists enrolled on the platform` :
                   activeSection === 'influencers' ? `Manage and view all ${allInfluencers.length} influencers collaborating on the platform` :
                   activeSection === 'outlet-providers' ? `Manage and view all outlet providers on the platform` :
                   activeSection === 'requests' ? 'Review and approve event requests from outlet providers' :
                   activeSection === 'host-event' ? 'Create and publish events directly for outlets and promoters' :
                   activeSection === 'onboarding' ? 'Create accounts for artists, influencers, and outlet providers' :
                   activeSection === 'settings' ? 'Manage your account settings and security' :
                   `${upcomingEvents.length} upcoming events · ${allUsers.length} total users`}
                </p>
              </div>
              {activeSection === 'ads' && (
                <span className="rounded-full bg-[#E5A823]/10 px-4 py-2 text-xs font-semibold text-[#E5A823]">Promo Banner Data</span>
              )}
            </div>
          </header>

          {activeSection === 'events' ? (
            <EventsTable events={allWebsiteEvents} />
          ) : activeSection === 'artists' ? (
            <ArtistsTable artists={allEnrolledArtists} />
          ) : activeSection === 'influencers' ? (
            <InfluencersTable influencers={allInfluencers} />
          ) : activeSection === 'outlet-providers' ? (
            <OutletProvidersTable outletProviders={allOutletProviders} />
          ) : activeSection === 'ads' ? (
            <AdsBannerManager />
          ) : activeSection === 'browse-filters' ? (
            <BrowseFiltersManager />
          ) : activeSection === 'requests' ? (
            <EventRequestsSection />
          ) : activeSection === 'host-event' ? (
            <AdminEventHostSection />
          ) : activeSection === 'onboarding' ? (
            <AdminOnboardingSection />
          ) : activeSection === 'settings' ? (
            <SettingsContent userEmail={session?.user?.email} />
          ) : (
            <>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                  <div className="mt-6 flex h-44 items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]/90">
                    <p className="text-[#F5F5DC]/50">Revenue data coming soon</p>
                  </div>
                </article>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <article className="rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
                  <h2 className="text-xl font-semibold">Bookings by source</h2>
                  <div className="mt-4 flex h-40 items-center justify-center">
                    <p className="text-[#F5F5DC]/50">Analytics coming soon</p>
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
                <div className="mt-4 flex h-40 items-center justify-center">
                  <p className="text-[#F5F5DC]/50">Activity feed coming soon</p>
                </div>
              </article>
            </>
          )}

        </section>
      </div>
    </div>
  );
}
