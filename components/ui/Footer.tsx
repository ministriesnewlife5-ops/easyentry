'use client';

import Link from 'next/link';
import { Mic2, Building2, Megaphone, Instagram, Twitter, Linkedin, Facebook, ArrowRight } from 'lucide-react';

export default function Footer() {
  const workItems = [
    { name: 'Artist', href: '/work/register?role=artist', icon: Mic2, desc: 'Perform & grow' },
    { name: 'Organizer', href: '/work/register?role=organizer', icon: Building2, desc: 'Host events' },
    { name: 'Promoter', href: '/work/register?role=promoter', icon: Megaphone, desc: 'Sell tickets' },
  ];

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0D0D0D] border-t border-[#2A2A2A]">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#E5A823] to-[#EB4D4B] flex items-center justify-center">
                  <span className="text-white font-bold">EE</span>
                </div>
                <span className="text-lg font-bold text-[#F5F5DC]">Easy Entry</span>
              </div>
              <p className="text-[#F5F5DC]/50 text-sm leading-relaxed">Discover live gigs, DJ nights & unforgettable events at the best venues near you.</p>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[#F5F5DC] font-bold text-sm mb-6 uppercase tracking-wider">Company</h4>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-[#F5F5DC]/60 hover:text-[#E5A823] transition-colors text-sm">About Us</Link></li>
              <li><Link href="/careers" className="text-[#F5F5DC]/60 hover:text-[#E5A823] transition-colors text-sm">Careers</Link></li>
              <li><Link href="/blog" className="text-[#F5F5DC]/60 hover:text-[#E5A823] transition-colors text-sm">Blog</Link></li>
              <li><Link href="/press" className="text-[#F5F5DC]/60 hover:text-[#E5A823] transition-colors text-sm">Press</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[#F5F5DC] font-bold text-sm mb-6 uppercase tracking-wider">Support</h4>
            <ul className="space-y-3">
              <li><Link href="/help" className="text-[#F5F5DC]/60 hover:text-[#E5A823] transition-colors text-sm">Help & Support</Link></li>
              <li><Link href="/contact" className="text-[#F5F5DC]/60 hover:text-[#E5A823] transition-colors text-sm">Contact Us</Link></li>
              <li><Link href="/faq" className="text-[#F5F5DC]/60 hover:text-[#E5A823] transition-colors text-sm">FAQs</Link></li>
              <li><Link href="/status" className="text-[#F5F5DC]/60 hover:text-[#E5A823] transition-colors text-sm">Status</Link></li>
            </ul>
          </div>

          {/* Work With Us */}
          <div>
            <h4 className="text-[#F5F5DC] font-bold text-sm mb-6 uppercase tracking-wider">Work With Us</h4>
            <ul className="space-y-3">
              {workItems.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="flex items-center gap-2 text-[#F5F5DC]/60 hover:text-[#E5A823] transition-colors text-sm group">
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-[#F5F5DC] font-bold text-sm mb-6 uppercase tracking-wider">Follow Us</h4>
            <div className="flex flex-wrap gap-3">
              <a href="#" className="w-10 h-10 rounded-lg bg-[#2A2A2A] hover:bg-[#E5A823] text-[#F5F5DC] hover:text-[#0D0D0D] flex items-center justify-center transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-[#2A2A2A] hover:bg-[#E5A823] text-[#F5F5DC] hover:text-[#0D0D0D] flex items-center justify-center transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-[#2A2A2A] hover:bg-[#E5A823] text-[#F5F5DC] hover:text-[#0D0D0D] flex items-center justify-center transition-all">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-[#2A2A2A] hover:bg-[#E5A823] text-[#F5F5DC] hover:text-[#0D0D0D] flex items-center justify-center transition-all">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent mb-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-[#F5F5DC]/40 text-xs">
              &copy; {currentYear} Easy Entry. All rights reserved.<br/>
              <span className="text-[#F5F5DC]/30">Designed and Developed with <span className="text-[#E5A823]">❤</span> by Athryan Tech Solutions</span>
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <Link href="/privacy" className="text-[#F5F5DC]/50 hover:text-[#E5A823] transition-colors">Privacy Policy</Link>
            <div className="w-px h-4 bg-[#2A2A2A]" />
            <Link href="/terms" className="text-[#F5F5DC]/50 hover:text-[#E5A823] transition-colors">Terms of Service</Link>
            <div className="w-px h-4 bg-[#2A2A2A]" />
            <Link href="/cookies" className="text-[#F5F5DC]/50 hover:text-[#E5A823] transition-colors">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
