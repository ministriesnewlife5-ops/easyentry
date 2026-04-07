'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email');
        return;
      }

      setMessage('If this email exists, reset instructions have been sent.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#101018] p-6">
        <h1 className="text-2xl font-bold text-[#E5A823]">Forgot password</h1>
        <p className="mt-2 text-sm text-[#F5F5DC]/65">
          Enter your email to receive reset instructions.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-[#F5F5DC] outline-none focus:border-[#E5A823]"
          />

          {message && <p className="text-sm text-emerald-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#E5A823] px-4 py-3 font-semibold text-[#0D0D0D] hover:bg-[#f1bf46] disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send reset instructions'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-[#E5A823] hover:text-[#f1bf46]">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
