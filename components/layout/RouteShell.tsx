'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/ui/Navigation';
import Footer from '@/components/ui/Footer';
import { getRouteShell } from '@/lib/route-access';

export default function RouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shell = getRouteShell(pathname || '/');

  if (shell === 'dashboard') {
    return <>{children}</>;
  }

  if (shell === 'auth') {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Navigation />
      <main className="flex-grow pt-16 min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
