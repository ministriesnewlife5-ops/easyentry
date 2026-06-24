"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

type SelectedEvent = { eventId: string; eventCode: string; eventTitle: string };

type VerifyResult =
  | { result: 'not_found' }
  | { result: 'wrong_event'; message: string }
  | { result: 'cancelled' }
  | { result: 'already_used'; checked_in_count: number; total_tickets: number; first_checked_in_at?: string }
  | {
      result: 'valid';
      bookingId: string;
      purchaserName?: string;
      totalTickets: number;
      alreadyCheckedIn: number;
      remaining: number;
      paymentMode: 'online' | 'pay_at_venue';
      venuePaymentStatus: 'paid' | 'unpaid' | null;
      remainingAmount: number;
      eventTitle?: string;
      eventDate?: string;
    };

export default function StaffScanPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selected, setSelected] = useState<SelectedEvent | null>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'warn' | 'info' | 'success'; text: string } | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [manualId, setManualId] = useState('');
  const [checkInCount, setCheckInCount] = useState(1);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.push('/staff');
      return;
    }

    const match = document.cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith('staff_selected_event='));
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
  }, [session, status, router]);

  useEffect(() => {
    if (!selected) return;

    const startScanner = async () => {
      try {
        setScanning(true);
        const { Html5Qrcode } = await import('html5-qrcode');
        const qrRegionId = 'html5qr-scanner';
        // create the element if missing
        let el = document.getElementById(qrRegionId);
        if (!el) {
          el = document.createElement('div');
          el.id = qrRegionId;
          // insert after the video container
          const container = document.querySelector('.w-full.h-56');
          if (container && container.parentNode) container.parentNode.insertBefore(el, container.nextSibling);
          else document.body.appendChild(el);
        }

        scannerRef.current = new Html5Qrcode(qrRegionId);

        const cameras = await Html5Qrcode.getCameras().catch(() => []);
        let cameraId: string | undefined = undefined;
        if (cameras && cameras.length) {
          // prefer back camera if available
          const back = cameras.find((c: any) => /back|rear|environment/i.test(c.label || c.id));
          cameraId = (back && back.id) || cameras[0].id;
        }

        // Start without html5-qrcode's built-in qrbox so our custom overlay is the only viewfinder
        await scannerRef.current.start(
          cameraId || { facingMode: 'environment' },
          { fps: 10 },
          (decodedText: string) => {
            handleScanned(String(decodedText || ''));
          },
          (errorMessage: any) => {
            // ignore per-frame decode errors
          }
        );
      } catch (err) {
        console.error('html5-qrcode start failed:', err);
        setMessage({ type: 'error', text: 'Camera unavailable — use manual booking ID input' });
      }
    };

    startScanner();

    return () => {
      setScanning(false);
      try {
        if (scannerRef.current) {
          scannerRef.current.stop().catch((e: any) => console.error('Failed to stop scanner:', e));
          scannerRef.current.clear().catch((e: any) => {});
        }
      } catch (e) {
        console.error('Scanner cleanup error:', e);
      }
    };
  }, [selected]);

  async function handleScanned(raw: string) {
    if (!selected) return;
    if (!raw) return;
    setScanning(false);
    setMessage({ type: 'info', text: `Scanned: ${raw}` });
    // Call verify API
    try {
      const res = await fetch('/api/staff/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: raw, eventId: selected.eventId }),
      });
      const body = await res.json();
      setVerifyResult(body as VerifyResult);
      if ((body as any).result === 'valid') {
        // default stepper to full remaining on valid ticket
        try {
          setCheckInCount(Number((body as any).remaining) || 1);
        } catch (e) {}
      }
      if ((body as any).result !== 'valid') setMessage({ type: 'warn', text: `Result: ${(body as any).result}` });
      else setMessage({ type: 'success', text: 'Ticket valid' });
    } catch (e) {
      console.error('Verify API error:', e);
      setMessage({ type: 'error', text: 'Verification failed' });
    }
  }

  async function onManualVerify() {
    if (!manualId || !selected) return;
    await handleScanned(manualId.trim());
  }

  async function onMarkPaid(bookingId: string) {
    try {
      const res = await fetch('/api/staff/tickets/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const body = await res.json();
      if (res.ok) {
        // re-run verify for fresh state
        setMessage({ type: 'success', text: 'Marked paid' });
        await handleScanned(bookingId);
      } else {
        console.error('Mark-paid error:', body);
        setMessage({ type: 'error', text: 'Failed to mark paid' });
      }
    } catch (e) {
      console.error('Mark-paid exception:', e);
      setMessage({ type: 'error', text: 'Failed to mark paid' });
    }
  }

  async function onConfirmCheckIn(bookingId: string, count: number) {
    if (!selected) return;
    try {
      const res = await fetch('/api/staff/tickets/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, eventId: selected.eventId, checkInCount: count }),
      });
      const body = await res.json();
      if (res.ok && (body as any).result === 'ok') {
        setMessage({ type: 'success', text: `Checked in ${count}` });
        // refresh verify state
        await handleScanned(bookingId);
      } else {
        console.error('Check-in failed:', body);
        setMessage({ type: 'error', text: `Check-in failed: ${(body as any).message || (body as any).error || 'unknown'}` });
      }
    } catch (e) {
      console.error('Check-in exception:', e);
      setMessage({ type: 'error', text: 'Check-in failed' });
    }
  }

  if (!selected) return null;

  return (
    <div className="min-h-screen p-4 bg-[#0D0D0D] text-[#F5F5DC]">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E5A823]">Scanner</h1>
          <p className="text-sm mt-1">{selected.eventTitle} — <span className="font-mono">{selected.eventCode}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-3 py-2 bg-[#111] rounded" onClick={() => router.push('/staff/event')}>Change Event</button>
          <button className="px-3 py-2 bg-[#111] rounded" onClick={() => signOut({ callbackUrl: '/staff' })}>Logout</button>
        </div>
      </header>

      <main className="mt-4">
        <div className="rounded overflow-hidden bg-[#111] p-3">
          <div className="w-full h-56 bg-black flex items-center justify-center relative">
            <div id="html5qr-scanner" className="w-full h-full" />

            {/* Overlay: dim outside, centered square with corner brackets */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-[60%] max-w-[380px] aspect-square z-10">
                  {/* Corner brackets */}
                  <div className="absolute -top-2 -left-2 w-10 h-10">
                    <div className="w-10 h-10 border-t-4 border-l-4 border-[#E5A823]" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-10 h-10">
                    <div className="w-10 h-10 border-t-4 border-r-4 border-[#E5A823]" />
                  </div>
                  <div className="absolute -bottom-2 -left-2 w-10 h-10">
                    <div className="w-10 h-10 border-b-4 border-l-4 border-[#E5A823]" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10">
                    <div className="w-10 h-10 border-b-4 border-r-4 border-[#E5A823]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm text-[#F5F5DC]/70">Point camera at ticket QR code. If camera is unavailable, enter booking ID manually.</p>
          </div>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded ${message.type === 'error' ? 'bg-red-700' : message.type === 'warn' ? 'bg-amber-700' : 'bg-green-700'}`}>
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <section className="mt-4 bg-[#111] p-4 rounded">
          <div className="flex gap-2">
            <input value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="Manual booking ID" className="flex-1 p-3 rounded bg-[#0b0b0b]" />
            <button onClick={onManualVerify} className="px-4 py-2 bg-[#E5A823] text-black rounded">Verify</button>
          </div>

          {verifyResult && (
            <div className="mt-4">
              {verifyResult.result === 'not_found' && (<div className="p-3 bg-red-700 rounded">Invalid ticket</div>)}
              {verifyResult.result === 'wrong_event' && (<div className="p-3 bg-red-700 rounded">This ticket is for a different event</div>)}
              {verifyResult.result === 'cancelled' && (<div className="p-3 bg-red-700 rounded">Ticket cancelled</div>)}
              {verifyResult.result === 'already_used' && (
                <div className="p-3 bg-amber-700 rounded">
                  <div>Already fully checked in.</div>
                  <div className="text-sm">Checked in at: {(verifyResult as any).first_checked_in_at || 'unknown'}</div>
                </div>
              )}

              {verifyResult.result === 'valid' && (
                <div className="p-4 bg-[#0c0c0c] rounded mt-3">
                  <div className="text-lg font-semibold">{verifyResult.purchaserName || 'Customer'}</div>
                  <div className="text-sm mt-1">Total: {verifyResult.totalTickets} • Checked in: {verifyResult.alreadyCheckedIn} • Remaining: {verifyResult.remaining}</div>
                  <div className="mt-3">
                    {verifyResult.paymentMode === 'pay_at_venue' && verifyResult.venuePaymentStatus !== 'paid' ? (
                      <div className="flex gap-2">
                        <button onClick={() => onMarkPaid((verifyResult as any).bookingId)} className="px-4 py-2 bg-[#E5A823] text-black rounded">Mark as Paid (₹{verifyResult.remainingAmount})</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <label className="text-sm">Check-in:</label>
                        <div className="inline-flex items-center bg-[#0b0b0b] rounded">
                          <button
                            onClick={() => setCheckInCount((c) => Math.max(1, c - 1))}
                            disabled={checkInCount <= 1}
                            className={`w-12 h-12 flex items-center justify-center ${checkInCount <= 1 ? 'bg-[#222] text-[#777]' : 'bg-[#111] text-[#F5F5DC]'} rounded-l`}
                            aria-label="decrement"
                          >
                            −
                          </button>
                          <div className="w-20 text-center text-lg font-medium">{checkInCount}</div>
                          <button
                            onClick={() => setCheckInCount((c) => Math.min(verifyResult.remaining, c + 1))}
                            disabled={checkInCount >= verifyResult.remaining}
                            className={`w-12 h-12 flex items-center justify-center ${checkInCount >= verifyResult.remaining ? 'bg-[#222] text-[#777]' : 'bg-[#111] text-[#F5F5DC]'} rounded-r`}
                            aria-label="increment"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-sm">of {verifyResult.remaining} remaining</div>
                        <button onClick={() => onConfirmCheckIn((verifyResult as any).bookingId, checkInCount)} className="px-4 py-2 bg-[#E5A823] text-black rounded">Confirm Check-In</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
