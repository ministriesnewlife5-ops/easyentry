'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, X, ChevronDown, Mic2, Building2, Megaphone, LogOut, UserCircle2, LayoutDashboard, CalendarDays, Heart, History } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export default function Navigation() {
  const [workDropdownOpen, setWorkDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const isAdmin = session?.user?.role === 'admin';
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';

  const workItems = [
    { name: 'Artist', href: '/work/register?role=artist', icon: Mic2, desc: 'Perform & grow' },
    { name: 'Outlet Provider', href: '/work/register?role=outlet', icon: Building2, desc: 'Host events' },
    { name: 'Influencer', href: '/work/register?role=promoter', icon: Megaphone, desc: 'Sell tickets' },
  ];

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/events' });
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#2A2A2A] h-16 flex items-center">
      <div className="container mx-auto px-4 w-full">
        <div className="flex items-center justify-between w-full">
          {/* Logo - Left Side */}
          <Link href="/" className="flex items-center gap-2 group mr-8">
            <Image 
              src="/Easy Entry Logo.png" 
              alt="Easy Entry" 
              width={120} 
              height={40} 
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>

          {/* Search - Left-Middle (Hidden on mobile) */}
          <div className="hidden md:flex items-center flex-1 max-w-2xl mr-auto">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F5F5DC]/50 w-5 h-5 group-hover:text-[#E5A823] transition-colors" />
              <input 
                type="text" 
                placeholder="Search by event, venue or city" 
                className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-full py-3 pl-12 pr-6 text-sm text-[#F5F5DC] focus:outline-none focus:ring-1 focus:ring-[#E5A823] transition-all placeholder:text-[#F5F5DC]/40 h-12"
              />
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-6 text-sm font-bold text-[#F5F5DC]">
              <Link href="/help" className="hover:text-[#E5A823] transition-colors">
                Get help
              </Link>
              <Link href="/blog" className="hover:text-[#E5A823] transition-colors">
                Blog
              </Link>
                {/* Work With Us Dropdown */}
                <div 
                  className="relative"
                  onMouseEnter={() => setWorkDropdownOpen(true)}
                  onMouseLeave={() => setWorkDropdownOpen(false)}
                >
                  <button className="flex items-center gap-1 hover:text-[#E5A823] transition-colors">
                    Work with us
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${workDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {workDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-3"
                      >
                        <div 
                          className="rounded-xl overflow-hidden min-w-[200px] relative bg-[#0D0D0D]/95 border border-[#2A2A2A] shadow-2xl"
                        >
                          {/* Subtle top accent */}
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E5A823] to-transparent" />
                          
                          {workItems.map((item, index) => (
                            <Link
                              key={item.name}
                              href={item.href}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-[#E5A823]/10 transition-colors group relative"
                            >
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#2A2A2A] border border-[#2A2A2A] group-hover:bg-[#E5A823]/20 group-hover:border-[#E5A823] transition-all">
                                <item.icon className="w-4 h-4 text-[#F5F5DC]/70 group-hover:text-[#E5A823] transition-colors" />
                              </div>
                              <div>
                                <span className="block text-[#F5F5DC] font-medium text-sm group-hover:text-[#E5A823] transition-colors">{item.name}</span>
                                <span className="block text-[#F5F5DC]/40 text-xs">{item.desc}</span>
                              </div>
                              
                              {/* Separator */}
                              {index < workItems.length - 1 && (
                                <div className="absolute bottom-0 left-4 right-4 h-px bg-[#2A2A2A]" />
                              )}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              {/* Profile Dropdown - Shows when logged in */}
              {isLoggedIn ? (
                <div 
                  className="relative"
                  onMouseEnter={() => setProfileDropdownOpen(true)}
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                >
                  <button className="flex items-center gap-2 hover:text-[#E5A823] transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] flex items-center justify-center text-[#0D0D0D] font-bold text-sm">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline">{userName.split(' ')[0]}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                        className="absolute top-full right-0 pt-3"
                      >
                        <div className="rounded-xl overflow-hidden min-w-[220px] relative bg-[#0D0D0D]/95 border border-[#2A2A2A] shadow-2xl">
                          <div className="px-4 py-3 border-b border-[#2A2A2A] bg-[#2A2A2A]/30">
                            <p className="text-[#F5F5DC] font-bold text-sm">{userName}</p>
                            <p className="text-[#F5F5DC]/50 text-xs">{userEmail}</p>
                          </div>

                          {/* Dynamic Profile Link based on Role */}
                          <Link
                            href={isAdmin ? "/admin" : (session?.user?.role && ['artist', 'promoter', 'outlet'].includes(session.user.role)) ? `/${session.user.role}/profile` : "/profile"}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-[#E5A823]/10 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#2A2A2A] border border-[#2A2A2A] group-hover:bg-[#E5A823]/20 group-hover:border-[#E5A823] transition-all">
                              {isAdmin ? <LayoutDashboard className="w-4 h-4 text-[#E5A823] group-hover:text-[#F5C542]" /> : 
                               session?.user?.role === 'artist' ? <Mic2 className="w-4 h-4 text-[#E5A823] group-hover:text-[#F5C542]" /> :
                               session?.user?.role === 'promoter' ? <Megaphone className="w-4 h-4 text-[#E5A823] group-hover:text-[#F5C542]" /> :
                               session?.user?.role === 'outlet' ? <Building2 className="w-4 h-4 text-[#E5A823] group-hover:text-[#F5C542]" /> :
                               <UserCircle2 className="w-4 h-4 text-[#E5A823] group-hover:text-[#F5C542]" />}
                            </div>
                            <div>
                              <span className="block text-[#F5F5DC] font-medium text-sm group-hover:text-[#E5A823] transition-colors">
                                {isAdmin ? 'Admin Dashboard' : 
                                 (session?.user?.role && ['artist', 'promoter', 'outlet'].includes(session.user.role)) ? 
                                 `${session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)} Profile` : 
                                 'Profile'}
                              </span>
                              <span className="block text-[#F5F5DC]/40 text-xs">
                                {isAdmin ? 'Manage platform' : 'Manage your presence'}
                              </span>
                            </div>
                          </Link>

                          {/* Account Settings link for everyone */}
                          <Link
                            href="/profile"
                            className="flex items-center gap-3 px-4 py-3 hover:bg-[#E5A823]/10 transition-colors group border-t border-[#2A2A2A]"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#2A2A2A] border border-[#2A2A2A] group-hover:bg-[#E5A823]/20 group-hover:border-[#E5A823] transition-all">
                              <UserCircle2 className="w-4 h-4 text-[#F5F5DC]/50 group-hover:text-[#E5A823]" />
                            </div>
                            <div>
                              <span className="block text-[#F5F5DC] font-medium text-sm group-hover:text-[#E5A823] transition-colors">Account Settings</span>
                              <span className="block text-[#F5F5DC]/40 text-xs">Email & security</span>
                            </div>
                          </Link>

                          {/* Wishlist link for regular users */}
                          {session?.user?.role === 'user' && (
                            <Link
                              href="/profile?tab=wishlist"
                              className="flex items-center gap-3 px-4 py-3 hover:bg-[#E5A823]/10 transition-colors group border-t border-[#2A2A2A]"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#2A2A2A] border border-[#2A2A2A] group-hover:bg-[#E5A823]/20 group-hover:border-[#E5A823] transition-all">
                                <Heart className="w-4 h-4 text-[#EB4D4B] group-hover:text-[#E5A823]" />
                              </div>
                              <div>
                                <span className="block text-[#F5F5DC] font-medium text-sm group-hover:text-[#E5A823] transition-colors">Wishlist</span>
                                <span className="block text-[#F5F5DC]/40 text-xs">Saved events</span>
                              </div>
                            </Link>
                          )}

                          {/* History/Bookings link for regular users */}
                          {session?.user?.role === 'user' && (
                            <Link
                              href="/profile?tab=history"
                              className="flex items-center gap-3 px-4 py-3 hover:bg-[#E5A823]/10 transition-colors group border-t border-[#2A2A2A]"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#2A2A2A] border border-[#2A2A2A] group-hover:bg-[#E5A823]/20 group-hover:border-[#E5A823] transition-all">
                                <History className="w-4 h-4 text-[#E5A823] group-hover:text-[#F5C542]" />
                              </div>
                              <div>
                                <span className="block text-[#F5F5DC] font-medium text-sm group-hover:text-[#E5A823] transition-colors">History</span>
                                <span className="block text-[#F5F5DC]/40 text-xs">Past bookings & tickets</span>
                              </div>
                            </Link>
                          )}

                          {session?.user?.role === 'outlet' && (
                            <Link
                              href="/outlet/dashboard"
                              className="flex items-center gap-3 px-4 py-3 hover:bg-[#E5A823]/10 transition-colors group border-t border-[#2A2A2A]"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#2A2A2A] border border-[#2A2A2A] group-hover:bg-[#E5A823]/20 group-hover:border-[#E5A823] transition-all">
                                <LayoutDashboard className="w-4 h-4 text-[#E5A823] group-hover:text-[#F5C542]" />
                              </div>
                              <div>
                                <span className="block text-[#F5F5DC] font-medium text-sm group-hover:text-[#E5A823] transition-colors">Dashboard</span>
                                <span className="block text-[#F5F5DC]/40 text-xs">Analytics & overview</span>
                              </div>
                            </Link>
                          )}

                          {session?.user?.role === 'outlet' && (
                            <Link
                              href="/outlet/profile?tab=events"
                              className="flex items-center gap-3 px-4 py-3 hover:bg-[#E5A823]/10 transition-colors group border-t border-[#2A2A2A]"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#2A2A2A] border border-[#2A2A2A] group-hover:bg-[#E5A823]/20 group-hover:border-[#E5A823] transition-all">
                                <CalendarDays className="w-4 h-4 text-[#E5A823] group-hover:text-[#F5C542]" />
                              </div>
                              <div>
                                <span className="block text-[#F5F5DC] font-medium text-sm group-hover:text-[#E5A823] transition-colors">My Events</span>
                                <span className="block text-[#F5F5DC]/40 text-xs">Upcoming, completed, approvals</span>
                              </div>
                            </Link>
                          )}

                          {session?.user?.role === 'outlet' && (
                            <Link
                              href="/seller-form"
                              className="flex items-center gap-3 px-4 py-3 hover:bg-[#E5A823]/10 transition-colors group border-t border-[#2A2A2A]"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#2A2A2A] border border-[#2A2A2A] group-hover:bg-[#E5A823]/20 group-hover:border-[#E5A823] transition-all">
                                <Building2 className="w-4 h-4 text-[#E5A823] group-hover:text-[#F5C542]" />
                              </div>
                              <div>
                                <span className="block text-[#F5F5DC] font-medium text-sm group-hover:text-[#E5A823] transition-colors">Host Event</span>
                                <span className="block text-[#F5F5DC]/40 text-xs">Create venue listing</span>
                              </div>
                            </Link>
                          )}

                          <button
                            onClick={() => signOut({ callbackUrl: '/events' })}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-[#EB4D4B]/10 transition-colors group w-full border-t border-[#2A2A2A]"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#2A2A2A] border border-[#2A2A2A] group-hover:bg-[#EB4D4B]/20 group-hover:border-[#EB4D4B] transition-all">
                              <LogOut className="w-4 h-4 text-[#EB4D4B]" />
                            </div>
                            <span className="text-[#F5F5DC] font-medium text-sm group-hover:text-[#EB4D4B] transition-colors">Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link href="/login" className="hover:text-[#E5A823] transition-colors">
                  Log in / Sign up
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#F5F5DC] hover:bg-[#2A2A2A] rounded-full transition-colors lg:hidden"
            >
              <motion.div
                animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </motion.div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            
            {/* Mobile Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-16 right-0 bottom-0 w-[80%] max-w-[320px] bg-[#0D0D0D] border-l border-[#2A2A2A] z-50 lg:hidden overflow-y-auto"
            >
              <div className="p-4 space-y-4">
                {/* Mobile Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/50 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search events, venues..." 
                    className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg py-2.5 pl-9 pr-3 text-sm text-[#F5F5DC] focus:outline-none focus:ring-1 focus:ring-[#E5A823] placeholder:text-[#F5F5DC]/40"
                  />
                </div>

                {/* Mobile Navigation Links */}
                <div className="space-y-1">
                  <Link 
                    href="/events" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#2A2A2A] text-[#F5F5DC] font-medium"
                  >
                    <span>Browse Events</span>
                  </Link>
                  <Link 
                    href="/help" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#2A2A2A] text-[#F5F5DC]/80"
                  >
                    <span>Get Help</span>
                  </Link>
                  <Link 
                    href="/blog" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#2A2A2A] text-[#F5F5DC]/80"
                  >
                    <span>Blog</span>
                  </Link>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#2A2A2A]" />

                {/* Work With Us Section */}
                <div>
                  <p className="text-xs font-bold text-[#F5F5DC]/50 uppercase tracking-wider px-3 mb-2">Work With Us</p>
                  <div className="space-y-1">
                    {workItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#2A2A2A] text-[#F5F5DC]"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1A1A1A]">
                          <item.icon className="w-4 h-4 text-[#E5A823]" />
                        </div>
                        <div>
                          <span className="block text-sm font-medium">{item.name}</span>
                          <span className="block text-xs text-[#F5F5DC]/50">{item.desc}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#2A2A2A]" />

                {/* User Section */}
                {isLoggedIn ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 px-3 py-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] flex items-center justify-center text-[#0D0D0D] font-bold">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-[#F5F5DC] text-sm">{userName}</p>
                        <p className="text-xs text-[#F5F5DC]/50">{userEmail}</p>
                      </div>
                    </div>
                    
                    <Link
                      href={isAdmin ? "/admin" : (session?.user?.role && ['artist', 'promoter', 'outlet'].includes(session.user.role)) ? `/${session.user.role}/profile` : "/profile"}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#2A2A2A] text-[#F5F5DC]"
                    >
                      <LayoutDashboard className="w-5 h-5 text-[#E5A823]" />
                      <span className="text-sm">
                        {isAdmin ? 'Admin Dashboard' : 
                         (session?.user?.role && ['artist', 'promoter', 'outlet'].includes(session.user.role)) ? 
                         `${session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)} Dashboard` : 
                         'My Account'}
                      </span>
                    </Link>

                    {session?.user?.role === 'user' && (
                      <>
                        <Link
                          href="/profile?tab=wishlist"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#2A2A2A] text-[#F5F5DC]"
                        >
                          <Heart className="w-5 h-5 text-[#EB4D4B]" />
                          <span className="text-sm">Wishlist</span>
                        </Link>
                        <Link
                          href="/profile?tab=history"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#2A2A2A] text-[#F5F5DC]"
                        >
                          <History className="w-5 h-5 text-[#E5A823]" />
                          <span className="text-sm">History</span>
                        </Link>
                      </>
                    )}

                    {session?.user?.role === 'outlet' && (
                      <>
                        <Link
                          href="/outlet/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#2A2A2A] text-[#F5F5DC]"
                        >
                          <LayoutDashboard className="w-5 h-5 text-[#E5A823]" />
                          <span className="text-sm">Dashboard</span>
                        </Link>
                        <Link
                          href="/outlet/profile?tab=events"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#2A2A2A] text-[#F5F5DC]"
                        >
                          <CalendarDays className="w-5 h-5 text-[#E5A823]" />
                          <span className="text-sm">My Events</span>
                        </Link>
                        <Link
                          href="/seller-form"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#2A2A2A] text-[#F5F5DC]"
                        >
                          <Building2 className="w-5 h-5 text-[#E5A823]" />
                          <span className="text-sm">Host Event</span>
                        </Link>
                      </>
                    )}

                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#EB4D4B]/10 text-[#EB4D4B] w-full"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                ) : (
                  <Link 
                    href="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#E5A823] text-[#0D0D0D] font-bold rounded-lg"
                  >
                    <UserCircle2 className="w-5 h-5" />
                    Log in / Sign up
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
