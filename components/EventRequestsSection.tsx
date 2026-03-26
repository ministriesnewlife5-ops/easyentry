'use client';

import { useEffect, useState } from 'react';
import { Check, X, Loader2, Clock, AlertCircle, Calendar, MapPin, IndianRupee, FileText } from 'lucide-react';
import type { EventRequest } from '@/lib/event-request-store';

export default function EventRequestsSection() {
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setError(null);
        const response = await fetch('/api/admin/event-requests', {
          cache: 'no-store',
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(data?.error || 'Failed to load event requests');
          return;
        }

        const data = await response.json();
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      } catch {
        setError('An error occurred while loading event requests');
      } finally {
        setIsLoading(false);
      }
    };

    loadRequests();
  }, []);

  const handleApprove = async (requestId: string) => {
    setActionInProgress(requestId);
    try {
      const response = await fetch('/api/admin/event-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status: 'approved' }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedRequest = data.request as EventRequest;
        const updatedRequests = requests.map(r =>
          r.id === requestId ? updatedRequest : r
        );
        setRequests(updatedRequests);
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.error || 'Failed to approve request');
      }
    } catch {
      setError('An error occurred while approving');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setActionInProgress(selectedRequest.id);
    try {
      const response = await fetch('/api/admin/event-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestId: selectedRequest.id, 
          status: 'rejected',
          rejectionReason 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedRequest = data.request as EventRequest;
        const updatedRequests = requests.map(r =>
          r.id === selectedRequest.id ? updatedRequest : r
        );
        setRequests(updatedRequests);
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedRequest(null);
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.error || 'Failed to reject request');
      }
    } catch {
      setError('An error occurred while rejecting');
    } finally {
      setActionInProgress(null);
    }
  };

  const openRejectModal = (request: EventRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/10 px-2 py-1 text-xs font-medium text-orange-400">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-400">
            <Check className="h-3 w-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EB4D4B]/10 px-2 py-1 text-xs font-medium text-[#EB4D4B]">
            <X className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#101018] p-10">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#E5A823]" />
          <span className="text-[#F5F5DC]/70">Loading event requests...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-2xl border border-[#EB4D4B]/20 bg-[#EB4D4B]/10 p-6">
        <div className="flex items-center gap-2 text-[#EB4D4B]">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#101018] p-4">
          <p className="text-sm text-[#F5F5DC]/60">Total Requests</p>
          <p className="mt-1 text-3xl font-bold text-[#F5F5DC]">{requests.length}</p>
        </div>
        <div className="rounded-xl border border-[#2A2A2A] bg-[#101018] p-4">
          <p className="text-sm text-[#F5F5DC]/60">Pending</p>
          <p className="mt-1 text-3xl font-bold text-orange-400">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-[#2A2A2A] bg-[#101018] p-4">
          <p className="text-sm text-[#F5F5DC]/60">Approved</p>
          <p className="mt-1 text-3xl font-bold text-emerald-400">
            {requests.filter(r => r.status === 'approved').length}
          </p>
        </div>
      </div>

      {/* Requests Table */}
      <article className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#101018] p-5 overflow-x-auto">
        {requests.length === 0 ? (
          <div className="py-10 text-center text-[#F5F5DC]/50">
            <FileText className="h-12 w-12 mx-auto mb-3 text-[#F5F5DC]/20" />
            <p>No event requests found</p>
            <p className="text-sm mt-1">Outlet providers have not submitted any event requests yet.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-[#F5F5DC]">
            <thead className="border-b border-[#2A2A2A] text-xs uppercase text-[#F5F5DC]/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Outlet</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-[#2A2A2A]/40 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-[#E5A823]">{request.eventData.title}</p>
                      <p className="text-xs text-[#F5F5DC]/50">{request.eventData.category}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium">{request.outletName}</p>
                    <p className="text-xs text-[#F5F5DC]/50 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {request.eventData.venue}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-[#F5F5DC]/80">
                      <Calendar className="h-3 w-3" />
                      {request.eventData.date}
                    </div>
                    <p className="text-xs text-[#F5F5DC]/50 ml-4">{request.eventData.time}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3 text-[#E5A823]" />
                      {request.eventData.price}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-4 py-4">
                    {request.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={actionInProgress === request.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                        >
                          {actionInProgress === request.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(request)}
                          disabled={actionInProgress === request.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#EB4D4B]/10 px-3 py-1.5 text-xs font-medium text-[#EB4D4B] hover:bg-[#EB4D4B]/20 transition-colors disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#F5F5DC]/50">
                        {request.reviewedAt && `Reviewed ${new Date(request.reviewedAt).toLocaleDateString()}`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      {/* Rejection Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#101018] p-6">
            <h3 className="text-lg font-semibold text-[#F5F5DC]">Reject Event Request</h3>
            <p className="mt-2 text-sm text-[#F5F5DC]/60">
              You are rejecting: <span className="text-[#E5A823]">{selectedRequest.eventData.title}</span>
            </p>
            
            <div className="mt-4">
              <label className="block text-sm text-[#F5F5DC]/70 mb-2">
                Rejection Reason (optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this event is being rejected..."
                rows={3}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-[#F5F5DC] focus:border-[#E5A823] focus:outline-none"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#F5F5DC]/70 hover:text-[#F5F5DC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionInProgress === selectedRequest.id}
                className="inline-flex items-center gap-2 rounded-lg bg-[#EB4D4B] px-4 py-2 text-sm font-medium text-white hover:bg-[#d64545] transition-colors disabled:opacity-50"
              >
                {actionInProgress === selectedRequest.id && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                Reject Event
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

