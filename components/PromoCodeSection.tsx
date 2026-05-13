'use client';

import { motion } from 'framer-motion';
import { Ticket, Send, Edit2, X } from 'lucide-react';
import { useState } from 'react';

interface GlobalCoupon {
  id: string;
  code: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  usage_count: number;
  created_at: string;
}

interface PromoSummary {
  totalShareAmount: number;
  totalBookedAmount: number;
  totalBookings: number;
}

interface PromoForm {
  code: string;
  maxUses?: string;
  isActive?: boolean;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

interface PromoCodeSectionProps {
  role: 'ARTIST' | 'PROMOTER';
  promoForm: PromoForm;
  globalCoupons: GlobalCoupon[];
  promoSummary: PromoSummary;
  message: Message | null;
  onPromoInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onGenerateCode: () => void;
  onSubmitPromo: (e: React.FormEvent) => void;
  onEditPromo?: (couponId: string) => void;
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
  onEditPromo,
}: PromoCodeSectionProps) {
  const hasCoupon = globalCoupons.length > 0;
  const existingCoupon = globalCoupons[0] || null;
  const [isEditing, setIsEditing] = useState(false);

  const getPlaceholder = () => {
    return role === 'ARTIST' ? 'e.g. ARTIST2024' : 'e.g. PARTY2024';
  };

  const usagePercent = existingCoupon && existingCoupon.max_uses
    ? Math.round((existingCoupon.usage_count / existingCoupon.max_uses) * 100)
    : 0;

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

      {/* Create or Edit Coupon Form */}
      {!hasCoupon ? (
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#E5A823]" />
            Create Your Promo Code
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
                  maxLength={24}
                />
                <button
                  type="button"
                  onClick={onGenerateCode}
                  className="px-4 py-3 bg-[#2A2A2A] border border-[#E5A823]/30 text-[#E5A823] rounded-lg font-medium hover:bg-[#E5A823]/10 transition-colors"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-[#F5F5DC]/50 mt-2">3-24 characters (A-Z, 0-9, _, -). You can only create ONE coupon.</p>
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
      ) : (
        // Active Coupon Card with Edit
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#E5A823]" />
              Your Promo Code
            </h3>
          </div>

          {isEditing ? (
            <form onSubmit={(e) => { e.preventDefault(); onSubmitPromo(e); setIsEditing(false); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Code</label>
                <input
                  type="text"
                  name="code"
                  value={promoForm.code}
                  onChange={onPromoInputChange}
                  className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823] uppercase tracking-wider"
                  maxLength={24}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Uses (Leave empty for unlimited)</label>
                <input
                  type="number"
                  name="maxUses"
                  value={promoForm.maxUses || ''}
                  onChange={onPromoInputChange}
                  className="w-full bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F5DC] focus:outline-none focus:border-[#E5A823]"
                  placeholder="e.g. 100"
                  min="1"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={promoForm.isActive !== false}
                    onChange={(e) => onPromoInputChange(e as any)}
                    className="w-4 h-4 rounded bg-[#2A2A2A] border-[#2A2A2A] text-[#E5A823]"
                  />
                  <span className="text-sm">Active (Customers can use)</span>
                </label>
              </div>

              <div className="flex gap-3">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 bg-gradient-to-r from-[#E5A823] to-[#F5C542] text-[#0D0D0D] font-bold rounded-lg"
                >
                  Save Changes
                </motion.button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-3 bg-[#2A2A2A] text-[#F5F5DC] rounded-lg hover:bg-[#333333] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
                <div className="p-4 bg-[#2A2A2A] rounded-lg">
                  <p className="text-xs text-[#F5F5DC]/60 mb-2">Active Coupon Code</p>
                  <p className="text-2xl font-mono font-bold text-[#E5A823]">{existingCoupon?.code}</p>
                  <p className="text-xs text-[#F5F5DC]/50 mt-2">Works on ALL your events • Event-based discount</p>

                  {/* Edit button under the displayed code */}
                  <div className="mt-4">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-[#2A2A2A] border border-[#E5A823]/30 text-[#E5A823] rounded-lg font-medium hover:bg-[#E5A823]/10 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>

              {existingCoupon?.max_uses && (
                <div className="p-4 bg-[#2A2A2A] rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-[#F5F5DC]/60">Usage</p>
                    <p className="text-sm font-medium text-[#E5A823]">{existingCoupon.usage_count} / {existingCoupon.max_uses}</p>
                  </div>
                  <div className="w-full bg-[#1A1A1A] rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#E5A823] to-[#F5C542] h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="p-4 bg-[#2A2A2A] rounded-lg">
                <p className="text-xs text-[#F5F5DC]/60 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  existingCoupon?.is_active
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-gray-500/20 text-gray-500'
                }`}>
                  {existingCoupon?.is_active ? '✓ Active' : '○ Inactive'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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
    </motion.div>
  );
}
