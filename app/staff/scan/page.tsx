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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

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

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (videoRef.current) videoRef.current.srcObject = stream;

        // Use native BarcodeDetector if available
        const BarcodeDetectorCtor = (window as any).BarcodeDetector;
        if (BarcodeDetectorCtor) {
          try {
            detectorRef.current = new BarcodeDetectorCtor({ formats: ['qr_code'] });
          } catch (e) {
            detectorRef.current = null;
          }
        }

        // Start scanning loop
        setScanning(true);

        scanIntervalRef.current = window.setInterval(async () => {
          try {
            if (!videoRef.current) return;
            if (detectorRef.current) {
              // draw to canvas and detect
              if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
              const video = videoRef.current;
              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
              const ctx = canvasRef.current.getContext('2d');
              if (!ctx) return;
              ctx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);
              const bitmap = await createImageBitmap(canvasRef.current);
              const barcodes = await detectorRef.current.detect(bitmap);
              if (barcodes && barcodes.length > 0) {
                handleScanned(String(barcodes[0].rawValue || ''));
              }
            }
          } catch (e) {
            console.error('Scan loop error:', e);
          }
        }, 700);
      } catch (err) {
        console.error('Camera start failed:', err);
        setMessage({ type: 'error', text: 'Camera unavailable — use manual booking ID input' });
      }
    };

    startCamera();

    return () => {
      setScanning(false);
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks() || [];
      tracks.forEach((t) => t.stop());
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
          <div className="w-full h-56 bg-black flex items-center justify-center">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
          <div className="mt-3">
            <p className="text-sm text-[#F5F5DC]/70">Point the camera at the ticket QR. If camera is unavailable, enter booking ID manually.</p>
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
                      <div className="flex items-center gap-2">
                        <label className="text-sm">Check-in:</label>
                        <input type="number" min={1} max={verifyResult.remaining} value={checkInCount} onChange={(e) => setCheckInCount(Math.max(1, Math.min(Number(e.target.value || 1), verifyResult.remaining)))} className="w-20 p-2 rounded bg-[#0b0b0b]" />
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
