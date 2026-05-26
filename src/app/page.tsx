'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles, ShieldCheck, CreditCard, Landmark, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-radial from-slate-900 via-slate-950 to-black px-4 py-12 text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] left-[-20%] h-[70%] w-[70%] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] h-[70%] w-[70%] rounded-full bg-cyan-600/10 blur-[130px] pointer-events-none" />

      <div className="mx-auto max-w-[500px] w-full z-10 text-center flex flex-col items-center">
        {/* Glowing Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-tr from-violet-600 to-cyan-500 shadow-xl shadow-violet-500/20"
        >
          <Sparkles className="h-10 w-10 text-white animate-pulse" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-6 text-4xl font-black tracking-tight bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent"
        >
          TripFinance
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-3 text-sm text-slate-400 max-w-[340px] leading-relaxed"
        >
          Mobile-first, offline-ready budget trackers built to split family accounts while keeping personal finances strictly secure.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-8 w-full"
        >
          <Button
            onClick={() => router.push('/login')}
            className="w-full bg-linear-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white font-bold rounded-2xl py-7 shadow-xl shadow-violet-500/20 flex items-center justify-center gap-2 group transition-all duration-300 text-base"
          >
            Get Started
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="grid grid-cols-3 gap-3 w-full mt-12 border-t border-slate-900 pt-8"
        >
          <div className="flex flex-col items-center p-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 text-violet-400 mb-2.5">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">RLS Security</h4>
            <p className="text-[9px] text-slate-500 mt-1">Total data privacy protection</p>
          </div>

          <div className="flex flex-col items-center p-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-400 mb-2.5">
              <Landmark className="h-5 w-5" />
            </div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Tab Splitting</h4>
            <p className="text-[9px] text-slate-500 mt-1">Simplify shared calculations</p>
          </div>

          <div className="flex flex-col items-center p-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 mb-2.5">
              <CreditCard className="h-5 w-5" />
            </div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Merged Cards</h4>
            <p className="text-[9px] text-slate-500 mt-1">Presets mixed with private wallets</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
