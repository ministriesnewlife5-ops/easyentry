'use client';

import { useState } from 'react';
import { Archive, Trash2, ExternalLink, AlertCircle, Pencil } from 'lucide-react';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  provider: string;
  location: string;
  date: string;
  time?: string;
  category?: string;
  subcategory?: string;
  price?: string;
}

type CouponRuleForm = {
  code: string;
  discountPercent: string;
  sourceType: 'outlet' | 'artist' | 'promoter' | 'influencer';
  sourceId: string;
  sourceName: string;
  startsAt: string;
  endsAt: string;
  maxUses: string;
};

interface EventsTableProps {
  events: Event[];
}

export default function EventsTable({ events }: EventsTableProps) {
  const [data, setData] = useState(events);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'archive' | 'delete' } | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    date: '',
    time: '',
    venue: '',
    category: '',
    subcategory: '',
    price: '',
  });
  const [couponForm, setCouponForm] = useState<CouponRuleForm>({
    code: '',
    discountPercent: '',
    sourceType: 'outlet',
    sourceId: '',
    sourceName: '',
    startsAt: '',
    endsAt: '',
    maxUses: '',
  });

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

  const openEditModal = async (event: Event) => {
    setEditingEvent(event);
    setEditForm({
      title: event.name || '',
      date: event.date || '',
      time: event.time || '',
      venue: event.location || '',
      category: event.category || '',
      subcategory: event.subcategory || '',
      price: event.price || '',
    });

    setCouponForm({
      code: '',
      discountPercent: '',
      sourceType: 'outlet',
      sourceId: '',
      sourceName: '',
      startsAt: '',
      endsAt: '',
      maxUses: '',
    });

    try {
      const response = await fetch(`/api/events/${event.id}`);
      if (!response.ok) return;
      const payload = await response.json();
      const eventData = payload?.event;
      if (!eventData) return;

      const firstRule = Array.isArray(eventData.couponRules) ? eventData.couponRules[0] : null;

      setEditForm((prev) => ({
        ...prev,
        subcategory: typeof eventData.subcategory === 'string' ? eventData.subcategory : prev.subcategory,
      }));

      if (firstRule) {
        setCouponForm({
          code: firstRule.code || '',
          discountPercent: String(firstRule.discountPercent ?? ''),
          sourceType: firstRule.sourceType || 'outlet',
          sourceId: firstRule.sourceId || '',
          sourceName: firstRule.sourceName || '',
          startsAt: firstRule.startsAt ? String(firstRule.startsAt).slice(0, 16) : '',
          endsAt: firstRule.endsAt ? String(firstRule.endsAt).slice(0, 16) : '',
          maxUses: firstRule.maxUses != null ? String(firstRule.maxUses) : '',
        });
      }
    } catch {
      // No-op fallback to existing values
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;

    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          date: editForm.date,
          time: editForm.time,
          venue: editForm.venue,
          category: editForm.category,
          subcategory: editForm.subcategory,
          price: editForm.price,
          couponRules: couponForm.code
            ? [
                {
                  code: couponForm.code.trim().toUpperCase(),
                  discountPercent: Number(couponForm.discountPercent || 0),
                  sourceType: couponForm.sourceType,
                  sourceId: couponForm.sourceId || undefined,
                  sourceName: couponForm.sourceName || undefined,
                  startsAt: couponForm.startsAt || undefined,
                  endsAt: couponForm.endsAt || undefined,
                  maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : undefined,
                },
              ]
            : [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      setData((prev) =>
        prev.map((item) =>
          item.id === editingEvent.id
            ? {
                ...item,
                name: editForm.title,
                date: editForm.date,
                time: editForm.time,
                location: editForm.venue,
                category: editForm.category,
                subcategory: editForm.subcategory,
                price: editForm.price,
              }
            : item
        )
      );

      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
    } finally {
      setIsSavingEdit(false);
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
                      onClick={() => openEditModal(event)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#2A2A2A] rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
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

      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 max-w-xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Hosted Event</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />
              <input
                value={editForm.venue}
                onChange={(e) => setEditForm((prev) => ({ ...prev, venue: e.target.value }))}
                placeholder="Venue"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />
              <input
                type="time"
                value={editForm.time}
                onChange={(e) => setEditForm((prev) => ({ ...prev, time: e.target.value }))}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />
              <input
                value={editForm.category}
                onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="Category"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />
              <input
                value={editForm.subcategory}
                onChange={(e) => setEditForm((prev) => ({ ...prev, subcategory: e.target.value }))}
                placeholder="Subcategory"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />
              <input
                value={editForm.price}
                onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="Price (e.g. ₹999)"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />

              <input
                value={couponForm.code}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
                placeholder="Coupon Code"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />
              <input
                type="number"
                value={couponForm.discountPercent}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, discountPercent: e.target.value }))}
                placeholder="Coupon Discount %"
                min={1}
                max={100}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />
              <select
                value={couponForm.sourceType}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, sourceType: e.target.value as CouponRuleForm['sourceType'] }))}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              >
                <option value="outlet">Outlet</option>
                <option value="artist">Artist</option>
                <option value="promoter">Promoter</option>
                <option value="influencer">Influencer</option>
              </select>
              <input
                value={couponForm.sourceId}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, sourceId: e.target.value }))}
                placeholder="Coupon Source ID"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />
              <input
                value={couponForm.sourceName}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, sourceName: e.target.value }))}
                placeholder="Coupon Source Name"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />
              <input
                type="datetime-local"
                value={couponForm.startsAt}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 [color-scheme:dark]"
              />
              <input
                type="datetime-local"
                value={couponForm.endsAt}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 [color-scheme:dark]"
              />
              <input
                type="number"
                value={couponForm.maxUses}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, maxUses: e.target.value }))}
                placeholder="Coupon Max Uses"
                min={1}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => setEditingEvent(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2A2A2A] hover:bg-[#3A3A3A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#E5A823] hover:bg-[#F5C542] text-[#0D0D0D] transition-colors disabled:opacity-50"
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
