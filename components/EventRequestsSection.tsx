'use client';

import { useEffect, useState } from 'react';
import {
  CalendarDays, MapPin, Tag, Ticket, Users, Percent,
  IndianRupee, Clock3, CheckCircle2, XCircle, ChevronDown,
  ChevronUp, Loader2, RefreshCw, User, Mail
} from 'lucide-react';

type TicketCategory = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  commissionPercent?: number;
  commissionAmount?: number;
  availableFrom?: string;
  availableUntil?: string;
};

type EventRequest = {
  id: string;
  outletUserId: string;
  outletName: string;
  outletEmail?: string;
  eventData: {
    title: string;
    subtitle: string;
    date: string;
    time: string;
    venue: string;
    category: string;
    price: string;
    image: string;
    mediaFiles?: string[];
    numberOfTickets?: string | number;
    ticketCategories?: TicketCategory[];
    description: string;
    fullDescription: string;
    gatesOpen: string;
    entryAge: string;
    layout: string;
    seating: string;
    commissionPercent?: number;
    estimatedTotalRevenue?: number;
    estimatedTotalCommission?: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pending:  { bg: 'bg-yellow-500/10 border-yellow-500/20',  text: 'text-yellow-400',  dot: 'bg-yellow-400' },
  approved: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  rejected: { bg: 'bg-[#EB4D4B]/10 border-[#EB4D4B]/20',   text: 'text-[#EB4D4B]',   dot: 'bg-[#EB4D4B]' },
  cancelled:{ bg: 'bg-[#2A2A2A] border-[#2A2A2A]',          text: 'text-[#F5F5DC]/50', dot: 'bg-[#F5F5DC]/30' },
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#2A2A2A] last:border-0">
      <span className="text-xs text-[#F5F5DC]/50 shrink-0 w-36">{label}</span>
      <span className="text-sm text-[#F5F5DC]/90 text-right">{value}</span>
    </div>
  );
}

export default function EventRequestsSection() {
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/event-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch event requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/event-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/event-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason }),
      });
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
        setRejectingId(null);
        setRejectionReason('');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const pending   = requests.filter(r => r.status === 'pending');
  const reviewed  = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="mt-4 flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#E5A823]" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#101018] p-12 text-center">
        <Ticket className="w-10 h-10 mx-auto mb-3 text-[#F5F5DC]/20" />
        <p className="text-[#F5F5DC]/50 text-sm">No event requests yet.</p>
      </div>
    );
  }

  const RequestCard = ({ request }: { request: EventRequest }) => {
    const isExpanded = expandedId === request.id;
    const style = STATUS_STYLES[request.status] ?? STATUS_STYLES.pending;
    const ed = request.eventData;
    const tiers = ed.ticketCategories ?? [];

    // Compute totals from tier data
    const totalQty     = tiers.reduce((s, t) => s + (t.quantity ?? 0), 0);
    const totalRev     = ed.estimatedTotalRevenue  ?? tiers.reduce((s, t) => s + (t.price * (t.quantity ?? 0)), 0);
    const totalComm    = ed.estimatedTotalCommission ?? tiers.reduce((s, t) => s + ((t.commissionAmount ?? (t.price * (t.commissionPercent ?? 0) / 100)) * (t.quantity ?? 0)), 0);

    return (
      <div className={`rounded-xl border bg-[#101018] overflow-hidden transition-all ${isExpanded ? 'border-[#E5A823]/40' : 'border-[#2A2A2A]'}`}>

        {/* ── Card Header (always visible) ── */}
        <button
          type="button"
          onClick={() => setExpandedId(isExpanded ? null : request.id)}
          className="w-full text-left p-4 md:p-5 hover:bg-[#1A1A1A]/40 transition-colors"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-[#E5A823] truncate">{ed.title}</h3>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${style.bg} ${style.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#F5F5DC]/55">
                <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{ed.date}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ed.venue}</span>
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{ed.category}</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{request.outletName || 'Unknown outlet'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Quick stats */}
              {tiers.length > 0 && (
                <div className="hidden md:flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <p className="text-[#F5F5DC]/40">Total Rev.</p>
                    <p className="font-semibold text-[#F5F5DC]/80">₹{totalRev.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#F5F5DC]/40">Commission</p>
                    <p className="font-semibold text-emerald-400">₹{totalComm.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              )}
              {isExpanded
                ? <ChevronUp className="w-4 h-4 text-[#F5F5DC]/40" />
                : <ChevronDown className="w-4 h-4 text-[#F5F5DC]/40" />
              }
            </div>
          </div>
        </button>

        {/* ── Expanded Detail Panel ── */}
        {isExpanded && (
          <div className="border-t border-[#2A2A2A] px-4 md:px-5 pb-5 space-y-5">

            {/* Outlet Provider Info */}
            <div className="mt-4 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D]/60 p-3">
              <p className="text-xs font-semibold text-[#F5F5DC]/40 uppercase tracking-wider mb-2">Outlet Provider</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-[#E5A823]" />{request.outletName || '—'}</span>
                {request.outletEmail && (
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-[#E5A823]" />{request.outletEmail}</span>
                )}
              </div>
            </div>

            {/* Event Details */}
            <div>
              <p className="text-xs font-semibold text-[#F5F5DC]/40 uppercase tracking-wider mb-2">Event Details</p>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D]/60 px-3 py-1">
                <DetailRow label="Date" value={ed.date} />
                <DetailRow label="Time" value={ed.time} />
                <DetailRow label="Venue" value={ed.venue} />
                <DetailRow label="Category" value={ed.category} />
                <DetailRow label="Gates Open" value={ed.gatesOpen} />
                <DetailRow label="Entry Age" value={ed.entryAge} />
                <DetailRow label="Layout" value={ed.layout} />
                <DetailRow label="Seating" value={ed.seating} />
                <DetailRow label="Total Tickets" value={
                  totalQty || ed.numberOfTickets
                    ? `${totalQty || ed.numberOfTickets} tickets`
                    : null
                } />
                <DetailRow label="Submitted" value={new Date(request.submittedAt).toLocaleString('en-IN')} />
              </div>
            </div>

            {/* Description */}
            {ed.description && (
              <div>
                <p className="text-xs font-semibold text-[#F5F5DC]/40 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-[#F5F5DC]/70 bg-[#0D0D0D]/60 rounded-lg border border-[#2A2A2A] p-3 leading-relaxed">{ed.description}</p>
              </div>
            )}

            {/* Ticket Tiers & Commission Table */}
            {tiers.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-[#F5F5DC]/40 uppercase tracking-wider mb-2">Ticket Tiers & Commission Breakdown</p>
                <div className="rounded-lg border border-[#2A2A2A] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#1A1A1A] text-xs text-[#F5F5DC]/40 uppercase tracking-wider">
                          <th className="px-3 py-2.5 text-left">Tier</th>
                          <th className="px-3 py-2.5 text-right">Price</th>
                          <th className="px-3 py-2.5 text-right">Qty</th>
                          <th className="px-3 py-2.5 text-right">Comm %</th>
                          <th className="px-3 py-2.5 text-right">Comm / Ticket</th>
                          <th className="px-3 py-2.5 text-right">Total Revenue</th>
                          <th className="px-3 py-2.5 text-right">Total Commission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2A2A2A]">
                        {tiers.map((tier, i) => {
                          const qty      = tier.quantity ?? 0;
                          const commAmt  = tier.commissionAmount ?? ((tier.price * (tier.commissionPercent ?? 0)) / 100);
                          const tierRev  = tier.price * qty;
                          const tierComm = commAmt * qty;
                          return (
                            <tr key={tier.id || i} className="hover:bg-[#1A1A1A]/60 transition-colors">
                              <td className="px-3 py-3 font-medium text-[#E5A823]">{tier.name}</td>
                              <td className="px-3 py-3 text-right">₹{tier.price.toLocaleString('en-IN')}</td>
                              <td className="px-3 py-3 text-right text-[#F5F5DC]/70">{qty}</td>
                              <td className="px-3 py-3 text-right">
                                <span className="inline-flex items-center gap-0.5 text-[#F5F5DC]/80">
                                  <Percent className="w-3 h-3" />{tier.commissionPercent ?? 0}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right text-emerald-400">₹{commAmt.toFixed(2)}</td>
                              <td className="px-3 py-3 text-right text-[#F5F5DC]/70">₹{tierRev.toLocaleString('en-IN')}</td>
                              <td className="px-3 py-3 text-right font-semibold text-emerald-400">₹{tierComm.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#1A1A1A] font-bold text-sm border-t border-[#2A2A2A]">
                          <td className="px-3 py-3 text-[#F5F5DC]/70">Totals</td>
                          <td className="px-3 py-3" />
                          <td className="px-3 py-3 text-right text-[#F5F5DC]/80">{totalQty}</td>
                          <td className="px-3 py-3" />
                          <td className="px-3 py-3" />
                          <td className="px-3 py-3 text-right text-[#F5F5DC]">₹{totalRev.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-3 text-right text-emerald-400">₹{totalComm.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback if no tiers — show the base price */
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0D0D0D]/60 p-3">
                <p className="text-xs font-semibold text-[#F5F5DC]/40 uppercase tracking-wider mb-1">Ticket Price</p>
                <p className="text-sm flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5 text-[#E5A823]" />{ed.price}</p>
              </div>
            )}

            {/* Rejection reason (if rejected) */}
            {request.status === 'rejected' && request.rejectionReason && (
              <div className="rounded-lg border border-[#EB4D4B]/20 bg-[#EB4D4B]/5 p-3">
                <p className="text-xs font-semibold text-[#EB4D4B]/70 uppercase tracking-wider mb-1">Rejection Reason</p>
                <p className="text-sm text-[#F5F5DC]/70">{request.rejectionReason}</p>
              </div>
            )}

            {/* Actions (only for pending) */}
            {request.status === 'pending' && (
              <div className="pt-1 space-y-3">
                {rejectingId === request.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Reason for rejection (optional)"
                      rows={2}
                      className="w-full bg-[#1A1A1A] border border-[#EB4D4B]/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#EB4D4B] resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleReject(request.id)}
                        disabled={actionLoading === request.id}
                        className="flex items-center gap-1.5 rounded-lg bg-[#EB4D4B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#EB4D4B]/80 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === request.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Confirm Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                        className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#F5F5DC]/70 hover:bg-[#2A2A2A] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(request.id)}
                      disabled={actionLoading === request.id}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === request.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingId(request.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#EB4D4B]/30 bg-[#EB4D4B]/10 px-5 py-2.5 text-sm font-semibold text-[#EB4D4B] hover:bg-[#EB4D4B]/20 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-5">
      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={fetchRequests}
          className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#F5F5DC]/60 hover:bg-[#2A2A2A] hover:text-[#F5F5DC] transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <h2 className="text-sm font-semibold text-[#F5F5DC]/70 uppercase tracking-wider">
              Pending Review <span className="text-yellow-400 ml-1">{pending.length}</span>
            </h2>
          </div>
          <div className="space-y-3">
            {pending.map(r => <RequestCard key={r.id} request={r} />)}
          </div>
        </section>
      )}

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#F5F5DC]/30" />
            <h2 className="text-sm font-semibold text-[#F5F5DC]/70 uppercase tracking-wider">
              Reviewed <span className="text-[#F5F5DC]/40 ml-1">{reviewed.length}</span>
            </h2>
          </div>
          <div className="space-y-3">
            {reviewed.map(r => <RequestCard key={r.id} request={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
