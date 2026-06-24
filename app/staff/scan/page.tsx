"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffScanPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<{ eventId: string; eventCode: string; eventTitle: string } | null>(null);

  useEffect(() => {
    const match = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('staff_selected_event='));
    if (!match) {
      router.push('/staff/event');
      return;
    }
    try {
      const raw = decodeURIComponent(match.split('=')[1] || '');
      const data = JSON.parse(raw);
      setSelected({ eventId: data.eventId, eventCode: data.eventCode, eventTitle: data.eventTitle });
    } catch (e) {
      router.push('/staff/event');
    }
  }, [router]);

  if (!selected) {
    return null;
  }

  return (
    <div className="py-12">
      <h1 className="text-2xl font-semibold text-[#E5A823]">Scanner</h1>
      <div className="mt-4 p-4 rounded bg-[#111] border border-[#222]">
        <p className="text-sm text-[#F5F5DC]/70">Selected event</p>
        <h2 className="text-lg font-semibold text-[#F5F5DC] mt-1">{selected.eventTitle}</h2>
        <p className="text-sm text-[#E5A823] mt-1">Code: {selected.eventCode}</p>
        <div className="mt-3">
          <a href="/staff/event" className="text-sm text-[#F5F5DC]/80 underline">Change Event</a>
        </div>
      </div>
      <p className="mt-6 text-sm text-[#F5F5DC]/70">Scanner UI placeholder — build Step 10 will implement scanning and verification.</p>
    </div>
  );
}
