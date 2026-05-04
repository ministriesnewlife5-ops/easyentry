'use client';

import { motion } from 'framer-motion';
import { Ticket, Send } from 'lucide-react';

interface GlobalCoupon {
  id: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  createdAt: string;
}

interface PromoSummary {
  totalShareAmount: number;
  totalBookedAmount: number;
  totalBookings: number;
}

interface PromoForm {
  code: string;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

interface PromoCodeSectionProps {
  role: 'artist' | 'promoter';
  promoForm: PromoForm;
  globalCoupons: GlobalCoupon[];
  promoSummary: PromoSummary;
  message: Message | null;
  onPromoInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateCode: () => void;
  onSubmitPromo: (e: React.FormEvent) => void;
}

export default function PromoCodeSection({
  role,
  promoForm,
  globalCoupons,
  promoSummary,
  message,
  onPromoInputChange,
  onGenerateCode,
  onSubmitPromo,
}: PromoCodeSectionProps) {
  const getPlaceholder = () => {
    return role === 'artist' ? 'e.g. ARTIST2024' : 'e.g. PARTY2024';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-500'
            : 'bg-red-500/10 border border-red-500/30 text-red-500'
        }`}>
          {message.text}
        </div>
      )}

      {/* Create Promo Code Form */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-[#E5A823]" />
          Create Promo Code (Live)
        </h3>

        <form onSubmit={onSubmitPromo} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3">Coupon Code</label>
            <div className="flex gap-3">
              <input
                type="text"
                name="code"
                value={promoForm.code}
                onChange={onPromoInputChange}
                className="flex-1 bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] uppercase tracking-wider"
                placeholder={getPlaceholder()}
              />
              <button
                type="button"
                onClick={onGenerateCode}
                className="px-4 py-3 bg-[#2A2A2A] border border-[#E5A823]/30 text-[#E5A823] rounded-lg font-medium hover:bg-[#E5A823]/10 transition-colors"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-[#F5F5DC]/50 mt-2">Click "Generate" to create a unique code automatically</p>
          </div>

          <div className="rounded-lg border border-[#E5A823]/30 bg-[#E5A823]/10 px-4 py-3 text-sm text-[#F5F5DC]/90">
            Discount is event-based and auto-calculated from each event's artist/influencer ticket discount settings.
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Create Promo Code
          </motion.button>
        </form>
      </div>

      {/* Promo Earnings */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
        <h3 className="text-lg font-bold mb-4">Promo Earnings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-[#2A2A2A]">
            <p className="text-xs text-[#F5F5DC]/60">Your Share (Auto Credited)</p>
            <p className="text-2xl font-bold text-[#E5A823]">₹{promoSummary.totalShareAmount.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-lg bg-[#2A2A2A]">
            <p className="text-xs text-[#F5F5DC]/60">Promo Bookings</p>
            <p className="text-2xl font-bold text-[#F5F5DC]">{promoSummary.totalBookings}</p>
          </div>
          <div className="p-4 rounded-lg bg-[#2A2A2A]">
            <p className="text-xs text-[#F5F5DC]/60">Total GMV via Promo</p>
            <p className="text-2xl font-bold text-[#F5F5DC]">₹{promoSummary.totalBookedAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Active Global Coupons */}
      {globalCoupons.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <h3 className="text-lg font-bold mb-4">Your Global Coupons</h3>
          <div className="space-y-3">
            {globalCoupons.map((coupon) => (
              <div key={coupon.id} className="flex items-center justify-between p-4 bg-[#2A2A2A] rounded-lg">
                <div>
                  <p className="font-medium text-sm text-[#F5F5DC]/80">Works on ALL events</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-lg text-[#E5A823] font-mono font-bold">{coupon.code}</p>
                    <p className="text-sm text-[#F5F5DC]/60">• Event-based discount</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    coupon.isActive
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-gray-500/20 text-gray-500'
                  }`}
                >
                  {coupon.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
