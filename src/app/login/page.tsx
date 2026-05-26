'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, ShieldCheck, TrendingUp, KeyRound, Mail, User as UserIcon, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { signInWithOtp, verifyOtp, signUpWithPassword, signInWithPassword, loading } = useAuth()
  
  // Auth mode selection: 'otp' = One-Time Code, 'password' = Email/Password credentials
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp')
  
  // Email OTP Flow States
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpToken, setOtpToken] = useState('')
  const [submittingOtp, setSubmittingOtp] = useState(false)
  
  // Email & Password Flow States
  const [passEmail, setPassEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passName, setPassName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [submittingPassword, setSubmittingPassword] = useState(false)

  // OTP handlers
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter a valid email address')
      return
    }
    setSubmittingOtp(true)
    try {
      await signInWithOtp(email)
      setOtpSent(true)
      toast.success('Verification code has been sent to your email!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code')
    } finally {
      setSubmittingOtp(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpToken || otpToken.length < 6) {
      toast.error('Please enter the 6-digit verification code')
      return
    }
    setSubmittingOtp(true)
    try {
      await verifyOtp(email, otpToken)
      toast.success('Successfully signed in!')
    } catch (error: any) {
      toast.error(error.message || 'Verification failed. Please check the code.')
    } finally {
      setSubmittingOtp(false)
    }
  }

  // Password handlers
  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passEmail || !password) {
      toast.error('Please fill in all credentials')
      return
    }
    if (isSignUp && password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }
    
    setSubmittingPassword(true)
    try {
      if (isSignUp) {
        await signUpWithPassword(passEmail, password, passName)
        toast.success('Account created successfully!')
      } else {
        await signInWithPassword(passEmail, password)
        toast.success('Successfully signed in!')
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setSubmittingPassword(false)
    }
  }

  const isFormLoading = loading || submittingOtp || submittingPassword

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 py-8 text-white">
      {/* Subtle background ambient blur */}
      <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-white/[0.01] blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-[400px] z-10"
      >
        {/* App Branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
          >
            <Sparkles className="h-8 w-8 text-neutral-200" />
          </motion.div>
          <h1 className="mt-4 text-3xl font-black tracking-tight bg-linear-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            TripFinance
          </h1>
          <p className="mt-1.5 text-xs text-neutral-500 uppercase tracking-wider font-semibold">
            Cooperative & personal expense tracking
          </p>
        </div>

        {/* Dynamic Glassmorphic Card */}
        <Card className="border-neutral-900 bg-neutral-950/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold text-white">Welcome Back</CardTitle>
            <CardDescription className="text-neutral-400 text-xs">
              Log in to manage your private and family workspace budgets
            </CardDescription>
            
            {/* Sliding Monochromatic Mode Selector */}
            <div className="mt-6 flex rounded-xl bg-neutral-900/60 p-1 border border-neutral-900">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('otp')
                  setOtpSent(false)
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-300 ${
                  authMode === 'otp'
                    ? 'bg-neutral-800 text-white shadow-md'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                One-Time Code
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('password')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-300 ${
                  authMode === 'password'
                    ? 'bg-neutral-800 text-white shadow-md'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Password Access
              </button>
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col gap-6 pt-2">
            <AnimatePresence mode="wait">
              {authMode === 'otp' ? (
                /* EMAIL OTP DUAL-PHASE FORM */
                <motion.div
                  key="otp-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {!otpSent ? (
                    /* Phase 1: Request OTP Code */
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                          <Mail className="h-3.5 w-3.5" /> Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-3.5 px-4 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isFormLoading}
                        className="w-full bg-white hover:bg-neutral-200 text-black font-bold rounded-xl py-6 shadow-md transition-all duration-300 flex items-center justify-center gap-2 border border-transparent mt-2"
                      >
                        {isFormLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                        ) : (
                          'Send Verification Code'
                        )}
                      </Button>
                    </form>
                  ) : (
                    /* Phase 2: Enter Verification Code */
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-neutral-500 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors pl-1 mb-2"
                      >
                        <ArrowLeft className="h-3 w-3" /> Change Email
                      </button>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                          <KeyRound className="h-3.5 w-3.5" /> Verification Code
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={otpToken}
                          onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-3.5 px-4 text-center tracking-widest text-lg font-mono text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300"
                        />
                        <p className="text-[10px] text-neutral-500 text-center mt-1">
                          Sent to <span className="text-neutral-300 font-semibold">{email}</span>
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={isFormLoading}
                        className="w-full bg-white hover:bg-neutral-200 text-black font-bold rounded-xl py-6 shadow-md transition-all duration-300 flex items-center justify-center gap-2 border border-transparent"
                      >
                        {isFormLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                        ) : (
                          'Verify & Access Vault'
                        )}
                      </Button>

                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isFormLoading}
                        className="w-full text-center text-xs text-neutral-400 hover:text-white transition-colors duration-300 py-2 font-medium"
                      >
                        Resend Code
                      </button>
                    </form>
                  )}
                </motion.div>
              ) : (
                /* PASSWORD SIGNUP / LOGIN DUAL FORM */
                <motion.div
                  key="password-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <form onSubmit={handlePasswordAuth} className="space-y-4">
                    {isSignUp && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                          <UserIcon className="h-3.5 w-3.5" /> Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={passName}
                          onChange={(e) => setPassName(e.target.value)}
                          placeholder="Alexander"
                          className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-3.5 px-4 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                        <Mail className="h-3.5 w-3.5" /> Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={passEmail}
                        onChange={(e) => setPassEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-3.5 px-4 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                        <KeyRound className="h-3.5 w-3.5" /> Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-3.5 px-4 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isFormLoading}
                      className="w-full bg-white hover:bg-neutral-200 text-black font-bold rounded-xl py-6 shadow-md transition-all duration-300 flex items-center justify-center gap-2 border border-transparent mt-2"
                    >
                      {isFormLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      ) : isSignUp ? (
                        'Create Account'
                      ) : (
                        'Sign In'
                      )}
                    </Button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-xs text-neutral-400 hover:text-white transition-colors duration-300 font-semibold"
                      >
                        {isSignUp
                          ? 'Already have an account? Sign In'
                          : "New here? Create a family account"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Apple Style Monochromatic Feature Highlights */}
            <div className="border-t border-neutral-900 pt-6 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">Private & Secure</h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">
                    Row Level Security (RLS) ensures personal expenses stay strictly invisible to other workspace members.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">Cupertino Debt Matching</h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">
                    Instantly resolve cooperative group balance splits with high-efficiency settlement matching metrics.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
