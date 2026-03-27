'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  CalendarDays, 
  TrendingUp, 
  DollarSign, 
  Ticket, 
  Eye,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  IndianRupee
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

// Types
interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  totalRevenue: number;
  totalTickets: number;
  viewsThisMonth: number;
  conversionRate: number;
}

interface RecentEvent {
  id: string;
  title: string;
  date: string;
  status: 'upcoming' | 'completed' | 'pending';
  ticketsSold: number;
  revenue: number;
  image?: string;
}

interface ActivityItem {
  id: string;
  type: 'ticket_sold' | 'event_approved' | 'event_submitted' | 'view';
  message: string;
  timestamp: string;
}

interface OutletEventItem {
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
  ticketsSold?: number;
  revenue?: number;
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  change, 
  changeType,
  icon: Icon,
  color 
}: { 
  title: string; 
  value: string | number; 
  change?: string;
  changeType?: 'up' | 'down';
  icon: React.ElementType;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#F5F5DC]/60">{title}</p>
          <p className="mt-2 text-2xl font-bold text-[#F5F5DC]">{value}</p>
          {change && (
            <div className={`mt-1 flex items-center gap-1 text-xs ${changeType === 'up' ? 'text-emerald-400' : 'text-[#EB4D4B]'}`}>
              {changeType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {change}
            </div>
          )}
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

// Event Card Component
function EventCard({ event }: { event: RecentEvent }) {
  const statusColors = {
    upcoming: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    completed: 'bg-[#E5A823]/20 text-[#E5A823] border-[#E5A823]/30',
    pending: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-4">
      <div className="relative w-16 h-16 rounded-lg bg-[#2A2A2A] overflow-hidden flex-shrink-0">
        {event.image ? (
          <Image src={event.image} alt={event.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-[#F5F5DC]/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-[#F5F5DC] truncate">{event.title}</h4>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[event.status]}`}>
            {event.status}
          </span>
        </div>
        <p className="text-sm text-[#F5F5DC]/50 mt-1">{new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        {event.ticketsSold > 0 && (
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-[#F5F5DC]/60">
              <Ticket className="w-3 h-3 inline mr-1" />
              {event.ticketsSold} sold
            </span>
            <span className="text-[#E5A823]">
              <DollarSign className="w-3 h-3 inline mr-0.5" />
              {event.revenue.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: ActivityItem }) {
  const iconMap = {
    ticket_sold: <Ticket className="w-4 h-4 text-[#E5A823]" />,
    event_approved: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    event_submitted: <AlertCircle className="w-4 h-4 text-orange-400" />,
    view: <Eye className="w-4 h-4 text-[#3E83B6]" />,
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#2A2A2A] last:border-0">
      <div className="rounded-lg bg-[#2A2A2A] p-2 flex-shrink-0">
        {iconMap[activity.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#F5F5DC]">{activity.message}</p>
        <p className="text-xs text-[#F5F5DC]/50 mt-1">{timeAgo(activity.timestamp)}</p>
      </div>
    </div>
  );
}

// Dashboard Content Component
function OutletDashboardContent() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    upcomingEvents: 0,
    totalRevenue: 0,
    totalTickets: 0,
    viewsThisMonth: 0,
    conversionRate: 0,
  });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [eventsData, setEventsData] = useState<{
    upcomingEvents: OutletEventItem[];
    completedEvents: OutletEventItem[];
    waitingApprovalEvents: OutletEventItem[];
  }>({
    upcomingEvents: [],
    completedEvents: [],
    waitingApprovalEvents: [],
  });

  // Fetch outlet events data
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        
        // Fetch outlet events from API
        const response = await fetch('/api/outlet/events', {
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch outlet events');
        }
        
        const data = await response.json();
        
        const upcoming = data.upcomingEvents || [];
        const completed = data.completedEvents || [];
        const waiting = data.waitingApprovalEvents || [];
        
        setEventsData({
          upcomingEvents: upcoming,
          completedEvents: completed,
          waitingApprovalEvents: waiting,
        });
        
        // Calculate stats
        const totalEvents = upcoming.length + completed.length + waiting.length;
        const upcomingEvents = upcoming.length;
        
        // Calculate revenue and tickets from completed/upcoming events
        // For now, using placeholder calculation - replace with actual ticket data when available
        let totalRevenue = 0;
        let totalTickets = 0;
        
        [...upcoming, ...completed].forEach((event: OutletEventItem) => {
          // Extract numeric price from price string (e.g., "₹500 onwards" or "Free")
          const priceMatch = event.price?.match(/₹?([\d,]+)/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
          
          // Use ticketsSold from event data if available, otherwise estimate
          const tickets = event.ticketsSold || Math.floor(Math.random() * 50) + 10; // Replace with real data
          totalTickets += tickets;
          totalRevenue += price * tickets;
        });
        
        // Generate activities based on real events
        const generatedActivities: ActivityItem[] = [];
        
        // Add activities for recent submissions
        waiting.slice(0, 2).forEach((event: OutletEventItem, index: number) => {
          generatedActivities.push({
            id: `submitted-${index}`,
            type: 'event_submitted',
            message: `"${event.title}" submitted for approval`,
            timestamp: new Date(event.submittedAt).toISOString(),
          });
        });
        
        // Add activities for approved events
        [...upcoming, ...completed].slice(0, 2).forEach((event: OutletEventItem, index: number) => {
          if (event.reviewedAt) {
            generatedActivities.push({
              id: `approved-${index}`,
              type: 'event_approved',
              message: `"${event.title}" was approved`,
              timestamp: new Date(event.reviewedAt).toISOString(),
            });
          }
        });
        
        // Sort activities by timestamp (newest first)
        generatedActivities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        // Format recent events for display
        const formattedRecentEvents: RecentEvent[] = [...upcoming, ...waiting, ...completed]
          .slice(0, 5)
          .map((event: OutletEventItem) => ({
            id: event.requestId,
            title: event.title,
            date: event.date,
            status: event.lifecycle === 'waiting_approval' ? 'pending' : 
                    event.lifecycle === 'upcoming' ? 'upcoming' : 'completed',
            ticketsSold: event.ticketsSold || 0,
            revenue: event.revenue || 0,
            image: event.image,
          }));
        
        setStats({
          totalEvents,
          upcomingEvents,
          totalRevenue,
          totalTickets,
          viewsThisMonth: Math.floor(Math.random() * 5000) + 1000, // Placeholder - replace with analytics API
          conversionRate: totalEvents > 0 ? Math.round((totalTickets / (totalEvents * 100)) * 100) / 100 : 0,
        });
        
        setRecentEvents(formattedRecentEvents);
        setActivities(generatedActivities.slice(0, 5));
        
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5A823]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC]">
      {/* Header */}
      <div className="bg-[#0D0D0D] border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[#E5A823]">Outlet Dashboard</h1>
            <span className="text-[#F5F5DC]/50">|</span>
            <span className="text-[#F5F5DC]/70">Welcome back, {session?.user?.name || 'Provider'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/outlet/profile"
              className="px-4 py-2 border border-[#2A2A2A] text-[#F5F5DC] font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              Profile
            </Link>
            <Link
              href="/seller-form"
              className="px-6 py-2 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Host Event
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Total Events"
            value={stats.totalEvents}
            change={stats.upcomingEvents > 0 ? `+${stats.upcomingEvents} upcoming` : 'No upcoming'}
            changeType="up"
            icon={CalendarDays}
            color="bg-[#E5A823]"
          />
          <StatCard
            title="Total Revenue"
            value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
            change={stats.totalRevenue > 0 ? 'From ticket sales' : 'No revenue yet'}
            changeType="up"
            icon={IndianRupee}
            color="bg-emerald-500"
          />
          <StatCard
            title="Tickets Sold"
            value={stats.totalTickets}
            change={stats.totalTickets > 0 ? `${Math.round(stats.totalTickets / stats.totalEvents)} avg/event` : 'No sales yet'}
            changeType="up"
            icon={Ticket}
            color="bg-[#3E83B6]"
          />
          <StatCard
            title="Upcoming Events"
            value={stats.upcomingEvents}
            change={stats.upcomingEvents > 0 ? 'Scheduled' : 'None scheduled'}
            icon={Clock}
            color="bg-purple-500"
          />
          <StatCard
            title="Views This Month"
            value={stats.viewsThisMonth.toLocaleString('en-IN')}
            change="Estimated"
            changeType="up"
            icon={Eye}
            color="bg-orange-500"
          />
          <StatCard
            title="Conversion Rate"
            value={`${stats.conversionRate}%`}
            change={stats.conversionRate > 0 ? 'Tickets/Events ratio' : 'No data yet'}
            changeType="up"
            icon={TrendingUp}
            color="bg-pink-500"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#F5F5DC]">Recent Events</h3>
              <Link 
                href="/outlet/profile?tab=events" 
                className="text-sm text-[#E5A823] hover:underline flex items-center gap-1"
              >
                View All
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#F5F5DC]">Recent Activity</h3>
              <span className="text-xs text-[#F5F5DC]/50">Last 7 days</span>
            </div>
            <div>
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6"
        >
          <h3 className="text-lg font-bold text-[#F5F5DC] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              href="/seller-form"
              className="flex items-center gap-3 p-4 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] hover:border-[#E5A823] transition-colors"
            >
              <div className="rounded-lg bg-[#E5A823]/10 p-2">
                <Plus className="w-5 h-5 text-[#E5A823]" />
              </div>
              <div>
                <p className="font-medium text-[#F5F5DC]">Host New Event</p>
                <p className="text-xs text-[#F5F5DC]/50">Create event request</p>
              </div>
            </Link>
            <Link 
              href="/outlet/profile?tab=details"
              className="flex items-center gap-3 p-4 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] hover:border-[#E5A823] transition-colors"
            >
              <div className="rounded-lg bg-[#3E83B6]/10 p-2">
                <Users className="w-5 h-5 text-[#3E83B6]" />
              </div>
              <div>
                <p className="font-medium text-[#F5F5DC]">Edit Profile</p>
                <p className="text-xs text-[#F5F5DC]/50">Update venue info</p>
              </div>
            </Link>
            <Link 
              href="/venues"
              className="flex items-center gap-3 p-4 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] hover:border-[#E5A823] transition-colors"
            >
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Eye className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-[#F5F5DC]">View Public Page</p>
                <p className="text-xs text-[#F5F5DC]/50">See your venue</p>
              </div>
            </Link>
            <Link 
              href="/outlet/profile?tab=events"
              className="flex items-center gap-3 p-4 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] hover:border-[#E5A823] transition-colors"
            >
              <div className="rounded-lg bg-purple-500/10 p-2">
                <CalendarDays className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-[#F5F5DC]">Manage Events</p>
                <p className="text-xs text-[#F5F5DC]/50">View all events</p>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Main export with Suspense
export default function OutletDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5A823]" />
      </div>
    }>
      <OutletDashboardContent />
    </Suspense>
  );
}
