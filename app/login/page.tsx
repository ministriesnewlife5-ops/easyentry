'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Facebook, Linkedin, Loader2, ArrowRight } from 'lucide-react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // States for flow
  const [isSignUp, setIsSignUp] = useState(false);
  const [signupStep, setSignupStep] = useState(1); // 1: Email, 2: OTP, 3: Role & Passwords
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    role: 'user', // Default role
    password: '',
    confirmPassword: '',
    name: '' // Kept for backwards compatibility if needed, though not explicitly asked
  });

  const roles = [
    { id: 'user', label: 'Regular User' },
    { id: 'artist', label: 'Artist' },
    { id: 'promoter', label: 'Promoter' },
    { id: 'outlet', label: 'Outlet Provider' },
  ];

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setError('Please enter your email');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Failed to send OTP');
        setIsLoading(false);
        return;
      }
      setSignupStep(2);
      setIsLoading(false);
    } catch {
      setError('Failed to send OTP');
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.otp) {
      setError('Please enter OTP');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: formData.otp })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Failed to verify OTP');
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setSignupStep(3);
    } catch {
      setError('Failed to verify OTP');
      setIsLoading(false);
    }
  };

  const handleFinalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
        role: formData.role, // Pass the selected role to backend
        isSignUp: 'true'
      });

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        router.push('/events');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
        isSignUp: 'false'
      });

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        router.push('/events');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setSignupStep(1); // Reset to first step when toggling
    setFormData({ email: '', otp: '', role: 'user', password: '', confirmPassword: '', name: '' });
    setError('');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Main Card Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl min-h-[600px] rounded-3xl shadow-2xl overflow-hidden flex relative"
      >
        {/* Left Side - Form */}
        <div className={`w-full md:w-1/2 bg-white p-12 flex flex-col justify-center transition-all duration-500 ${isSignUp ? 'md:order-2' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? 'signup' : 'signin'}
              initial={{ opacity: 0, x: isSignUp ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isSignUp ? -30 : 30 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </h1>

              {/* Social Login Icons */}
              <div className="flex justify-center gap-4 mb-6">
                <motion.button whileHover={{ scale: 1.1, borderColor: "rgba(168, 85, 247, 0.5)" }} whileTap={{ scale: 0.9 }} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:border-purple-500 hover:bg-gray-50 transition-all">
                  <Facebook className="w-5 h-5 text-blue-600" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1, borderColor: "rgba(168, 85, 247, 0.5)" }} whileTap={{ scale: 0.9 }} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:border-purple-500 hover:bg-gray-50 transition-all">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </motion.button>
              </div>

              <p className="text-sm text-gray-500 text-center mb-6">
                or use your account
              </p>

              {/* Form */}
              {isSignUp ? (
                // --- SIGNUP FLOW ---
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
                      {error}
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {/* STEP 1: EMAIL */}
                    {signupStep === 1 && (
                      <motion.form 
                        key="step1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onSubmit={handleSendOTP} 
                        className="space-y-4"
                      >
                        <input
                          type="email"
                          required
                          placeholder="Email Address"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors text-gray-700"
                        />
                        <motion.button
                          type="submit"
                          disabled={isLoading}
                          whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(168, 85, 247, 0.4)" }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-full hover:from-purple-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2"
                        >
                          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>Send OTP <ArrowRight className="w-4 h-4" /></>
                          )}
                        </motion.button>
                      </motion.form>
                    )}

                    {/* STEP 2: OTP */}
                    {signupStep === 2 && (
                      <motion.form 
                        key="step2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onSubmit={handleVerifyOTP} 
                        className="space-y-4"
                      >
                        <div className="text-center text-sm text-gray-600 mb-2">
                          We sent a code to <span className="font-semibold text-gray-900">{formData.email}</span>
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Enter 6-digit OTP"
                          value={formData.otp}
                          onChange={(e) => setFormData({...formData, otp: e.target.value})}
                          className="w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors text-gray-700 text-center tracking-[0.5em] font-bold text-lg"
                          maxLength={6}
                        />
                        <motion.button
                          type="submit"
                          disabled={isLoading}
                          whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(168, 85, 247, 0.4)" }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-full hover:from-purple-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2"
                        >
                          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>Verify Code <ArrowRight className="w-4 h-4" /></>
                          )}
                        </motion.button>
                        <button 
                          type="button" 
                          onClick={() => setSignupStep(1)}
                          className="w-full text-sm text-gray-500 hover:text-purple-600 transition-colors mt-2"
                        >
                          Change Email
                        </button>
                      </motion.form>
                    )}

                    {/* STEP 3: ROLE & PASSWORD */}
                    {signupStep === 3 && (
                      <motion.form 
                        key="step3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onSubmit={handleFinalSignup} 
                        className="space-y-4"
                      >
                        {/* Role Selection Dropdown */}
                        <div className="relative">
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                            className="w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors text-gray-700 appearance-none bg-white cursor-pointer"
                          >
                            {roles.map(role => (
                              <option key={role.id} value={role.id}>{role.label}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>

                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors text-gray-700 pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            className="w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors text-gray-700 pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>

                        <motion.button
                          type="submit"
                          disabled={isLoading}
                          whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(168, 85, 247, 0.4)" }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-full hover:from-purple-500 hover:to-pink-500 transition-all flex items-center justify-center"
                        >
                          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Sign Up'}
                        </motion.button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                // --- LOGIN FLOW ---
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
                      {error}
                    </div>
                  )}
                  
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors text-gray-700"
                  />

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors text-gray-700 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="text-center">
                    <Link href="/forgot-password" className="text-sm text-purple-500 hover:text-purple-600 transition-colors">
                      Forget your password?
                    </Link>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(168, 85, 247, 0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-full hover:from-purple-500 hover:to-pink-500 transition-all flex items-center justify-center"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                  </motion.button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Side - CTA */}
        <div className={`hidden md:flex md:w-1/2 bg-black relative items-center justify-center overflow-hidden ${isSignUp ? 'md:order-1' : ''}`}>
          {/* Background Image with reduced blur */}
          <div className="absolute inset-0">
            <img 
              src="/dj1.jfif" 
              alt="Background"
              className="w-full h-full object-cover blur-[2px] scale-110"
            />
            {/* Dark overlay with neon tint */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-purple-900/40 to-black/90" />
          </div>
          
          {/* Neon glow effects */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-pink-600/15 rounded-full blur-[80px]" />
            <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px]" />
          </div>
          
          {/* Animated neon orbs */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 left-1/3 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/3 right-1/3 w-40 h-40 bg-pink-500/15 rounded-full blur-3xl"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? 'cta-signup' : 'cta-signin'}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative z-10 text-center px-8"
            >
              <h2 className="text-3xl font-bold text-white mb-4">
                {isSignUp ? 'Welcome Back!' : 'Hey There!'}
              </h2>
              <p className="text-white/80 mb-8 max-w-xs mx-auto">
                {isSignUp 
                  ? 'Already have an account? Sign in to continue your journey.' 
                  : 'Create your account now and step into an amazing new journey.'}
              </p>
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(168, 85, 247, 0.2)", borderColor: "rgba(168, 85, 247, 0.5)" }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleMode}
                className="px-8 py-2.5 border-2 border-purple-500/50 text-white rounded-full transition-all font-medium hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </motion.button>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
