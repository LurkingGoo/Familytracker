'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, ShieldCheck, TrendingUp, KeyRound, Mail, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { supabase, signInWithPassword, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    if (isSignUp && password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || email.split('@')[0] } },
        })
        if (error) throw error
        if (data.session) {
          // Email confirmation OFF — session active immediately, redirect via onAuthStateChange
          toast.success('Account created! Welcome aboard.')
        } else {
          // Email confirmation ON — user must verify before signing in
          toast.success('Almost there! Check your inbox to verify your email, then sign in.')
        }
      } else {
        await signInWithPassword(email, password)
        toast.success('Welcome back!')
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  const isLoading = loading || submitting

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 py-8 text-white">
      {/* Ambient background glow */}
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
            Cooperative &amp; personal expense tracking
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-neutral-900 bg-neutral-950/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold text-white">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-neutral-400 text-xs">
              {isSignUp
                ? 'Set up your TripFinance account'
                : 'Sign in to manage your private and family budgets'}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-6 pt-2">
            <form onSubmit={handleAuth} className="space-y-4">
              {/* Name field — sign up only */}
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                    <UserIcon className="h-3.5 w-3.5" /> Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-neutral-900 border border-neutral-700 hover:border-neutral-500 rounded-xl py-3.5 px-4 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300"
                  />
                </motion.div>
              )}

              {/* Email */}
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
                  className="w-full bg-neutral-900 border border-neutral-700 hover:border-neutral-500 rounded-xl py-3.5 px-4 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300"
                />
              </div>

              {/* Password */}
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
                  className="w-full bg-neutral-900 border border-neutral-700 hover:border-neutral-500 rounded-xl py-3.5 px-4 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300"
                />
                {isSignUp && (
                  <p className="text-[10px] text-neutral-600 pl-1">Minimum 6 characters</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white hover:bg-neutral-200 text-black font-bold rounded-xl py-6 shadow-md transition-all duration-300 flex items-center justify-center gap-2 border border-transparent mt-2"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                ) : isSignUp ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-neutral-400 hover:text-white transition-colors duration-300 font-semibold"
                >
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : 'New here? Create a family account'}
                </button>
              </div>
            </form>

            {/* Feature highlights */}
            <div className="border-t border-neutral-900 pt-6 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">Private &amp; Secure</h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">
                    Row Level Security (RLS) ensures personal expenses stay strictly invisible to other workspace members.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
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
