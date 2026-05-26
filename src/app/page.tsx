'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles, ShieldCheck, CreditCard, Landmark, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 py-12 text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] left-[-20%] h-[70%] w-[70%] rounded-full bg-white/[0.01] blur-[150px] pointer-events-none" />

      <div className="mx-auto max-w-[500px] w-full z-10 text-center flex flex-col items-center">
        {/* Apple Style Monochromatic Logo Outline */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex h-20 w-20 items-center justify-center rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl"
        >
          <Sparkles className="h-10 w-10 text-neutral-200 animate-pulse" />
        </motion.div>

        {/* Metallic Silver Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-6 text-4xl font-black tracking-tight bg-linear-to-b from-white to-neutral-400 bg-clip-text text-transparent"
        >
          TripFinance
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-3 text-sm text-neutral-400 max-w-[340px] leading-relaxed"
        >
          Mobile-first, offline-ready budget trackers built to split family accounts while keeping personal finances strictly secure.
        </motion.p>

        {/* High-Contrast Solid White Apple Style Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-8 w-full"
        >
          <Button
            onClick={() => router.push('/login')}
            className="w-full bg-white hover:bg-neutral-200 text-black font-bold rounded-2xl py-7 shadow-2xl flex items-center justify-center gap-2 group transition-all duration-300 text-base border border-transparent"
          >
            Get Started
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        {/* Monochrome Feature Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="grid grid-cols-3 gap-3 w-full mt-12 border-t border-neutral-900 pt-8"
        >
          <div className="flex flex-col items-center p-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-neutral-300 mb-2.5">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">RLS Security</h4>
            <p className="text-[9px] text-neutral-500 mt-1">Total data privacy protection</p>
          </div>

          <div className="flex flex-col items-center p-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-neutral-300 mb-2.5">
              <Landmark className="h-5 w-5" />
            </div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Tab Splitting</h4>
            <p className="text-[9px] text-neutral-500 mt-1">Simplify shared calculations</p>
          </div>

          <div className="flex flex-col items-center p-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-neutral-300 mb-2.5">
              <CreditCard className="h-5 w-5" />
            </div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Merged Cards</h4>
            <p className="text-[9px] text-neutral-500 mt-1">Presets mixed with private wallets</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
