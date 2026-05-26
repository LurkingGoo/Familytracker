'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditCard, Trash2, ShieldAlert, Sparkles, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface CardItem {
  id: string
  card_name: string
  created_at: string
}

export default function CardsPage() {
  const [cards, setCards] = useState<CardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newCardName, setNewCardName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { supabase, user } = useAuth()

  const loadCards = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('card_name')

      if (error) throw error
      setCards(data || [])
    } catch (err) {
      console.error('Error fetching cards:', err)
      toast.error('Failed to load private cards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCards()
  }, [user])

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!newCardName.trim()) {
      toast.error('Card name is required')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('cards')
        .insert({
          card_name: newCardName.trim(),
          user_id: user.id,
        })

      if (error) throw error

      toast.success(`Card "${newCardName}" added to wallet!`)
      setNewCardName('')
      await loadCards()
    } catch (err) {
      console.error('Error adding card:', err)
      toast.error('Failed to add private card')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCard = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success(`Card "${name}" removed from wallet.`)
      await loadCards()
    } catch (err) {
      console.error('Error deleting card:', err)
      toast.error('Failed to remove card')
    }
  }

  return (
    <div className="min-h-screen pb-safe bg-radial from-slate-900 via-slate-950 to-black text-white px-4 py-8">
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-cyan-600/5 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-violet-600/5 blur-[100px]" />

      <div className="mx-auto max-w-[600px] w-full z-10 relative">
        {/* Header Block */}
        <div className="flex flex-col gap-1 mb-8">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
            <Sparkles className="h-3 w-3" /> Secure Vault
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            My Card Wallet
          </h1>
          <p className="text-slate-400 text-xs">
            Manage your personal cards. These remain strictly private to you via database-level RLS.
          </p>
        </div>

        {/* Add Card Card */}
        <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-xl shadow-lg mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white">Add Private Card</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCard} className="flex gap-2">
              <div className="grid gap-1.5 w-full">
                <Input
                  placeholder="e.g. Target RedCard, Chase Freedom"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  className="border-slate-800 bg-slate-900/60 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-violet-500 py-5"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-linear-to-r from-cyan-500 to-violet-600 hover:from-cyan-600 hover:to-violet-700 text-white rounded-xl shadow-lg px-5 flex gap-1 font-medium h-[42px]"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </form>
            <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
              <ShieldAlert className="h-3.5 w-3.5 text-cyan-500" />
              <span>Row-Level Security guarantees no other group member can ever read these cards.</span>
            </div>
          </CardContent>
        </Card>

        {/* Cards Render */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-xs text-slate-500 font-medium">Fetching card secure keys...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 pl-1">
              Registered Cards ({cards.length})
            </h3>
            <AnimatePresence mode="popLayout">
              {cards.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center border border-slate-900 border-dashed rounded-2xl py-12 px-4 text-center bg-slate-950/20"
                >
                  <CreditCard className="h-10 w-10 text-slate-700 mb-2" />
                  <h4 className="text-xs font-semibold text-slate-400">Wallet is Empty</h4>
                  <p className="text-[10px] text-slate-500 max-w-[240px] mt-1">
                    Add custom private cards here so they appear alongside group preset cards in transaction selects.
                  </p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cards.map((item, idx) => {
                    // Generate different premium gradients for variation
                    const gradients = [
                      'from-slate-900 via-zinc-900 to-neutral-900 border-zinc-800',
                      'from-indigo-950/50 via-slate-950/70 to-neutral-950 border-indigo-950',
                      'from-slate-950 via-slate-900 to-zinc-950 border-slate-800/80',
                    ]
                    const gradient = gradients[idx % gradients.length]

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="relative"
                      >
                        {/* Interactive glow backing card */}
                        <div className="absolute inset-0 rounded-2xl bg-cyan-500/5 blur-md opacity-0 hover:opacity-100 transition-all duration-300" />
                        
                        {/* Premium Card Mockup */}
                        <div className={`p-5 rounded-2xl border bg-linear-to-br ${gradient} shadow-md flex flex-col justify-between h-[150px] relative overflow-hidden group`}>
                          {/* Inner glowing particle */}
                          <div className="absolute top-[-20%] right-[-20%] h-[80px] w-[80px] rounded-full bg-cyan-500/10 blur-xl group-hover:bg-cyan-500/20 transition-all duration-500" />
                          
                          {/* Card Top */}
                          <div className="flex items-start justify-between z-10">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-500 font-mono tracking-widest">PRIVATE CARD</span>
                              <span className="text-base font-bold text-white tracking-wide truncate max-w-[180px]">
                                {item.card_name}
                              </span>
                            </div>
                            <CreditCard className="h-6 w-6 text-slate-600 group-hover:text-cyan-400 transition-colors duration-300" />
                          </div>

                          {/* Card Bottom */}
                          <div className="flex items-end justify-between z-10 pt-4">
                            <div className="space-y-0.5">
                              <div className="h-4 w-6 bg-slate-800 rounded-md opacity-70 mb-1.5" /> {/* Simulating Card Chip */}
                              <span className="text-[9px] text-slate-500 font-mono">
                                ADDED: {new Date(item.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCard(item.id, item.card_name)}
                              className="text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg h-8 w-8 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
