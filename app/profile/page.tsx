'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Mic2, Megaphone, Building2 } from 'lucide-react';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-[#F5F5DC] flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-[#F5F5DC] px-4 py-10">
      <div className="max-w-2xl mx-auto bg-[#0D0D0D] border border-[#2A2A2A] rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-[#E5A823] mb-6">Profile</h1>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-[#F5F5DC]/60">Name</p>
            <p className="text-lg">{session.user.name || 'User'}</p>
          </div>
          <div>
            <p className="text-sm text-[#F5F5DC]/60">Email</p>
            <p className="text-lg">{session.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-[#F5F5DC]/60">Role</p>
            <p className="text-lg capitalize">{session.user.role || 'User'}</p>
          </div>
        </div>

        {session.user.role && session.user.role !== 'user' && session.user.role !== 'admin' && (
          <div className="mt-8 pt-8 border-t border-[#2A2A2A]">
            <p className="text-sm text-[#F5F5DC]/60 mb-4">You are registered as a <span className="text-[#E5A823] font-bold capitalize">{session.user.role}</span>. You can manage your specialized public profile below.</p>
            <button
              onClick={() => router.push(`/${session.user.role}/profile`)}
              className="w-full px-6 py-3 rounded-lg bg-[#E5A823] hover:bg-[#F5C542] transition-colors font-bold text-[#0D0D0D] flex items-center justify-center gap-2"
            >
              {session.user.role === 'artist' ? <Mic2 className="w-5 h-5" /> :
               session.user.role === 'promoter' ? <Megaphone className="w-5 h-5" /> :
               <Building2 className="w-5 h-5" />}
              Manage {session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)} Dashboard
            </button>
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: '/events' })}
          className="mt-8 px-6 py-3 rounded-lg bg-[#EB4D4B] hover:bg-[#d8413f] transition-colors font-bold text-white"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
