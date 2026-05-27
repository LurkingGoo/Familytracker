'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const { supabase } = useAuth()
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Wait for Supabase to parse the URL hash and establish the session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Invalid or expired reset link. Please try again.')
        router.push('/login')
      }
    })
  }, [supabase, router])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })
      if (error) throw error
      toast.success('Password updated successfully!')
      router.push('/login')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 py-8 text-white">
      <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-white/[0.01] blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-[400px] z-10"
      >
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
        </div>

        <Card className="border-neutral-900 bg-neutral-950/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold text-white">
              Set New Password
            </CardTitle>
            <CardDescription className="text-neutral-400 text-xs">
              Enter a secure new password for your account
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-6 pt-2">
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                  <KeyRound className="h-3.5 w-3.5" /> New Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-900 border border-neutral-700 hover:border-neutral-500 rounded-xl py-3.5 px-4 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300"
                />
                <p className="text-[10px] text-neutral-600 pl-1">Minimum 6 characters</p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-white hover:bg-neutral-200 text-black font-bold rounded-xl py-6 shadow-md transition-all duration-300 flex items-center justify-center gap-2 border border-transparent mt-2"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
