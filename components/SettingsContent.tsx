"use client";

import { useState, useEffect } from "react";
import { Lock, Settings, IndianRupee } from "lucide-react";
import dynamic from "next/dynamic";

const PasswordSettings = dynamic(() => import("./PasswordSettings"), { ssr: false });

interface SettingsContentProps {
  userEmail?: string | null;
}

export default function SettingsContent({ userEmail }: SettingsContentProps) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [convenienceFee, setConvenienceFee] = useState(175);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load current convenience fee
    const loadConvenienceFee = async () => {
      try {
        const response = await fetch('/api/admin/convenience-fee');
        if (response.ok) {
          const data = await response.json();
          setConvenienceFee(data.fee || 175);
        }
      } catch (error) {
        console.error('Failed to load convenience fee:', error);
      }
    };
    loadConvenienceFee();
  }, []);

  const updateConvenienceFee = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/convenience-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fee: convenienceFee }),
      });
      if (response.ok) {
        alert('Convenience fee updated successfully!');
      } else {
        alert('Failed to update convenience fee.');
      }
    } catch (error) {
      console.error('Failed to update convenience fee:', error);
      alert('Failed to update convenience fee.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Convenience Fee Settings Card */}
        <article className="rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15">
              <IndianRupee className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F5F5DC]">Convenience Fee</h3>
              <p className="text-sm text-[#F5F5DC]/60">Set platform convenience fee</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F5DC]/50" />
              <input
                type="number"
                value={convenienceFee}
                onChange={(e) => setConvenienceFee(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D]/50 px-9 py-2 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                placeholder="175"
                min="0"
                step="1"
              />
            </div>
            <button
              onClick={updateConvenienceFee}
              disabled={isLoading}
              className="w-full rounded-xl bg-[#E5A823] px-4 py-2.5 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F5C542] disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Fee'}
            </button>
          </div>
        </article>

        {/* Password Settings Card */}
        <article className="rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5A823]/15">
              <Lock className="h-5 w-5 text-[#E5A823]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F5F5DC]">Password</h3>
              <p className="text-sm text-[#F5F5DC]/60">Change your account password</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D]/50 px-3 py-2">
              <p className="text-xs text-[#F5F5DC]/50">Email</p>
              <p className="text-sm font-medium text-[#F5F5DC]">{userEmail || "Not available"}</p>
            </div>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full rounded-xl bg-[#E5A823] px-4 py-2.5 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F5C542]"
            >
              Change Password
            </button>
          </div>
        </article>

        {/* Account Info Card */}
        <article className="rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <Settings className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F5F5DC]">Account Info</h3>
              <p className="text-sm text-[#F5F5DC]/60">View account details</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D]/50 px-3 py-2">
              <p className="text-xs text-[#F5F5DC]/50">Role</p>
              <p className="text-sm font-medium text-[#F5F5DC]">Administrator</p>
            </div>
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D]/50 px-3 py-2">
              <p className="text-xs text-[#F5F5DC]/50">Status</p>
              <p className="text-sm font-medium text-emerald-400">Active</p>
            </div>
          </div>
        </article>

        {/* Security Card */}
        <article className="rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
              <Lock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F5F5DC]">Security</h3>
              <p className="text-sm text-[#F5F5DC]/60">Security settings</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#0D0D0D]/50 px-3 py-2">
              <span className="text-sm text-[#F5F5DC]/80">Two-Factor Auth</span>
              <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs text-[#F5F5DC]/60">Coming Soon</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#0D0D0D]/50 px-3 py-2">
              <span className="text-sm text-[#F5F5DC]/80">Login Notifications</span>
              <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs text-[#F5F5DC]/60">Coming Soon</span>
            </div>
          </div>
        </article>
      </div>

      <PasswordSettings isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
    </>
  );
}
