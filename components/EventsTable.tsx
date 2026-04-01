'use client';

import { useState } from 'react';
import { Archive, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  provider: string;
  location: string;
  date: string;
}

interface EventsTableProps {
  events: Event[];
}

export default function EventsTable({ events }: EventsTableProps) {
  const [data, setData] = useState(events);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'archive' | 'delete' } | null>(null);

  const handleAction = async (id: string, action: 'archive' | 'delete') => {
    setLoading(id);
    try {
      const response = await fetch('/api/admin/archive-delete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, type: 'event' }),
      });

      if (response.ok) {
        setData(prev => prev.filter(item => item.id !== id));
      } else {
        console.error(`Failed to ${action} event`);
      }
    } catch (error) {
      console.error(`Error ${action}ing event:`, error);
    } finally {
      setLoading(null);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <article className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5 overflow-x-auto">
        <table className="w-full text-left text-sm text-[#F5F5DC]">
          <thead className="border-b border-[#2A2A2A] text-xs uppercase text-[#F5F5DC]/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Event Name</th>
              <th className="px-4 py-3 font-semibold">Outlet Provider</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {data.map((event) => (
              <tr key={event.id} className="hover:bg-[#2A2A2A]/40 transition-colors">
                <td className="px-4 py-4 font-medium text-[#E5A823]">{event.name}</td>
                <td className="px-4 py-4">{event.provider}</td>
                <td className="px-4 py-4 text-[#F5F5DC]/80">{event.location}</td>
                <td className="px-4 py-4">{event.date}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/events/${event.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#2A2A2A] rounded-lg hover:bg-[#E5A823] hover:text-[#0D0D0D] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </Link>
                    <button
                      onClick={() => setConfirmAction({ id: event.id, action: 'archive' })}
                      disabled={loading === event.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#2A2A2A] rounded-lg hover:bg-amber-600 hover:text-white transition-colors disabled:opacity-50"
                    >
                      <Archive className="w-3 h-3" />
                      Archive
                    </button>
                    <button
                      onClick={() => setConfirmAction({ id: event.id, action: 'delete' })}
                      disabled={loading === event.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#2A2A2A] rounded-lg hover:bg-[#EB4D4B] hover:text-white transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[#F5F5DC]/50">
                  No events found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${confirmAction.action === 'delete' ? 'bg-[#EB4D4B]/20' : 'bg-amber-500/20'}`}>
                <AlertCircle className={`w-5 h-5 ${confirmAction.action === 'delete' ? 'text-[#EB4D4B]' : 'text-amber-500'}`} />
              </div>
              <h3 className="text-lg font-semibold">
                Confirm {confirmAction.action === 'delete' ? 'Deletion' : 'Archive'}
              </h3>
            </div>
            <p className="text-sm text-[#F5F5DC]/70 mb-6">
              Are you sure you want to {confirmAction.action} this event?
              {confirmAction.action === 'delete'
                ? ' This action cannot be undone.'
                : ' You can unarchive later from the archived section.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2A2A2A] hover:bg-[#3A3A3A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirmAction.id, confirmAction.action)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  confirmAction.action === 'delete'
                    ? 'bg-[#EB4D4B] hover:bg-[#d43d3d] text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {confirmAction.action === 'delete' ? 'Delete' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
