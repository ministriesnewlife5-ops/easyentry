import { useState, useCallback } from 'react';

interface QRCodeResponse {
  ticketId: string;
  bookingId: string;
  qrCodeImage: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  customerName: string;
  customerEmail: string;
  ticketCategory: string;
  quantity: number;
  amountPaid: number;
  bookedAt: string;
}

interface UseQRCodeResult {
  qrData: QRCodeResponse | null;
  loading: boolean;
  error: string | null;
  fetchQRCode: (bookingId?: string, ticketId?: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for managing QR code retrieval and display
 */
export function useQRCode(): UseQRCodeResult {
  const [qrData, setQRData] = useState<QRCodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQRCode = useCallback(
    async (bookingId?: string, ticketId?: string) => {
      if (!bookingId && !ticketId) {
        setError('Either bookingId or ticketId is required');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (bookingId) params.append('booking_id', bookingId);
        if (ticketId) params.append('ticket_id', ticketId);
        params.append('format', 'data');

        const response = await fetch(`/api/qr-codes?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch QR code');
        }

        const { data } = await response.json();
        
        // Fetch the image separately if needed
        const imageParams = new URLSearchParams();
        if (bookingId) imageParams.append('booking_id', bookingId);
        if (ticketId) imageParams.append('ticket_id', ticketId);
        imageParams.append('format', 'image');

        const imageResponse = await fetch(`/api/qr-codes?${imageParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          setQRData({
            ticketId: data.qrCodeData.t,
            bookingId: data.qrCodeData.b,
            qrCodeImage: imageData.data.qrCodeImage,
            eventName: data.qrCodeData.en,
            eventDate: data.qrCodeData.ed,
            eventVenue: data.qrCodeData.ev,
            customerName: data.qrCodeData.un,
            customerEmail: data.qrCodeData.ue,
            ticketCategory: data.qrCodeData.tc,
            quantity: data.qrCodeData.q,
            amountPaid: data.qrCodeData.ap,
            bookedAt: data.qrCodeData.ba,
          });
        } else {
          // Data available even if image fetch fails
          setQRData({
            ticketId: data.qrCodeData.t,
            bookingId: data.qrCodeData.b,
            qrCodeImage: '',
            eventName: data.qrCodeData.en,
            eventDate: data.qrCodeData.ed,
            eventVenue: data.qrCodeData.ev,
            customerName: data.qrCodeData.un,
            customerEmail: data.qrCodeData.ue,
            ticketCategory: data.qrCodeData.tc,
            quantity: data.qrCodeData.q,
            amountPaid: data.qrCodeData.ap,
            bookedAt: data.qrCodeData.ba,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred while fetching QR code';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setQRData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    qrData,
    loading,
    error,
    fetchQRCode,
    reset,
  };
}

/**
 * Hook for verifying QR code validity
 */
export function useQRCodeVerification() {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);

  const verifyQRCode = useCallback(async (ticketId: string) => {
    setLoading(true);
    setError(null);
    setIsValid(null);

    try {
      const response = await fetch('/api/qr-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setIsValid(false);
        setError(errorData.message || 'QR code verification failed');
        return;
      }

      const { data } = await response.json();
      setIsValid(data.valid);
      setDetails(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred during verification';
      setError(message);
      setIsValid(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isValid,
    loading,
    error,
    details,
    verifyQRCode,
  };
}
