"use client";

import { useState } from 'react';

export default function StaffEventPage() {
  return (
    <div className="py-12">
      <h1 className="text-2xl font-semibold text-[#E5A823]">Select Event</h1>
      <p className="mt-4 text-sm text-[#F5F5DC]/70">Search by Event Code</p>
      <div className="mt-6 max-w-md">
        <EventSearch />
      </div>
    </div>
  );
}

function EventSearch() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<any | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setEvent(null);
    try {
      const resp = await fetch(`/api/staff/events/search?code=${encodeURIComponent(code)}`);
      const body = await resp.json();
      if (!resp.ok) {
        setError(body.error || 'Not found');
      } else {
        setEvent(body.event);
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD1234" className="flex-1 p-3 rounded-lg bg-[#0D0D0D] border border-[#222]" />
        <button onClick={handleSearch} disabled={loading || !code} className="px-4 py-3 bg-[#E5A823] rounded-lg">{loading ? 'Searching...' : 'Search'}</button>
      </div>
      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      {event && (
        <div className="mt-4 p-4 rounded-lg bg-[#111] border border-[#222]">
          <h3 className="font-semibold text-[#F5F5DC]">{event.title}</h3>
          <p className="text-sm text-[#F5F5DC]/70">{event.date} • {event.venue}</p>
          <p className="mt-2 text-xs text-[#F5F5DC]/60">Code: {event.event_code || event.eventCode}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                const payload = {
                  eventId: event.id,
                  eventCode: event.event_code || event.eventCode || '',
                  eventTitle: event.title || '',
                };
                document.cookie = `staff_selected_event=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=${60 * 60 * 24}`;
                window.location.href = '/staff/scan';
              }}
              className="px-4 py-2 rounded bg-[#E5A823] text-[#0D0D0D] font-semibold"
            >
              Select This Event
            </button>
            <button
              onClick={() => {
                const codeToCopy = event.event_code || event.eventCode || '';
                try { navigator.clipboard.writeText(codeToCopy); } catch (e) {
                  const t = document.createElement('textarea'); t.value = codeToCopy; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
                }
              }}
              className="px-3 py-2 rounded bg-[#2A2A2A] text-sm"
            >
              Copy Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
