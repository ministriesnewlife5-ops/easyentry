"use client";

import { useState } from "react";
import { X, Lock, Mail, Key, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";

interface PasswordSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalView = "change-password" | "forgot-password" | "verify-otp" | "reset-password";

export default function PasswordSettings({ isOpen, onClose }: PasswordSettingsProps) {
  const { data: session } = useSession();
  const [currentView, setCurrentView] = useState<ModalView>("change-password");

  // Change Password States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Password States
  const [email, setEmail] = useState(session?.user?.email || "");
  const [otp, setOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForgotLink, setShowForgotLink] = useState(false);

  const resetAllStates = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setEmail(session?.user?.email || "");
    setOtp("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setError(null);
    setSuccess(null);
    setShowForgotLink(false);
    setCurrentView("change-password");
  };

  const handleClose = () => {
    resetAllStates();
    onClose();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setShowForgotLink(false);

    if (!session?.user?.email) {
      setError("User session not found");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          oldPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setShowForgotLink(true);
        }
        throw new Error(data.message || "Failed to change password");
      }

      setSuccess("Password changed successfully!");
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send OTP");
      }

      setSuccess("OTP sent to your email!");
      setCurrentView("verify-otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (resetNewPassword !== resetConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (resetNewPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword: resetNewPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccess("Password reset successfully!");
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-gradient-to-b from-[#111111] to-[#0A0A0A] p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1 text-[#F5F5DC]/50 transition hover:bg-[#2A2A2A] hover:text-[#F5F5DC]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#E5A823]/15">
            {currentView === "change-password" ? (
              <Lock className="h-6 w-6 text-[#E5A823]" />
            ) : currentView === "forgot-password" ? (
              <Mail className="h-6 w-6 text-[#E5A823]" />
            ) : (
              <Key className="h-6 w-6 text-[#E5A823]" />
            )}
          </div>
          <h2 className="text-xl font-bold text-[#F5F5DC]">
            {currentView === "change-password" && "Change Password"}
            {currentView === "forgot-password" && "Forgot Password"}
            {currentView === "verify-otp" && "Verify OTP"}
            {currentView === "reset-password" && "Reset Password"}
          </h2>
          <p className="mt-1 text-sm text-[#F5F5DC]/60">
            {currentView === "change-password" && "Enter your current and new password"}
            {currentView === "forgot-password" && "Enter your email to receive OTP"}
            {currentView === "verify-otp" && "Enter the OTP sent to your email"}
            {currentView === "reset-password" && "Enter your new password"}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Change Password Form */}
        {currentView === "change-password" && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#F5F5DC]/80">
                Old Password
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#161616] px-3 py-2.5 pr-10 text-sm text-[#F5F5DC] outline-none transition focus:border-[#E5A823]"
                  placeholder="Enter old password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/40 transition hover:text-[#F5F5DC]"
                >
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#F5F5DC]/80">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#161616] px-3 py-2.5 pr-10 text-sm text-[#F5F5DC] outline-none transition focus:border-[#E5A823]"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/40 transition hover:text-[#F5F5DC]"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#F5F5DC]/80">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#161616] px-3 py-2.5 pr-10 text-sm text-[#F5F5DC] outline-none transition focus:border-[#E5A823]"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/40 transition hover:text-[#F5F5DC]"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {showForgotLink && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView("forgot-password");
                    setError(null);
                    setShowForgotLink(false);
                  }}
                  className="text-sm font-medium text-[#E5A823] transition hover:text-[#F5C542] hover:underline"
                >
                  Try forgot password instead
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#E5A823] px-4 py-2.5 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F5C542] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Changing..." : "Change Password"}
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView("forgot-password");
                setError(null);
              }}
              className="w-full text-center text-sm text-[#F5F5DC]/60 transition hover:text-[#F5F5DC]"
            >
              Forgot your password?
            </button>
          </form>
        )}

        {/* Forgot Password Form - Email Input */}
        {currentView === "forgot-password" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#F5F5DC]/80">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5F5DC]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#161616] py-2.5 pl-10 pr-3 text-sm text-[#F5F5DC] outline-none transition focus:border-[#E5A823]"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#E5A823] px-4 py-2.5 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F5C542] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView("change-password");
                setError(null);
              }}
              className="w-full text-center text-sm text-[#F5F5DC]/60 transition hover:text-[#F5F5DC]"
            >
              Back to change password
            </button>
          </form>
        )}

        {/* Verify OTP & Reset Password Form */}
        {currentView === "verify-otp" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCurrentView("reset-password");
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#F5F5DC]/80">
                Enter OTP
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5F5DC]/40" />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#161616] py-2.5 pl-10 pr-3 text-sm text-[#F5F5DC] outline-none transition focus:border-[#E5A823]"
                  placeholder="Enter 6-digit OTP"
                  required
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
              <p className="mt-1.5 text-xs text-[#F5F5DC]/50">
                OTP sent to {email}
              </p>
            </div>

            <button
              type="submit"
              disabled={otp.length !== 6}
              className="w-full rounded-xl bg-[#E5A823] px-4 py-2.5 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F5C542] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Verify OTP
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView("forgot-password");
                setError(null);
              }}
              className="w-full text-center text-sm text-[#F5F5DC]/60 transition hover:text-[#F5F5DC]"
            >
              Back to email
            </button>
          </form>
        )}

        {/* Reset Password Form */}
        {currentView === "reset-password" && (
          <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#F5F5DC]/80">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showResetPassword ? "text" : "password"}
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#161616] px-3 py-2.5 pr-10 text-sm text-[#F5F5DC] outline-none transition focus:border-[#E5A823]"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/40 transition hover:text-[#F5F5DC]"
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#F5F5DC]/80">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showResetConfirmPassword ? "text" : "password"}
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#161616] px-3 py-2.5 pr-10 text-sm text-[#F5F5DC] outline-none transition focus:border-[#E5A823]"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F5F5DC]/40 transition hover:text-[#F5F5DC]"
                >
                  {showResetConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#E5A823] px-4 py-2.5 text-sm font-semibold text-[#0D0D0D] transition hover:bg-[#F5C542] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView("verify-otp");
                setError(null);
              }}
              className="w-full text-center text-sm text-[#F5F5DC]/60 transition hover:text-[#F5F5DC]"
            >
              Back to OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
