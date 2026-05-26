'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, TrendingUp, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const { signInWithGoogle, loading } = useAuth()

  const handleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-radial from-slate-900 via-slate-950 to-black px-4 py-8 text-white">
      {/* Background ambient light */}
      <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] h-[60%] w-[60%] rounded-full bg-cyan-600/10 blur-[120px]" />

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
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-tr from-violet-600 to-cyan-500 shadow-lg shadow-violet-500/30"
          >
            <Sparkles className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            TripFinance
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Cooperative & personal expense tracking
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold text-white">Welcome Back</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Log in to manage your private and family workspace budgets
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={handleLogin}
                disabled={loading}
                className="w-full border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:text-white transition-all duration-300 py-6 text-sm font-medium flex items-center justify-center gap-3 text-slate-200 rounded-xl"
              >
                {/* Google SVG Icon */}
                <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>

            {/* Premium Highlights */}
            <div className="border-t border-slate-800/80 pt-6 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/10 text-violet-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Private & Secure</h4>
                  <p className="text-[10px] text-slate-400">
                    Row Level Security (RLS) ensures personal expenses stay strictly invisible to others.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600/10 text-cyan-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Dynamic Debt Splitting</h4>
                  <p className="text-[10px] text-slate-400">
                    Seamlessly distribute family group tabs with instant settlement metrics.
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
