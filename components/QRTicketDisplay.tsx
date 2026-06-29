'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Download, Print, Share2 } from 'lucide-react';

interface QRTicketDisplayProps {
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

export function QRTicketDisplay({
  ticketId,
  bookingId,
  qrCodeImage,
  eventName,
  eventDate,
  eventVenue,
  customerName,
  customerEmail,
  ticketCategory,
  quantity,
  amountPaid,
  bookedAt,
}: QRTicketDisplayProps) {
  const [isCopied, setIsCopied] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async () => {
    try {
      const link = document.createElement('a');
      link.href = qrCodeImage;
      link.download = `easyentry-ticket-${ticketId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>EasyEntry Ticket - ${ticketId}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background: white;
            }
            .ticket {
              border: 2px solid #333;
              padding: 30px;
              border-radius: 10px;
              background: #f9f9f9;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #333;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .event-title {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              margin: 0;
            }
            .event-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 20px 0;
            }
            .detail {
              padding: 10px;
            }
            .detail-label {
              font-weight: bold;
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
            }
            .detail-value {
              font-size: 16px;
              color: #333;
              margin-top: 5px;
            }
            .qr-section {
              text-align: center;
              padding: 20px;
              border-top: 2px dashed #333;
              border-bottom: 2px dashed #333;
              margin: 20px 0;
            }
            .qr-section img {
              width: 250px;
              height: 250px;
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #666;
              margin-top: 20px;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .ticket { border: none; background: white; }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <p class="event-title">${eventName}</p>
            </div>
            
            <div class="event-details">
              <div class="detail">
                <div class="detail-label">Event Date</div>
                <div class="detail-value">${formatDate(eventDate)}</div>
              </div>
              <div class="detail">
                <div class="detail-label">Venue</div>
                <div class="detail-value">${eventVenue}</div>
              </div>
              <div class="detail">
                <div class="detail-label">Customer Name</div>
                <div class="detail-value">${customerName}</div>
              </div>
              <div class="detail">
                <div class="detail-label">Email</div>
                <div class="detail-value">${customerEmail}</div>
              </div>
              <div class="detail">
                <div class="detail-label">Ticket Category</div>
                <div class="detail-value">${ticketCategory}</div>
              </div>
              <div class="detail">
                <div class="detail-label">Quantity</div>
                <div class="detail-value">${quantity}</div>
              </div>
            </div>

            <div class="qr-section">
              <div class="detail-label">Scan this code for entry</div>
              <img src="${qrCodeImage}" alt="QR Code" />
              <div class="detail-value" style="margin-top: 10px;">Ticket ID: ${ticketId}</div>
            </div>

            <div class="footer">
              <p>Booking ID: ${bookingId}</p>
              <p>Amount Paid: ₹${amountPaid.toFixed(2)}</p>
              <p>Booked: ${formatDate(bookedAt)} at ${formatTime(bookedAt)}</p>
              <p>Please keep this ticket safe and present it at the venue for entry.</p>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleCopyTicketId = () => {
    navigator.clipboard.writeText(ticketId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${eventName} - Ticket`,
          text: `I have a ticket for ${eventName}! Ticket ID: ${ticketId}`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      handleCopyTicketId();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <h1 className="text-3xl font-bold mb-2">Your Ticket</h1>
        <p className="text-purple-100">Event confirmation and entry pass</p>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Event Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">{eventName}</h2>
        </div>

        {/* Event Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="border-l-4 border-purple-600 pl-4">
            <p className="text-sm text-gray-600 font-semibold uppercase">Event Date</p>
            <p className="text-lg text-gray-800 font-bold">{formatDate(eventDate)}</p>
          </div>

          <div className="border-l-4 border-blue-600 pl-4">
            <p className="text-sm text-gray-600 font-semibold uppercase">Venue</p>
            <p className="text-lg text-gray-800 font-bold">{eventVenue}</p>
          </div>

          <div className="border-l-4 border-green-600 pl-4">
            <p className="text-sm text-gray-600 font-semibold uppercase">Customer</p>
            <p className="text-lg text-gray-800 font-bold">{customerName}</p>
          </div>

          <div className="border-l-4 border-orange-600 pl-4">
            <p className="text-sm text-gray-600 font-semibold uppercase">Ticket Type</p>
            <p className="text-lg text-gray-800 font-bold">
              {ticketCategory} ({quantity} {quantity === 1 ? 'ticket' : 'tickets'})
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-dashed border-gray-300 my-8"></div>

        {/* QR Code Section */}
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 font-semibold uppercase mb-4">Scan for Entry</p>
          <div className="bg-gray-100 p-4 rounded-lg inline-block">
            {qrCodeImage ? (
              <img
                src={qrCodeImage}
                alt="QR Code"
                className="w-64 h-64 object-contain"
              />
            ) : (
              <div className="w-64 h-64 bg-gray-200 flex items-center justify-center rounded">
                <p className="text-gray-500">Loading QR Code...</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-4">Keep this QR code safe</p>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-dashed border-gray-300 my-8"></div>

        {/* Ticket Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-sm font-bold text-gray-800 uppercase mb-4">Ticket Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Ticket ID</p>
              <p className="font-mono text-gray-900 break-all">{ticketId}</p>
            </div>
            <div>
              <p className="text-gray-600">Booking ID</p>
              <p className="font-mono text-gray-900 break-all">{bookingId}</p>
            </div>
            <div>
              <p className="text-gray-600">Amount Paid</p>
              <p className="font-bold text-gray-900">₹{amountPaid.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Booked On</p>
              <p className="text-gray-900">
                {formatDate(bookedAt)} {formatTime(bookedAt)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-600">Email</p>
              <p className="text-gray-900">{customerEmail}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Download size={18} />
            Download QR
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Print size={18} />
            Print Ticket
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Share2 size={18} />
            Share
          </button>

          <button
            onClick={handleCopyTicketId}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            {isCopied ? '✓ Copied!' : 'Copy Ticket ID'}
          </button>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm text-gray-700">
            <strong>Important:</strong> Please present this ticket (QR code) at the venue entrance for entry. 
            You can download, print, or share it. Each ticket is unique and can only be used once.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          © 2024 EasyEntry. All rights reserved. For support, contact{' '}
          <span className="text-blue-600">support@easyentry.com</span>
        </p>
      </div>
    </div>
  );
}
