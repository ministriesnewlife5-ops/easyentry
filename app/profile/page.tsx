'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Mic2, Megaphone, Building2, Heart, History, UserCircle2, LogOut, Ticket, MapPin, Calendar, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getWishlist, removeFromWishlist, type WishlistEvent } from '@/lib/wishlist-store';

// Mock data for history - will be replaced with actual booking API
const mockHistory: any[] = [];

// Component that uses search params - wrapped in Suspense
function ProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'profile' | 'wishlist' | 'history'>('profile');
  const [wishlist, setWishlist] = useState<WishlistEvent[]>([]);
  
  // Load wishlist from API
  const loadWishlist = async () => {
    const wishlistData = await getWishlist();
    setWishlist(wishlistData);
  };
  
  // Get tab from URL query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'wishlist' || tab === 'history') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Load wishlist on mount and listen for updates
  useEffect(() => {
    loadWishlist();
    
    const handleWishlistUpdate = () => {
      loadWishlist();
    };
    
    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlist-updated', handleWishlistUpdate);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const isRegularUser = session.user.role === 'user';

  const handleRemoveFromWishlist = async (eventId: string) => {
    await removeFromWishlist(eventId);
    const updatedWishlist = await getWishlist();
    setWishlist(updatedWishlist);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/events' });
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: UserCircle2 },
    ...(isRegularUser ? [
      { id: 'wishlist', label: 'Wishlist', icon: Heart },
      { id: 'history', label: 'History', icon: History }
    ] : [])
  ] as const;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] px-4 py-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#E5A823] mb-2">My Account</h1>
          <p className="text-[#F5F5DC]/60">Manage your profile, wishlist, and bookings</p>
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#E5A823] text-[#0D0D0D]'
                  : 'bg-[#2A2A2A] text-[#F5F5DC] hover:bg-[#3A3A3A]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm bg-[#EB4D4B]/20 text-[#EB4D4B] hover:bg-[#EB4D4B]/30 transition-all ml-auto"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6"
        >
          {/* Profile Settings Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-[#F5F5DC] mb-4">Profile Information</h2>
              
              {/* User Info Card */}
              <div className="bg-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] flex items-center justify-center text-[#0D0D0D] font-bold text-2xl">
                    {session.user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F5F5DC]">{session.user.name || 'User'}</h3>
                    <p className="text-sm text-[#F5F5DC]/60 capitalize">{session.user.role || 'Regular User'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#F5F5DC]/60 mb-1">Email</label>
                    <p className="text-[#F5F5DC]">{session.user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#F5F5DC]/60 mb-1">Role</label>
                    <p className="text-[#F5F5DC] capitalize">{session.user.role || 'User'}</p>
                  </div>
                </div>
              </div>

              {/* Special Role Dashboard Link */}
              {session.user.role && session.user.role !== 'user' && session.user.role !== 'admin' && (
                <div className="bg-[#E5A823]/10 border border-[#E5A823]/20 rounded-xl p-4">
                  <p className="text-sm text-[#F5F5DC]/80 mb-3">
                    You are registered as a <span className="text-[#E5A823] font-bold capitalize">{session.user.role}</span>. 
                    Manage your specialized profile below.
                  </p>
                  <button
                    onClick={() => router.push(`/${session.user.role}/profile`)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#E5A823] hover:bg-[#F5C542] rounded-lg text-[#0D0D0D] font-bold text-sm transition-colors"
                  >
                    {session.user.role === 'artist' ? <Mic2 className="w-4 h-4" /> :
                     session.user.role === 'promoter' ? <Megaphone className="w-4 h-4" /> :
                     <Building2 className="w-4 h-4" />}
                    Go to {session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)} Dashboard
                  </button>
                </div>
              )}

              {/* Admin Dashboard Link */}
              {session.user.role === 'admin' && (
                <div className="bg-[#EB4D4B]/10 border border-[#EB4D4B]/20 rounded-xl p-4">
                  <p className="text-sm text-[#F5F5DC]/80 mb-3">You have admin privileges.</p>
                  <button
                    onClick={() => router.push('/admin')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#EB4D4B] hover:bg-[#d43d3b] rounded-lg text-white font-bold text-sm transition-colors"
                  >
                    Go to Admin Dashboard
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Wishlist Tab */}
          {activeTab === 'wishlist' && isRegularUser && (
            <div>
              <h2 className="text-xl font-bold text-[#F5F5DC] mb-4">My Wishlist ({wishlist.length})</h2>
              {wishlist.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-[#F5F5DC]/30 mx-auto mb-4" />
                  <p className="text-[#F5F5DC]/60">No events in your wishlist yet</p>
                  <p className="text-[#F5F5DC]/40 text-sm mt-2">Click the heart icon on any event card to add it here</p>
                  <Link 
                    href="/events" 
                    className="inline-block mt-4 px-4 py-2 bg-[#E5A823] text-[#0D0D0D] rounded-lg font-bold text-sm hover:bg-[#F5C542] transition-colors"
                  >
                    Browse Events
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {wishlist.map((event) => (
                    <div key={event.id} className="bg-[#2A2A2A] rounded-xl p-4 flex gap-4">
                      <div className="w-24 h-24 rounded-lg bg-[#0D0D0D] overflow-hidden flex-shrink-0">
                        <img 
                          src={event.imageUrl || '/dj1.jfif'} 
                          alt={event.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/dj1.jfif';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-[#F5F5DC] mb-1">{event.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/60 mb-1">
                          <Calendar className="w-4 h-4" />
                          {event.date}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/60 mb-2">
                          <MapPin className="w-4 h-4" />
                          {event.venue}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#E5A823] font-bold">{event.price}</span>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/events/${event.id}`}
                              className="px-3 py-1 bg-[#EB4D4B] text-white rounded-lg text-sm font-bold hover:bg-[#d43d3b] transition-colors"
                            >
                              Book Now
                            </Link>
                            <button
                              onClick={() => handleRemoveFromWishlist(event.id)}
                              className="p-2 text-[#F5F5DC]/50 hover:text-[#EB4D4B] hover:bg-[#EB4D4B]/10 rounded-lg transition-colors"
                              title="Remove from wishlist"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && isRegularUser && (
            <div>
              <h2 className="text-xl font-bold text-[#F5F5DC] mb-4">Booking History</h2>
              {mockHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-[#F5F5DC]/30 mx-auto mb-4" />
                  <p className="text-[#F5F5DC]/60">No bookings yet</p>
                  <p className="text-[#F5F5DC]/40 text-sm mt-2">Your ticket purchases will appear here</p>
                  <Link 
                    href="/events" 
                    className="inline-block mt-4 px-4 py-2 bg-[#E5A823] text-[#0D0D0D] rounded-lg font-bold text-sm hover:bg-[#F5C542] transition-colors"
                  >
                    Browse Events
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {mockHistory.map((booking) => (
                    <div key={booking.id} className="bg-[#2A2A2A] rounded-xl p-4">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 rounded-lg bg-[#0D0D0D] overflow-hidden flex-shrink-0">
                          <img 
                            src={booking.image} 
                            alt={booking.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/dj1.jfif';
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-[#F5F5DC]">{booking.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              booking.status === 'Completed' 
                                ? 'bg-green-500/20 text-green-500' 
                                : 'bg-blue-500/20 text-blue-500'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/60 mb-1">
                            <Calendar className="w-4 h-4" />
                            {booking.date}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[#F5F5DC]/60 mb-2">
                            <MapPin className="w-4 h-4" />
                            {booking.venue}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Ticket className="w-4 h-4 text-[#E5A823]" />
                              <span className="text-[#F5F5DC]/80">{booking.tickets} tickets</span>
                              <span className="text-[#E5A823] font-bold">{booking.price}</span>
                            </div>
                            <button className="px-3 py-1 border border-[#E5A823] text-[#E5A823] rounded-lg text-sm font-bold hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors">
                              View Ticket
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Main page component with Suspense wrapper
export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center">
        Loading profile...
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
