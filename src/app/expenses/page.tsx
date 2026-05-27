'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, ArrowUpRight, Filter, ReceiptText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface UnifiedGroup {
  id: string
  title: string
}

interface UnifiedTransaction {
  id: string
  amount: number
  description: string
  category: string
  location: string | null
  state: string | null
  currency: string
  foreign_amount: number
  exchange_rate: number
  payer_id: string
  card_name: string | null
  group_id: string | null
  created_at: string
  payer_name: string
  group_title: string | null
}

const CATEGORIES = ['Food', 'Transport', 'Accommodation', 'Shopping', 'Entertainment', 'Other']

export default function ConsolidatedExpensesPage() {
  const { user, supabase } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<UnifiedGroup[]>([])
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([])

  // Filters
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const fetchUnifiedData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Fetch User's Workspaces
      const { data: memberRows, error: memberError } = await supabase
        .from('group_members')
        .select('role, groups(id, title)')
      if (memberError) throw memberError
      
      const activeGroups = (memberRows || [])
        .filter((item: any) => item.groups)
        .map((item: any) => ({
          id: item.groups.id,
          title: item.groups.title,
        }))
      setGroups(activeGroups)

      const groupIds = activeGroups.map(g => g.id)

      // 2. Fetch Personal and Workspace Transactions
      let txQuery = supabase
        .from('transactions')
        .select('*')

      if (groupIds.length > 0) {
        txQuery = txQuery.or(`group_id.in.(${groupIds.join(',')}),payer_id.eq.${user.id}`)
      } else {
        txQuery = txQuery.is('group_id', null).eq('payer_id', user.id)
      }

      const { data: txData, error: txError } = await txQuery.order('created_at', { ascending: false })
      if (txError) throw txError

      // Fetch Profiles to map names
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name')
      const profileMap = new Map<string, string>()
      if (profileData) {
        profileData.forEach((p) => profileMap.set(p.id, p.name || 'Unknown User'))
      }

      // Merge and map
      const mappedTx = (txData || []).map((t: any) => ({
        ...t,
        category: t.category || 'Other',
        payer_name: t.payer_id === user.id ? 'Me' : (profileMap.get(t.payer_id) || 'Group Member'),
        group_title: t.group_id ? (activeGroups.find(g => g.id === t.group_id)?.title || 'Shared Group') : null
      }))
      setTransactions(mappedTx)

    } catch (err) {
      console.error('Error fetching transactions:', err)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    fetchUnifiedData()
  }, [fetchUnifiedData])

  // Filtered List
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Group Filter
      if (groupFilter === 'personal' && tx.group_id !== null) return false
      if (groupFilter !== 'all' && groupFilter !== 'personal' && tx.group_id !== groupFilter) return false
      
      // Category Filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false

      return true
    })
  }, [transactions, groupFilter, categoryFilter])

  const totalFilteredSpent = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => acc + tx.amount, 0)
  }, [filteredTransactions])

  return (
    <div className="min-h-screen pb-safe bg-black text-white px-4 py-8">
      <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />

      <div className="mx-auto max-w-[600px] w-full z-10 relative">
        {/* Navigation Bar */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/personal')}
            className="border-neutral-900 bg-neutral-900/40 text-slate-400 hover:text-white rounded-xl h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-sm font-bold text-white leading-none">
              Consolidated Ledger
            </h2>
            <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
              All Expenses & Analytics
            </p>
          </div>
        </div>

        {/* Filters and Summary */}
        <Card className="border-neutral-900 bg-neutral-950/40 backdrop-blur-2xl shadow-lg mb-6 relative overflow-hidden p-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 space-y-1.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Workspace Filter</span>
              <Select value={groupFilter} onValueChange={(val) => setGroupFilter(val || 'all')}>
                <SelectTrigger className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 text-xs focus:outline-none h-10">
                  <SelectValue placeholder="All Workspaces" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950 text-white rounded-xl">
                  <SelectItem value="all">🌍 All Transactions</SelectItem>
                  <SelectItem value="personal">🔒 Personal Vault Only</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>👥 {g.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Category Filter</span>
              <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'all')}>
                <SelectTrigger className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 text-xs focus:outline-none h-10">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950 text-white rounded-xl">
                  <SelectItem value="all">📊 All Categories</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>🏷️ {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-900 flex justify-between items-end">
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Total Spent in View</span>
              <span className="text-2xl font-extrabold text-white block font-mono">
                S${totalFilteredSpent.toFixed(2)}
              </span>
            </div>
            <div className="text-[9px] text-slate-400">
              {filteredTransactions.length} transaction(s)
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 px-1">
            <ReceiptText className="h-4 w-4" /> Filtered Ledger
          </h3>

          <div className="space-y-2">
            {loading ? (
              <p className="text-xs text-slate-500 px-1 italic">Loading ledger...</p>
            ) : filteredTransactions.length === 0 ? (
              <Card className="border border-neutral-900 bg-neutral-950/20 backdrop-blur-md rounded-2xl p-6 text-center">
                <Filter className="h-8 w-8 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1">No matching transactions</h3>
                <p className="text-xs text-slate-400">Try adjusting your workspace or category filters.</p>
              </Card>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredTransactions.map(tx => {
                  const isPersonal = !tx.group_id
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="border-neutral-900 bg-neutral-950/40 hover:bg-neutral-950/60 backdrop-blur-2xl transition-all duration-300 group overflow-hidden p-4 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 max-w-[65%]">
                          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-neutral-900/60 border border-neutral-800 text-neutral-400 group-hover:text-white transition-colors duration-300">
                            <ArrowUpRight className="h-4.5 w-4.5" />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-100 group-hover:text-white truncate flex items-center gap-1.5">
                              {tx.description}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge className={`text-[8px] px-1.5 py-0 rounded-md border ${isPersonal ? 'border-neutral-800 bg-neutral-900/40 text-neutral-400' : 'border-emerald-950 bg-emerald-950/20 text-emerald-400'}`}>
                                {isPersonal ? 'Personal' : tx.group_title}
                              </Badge>
                              <Badge className="text-[8px] px-1.5 py-0 rounded-md border border-indigo-950 bg-indigo-950/20 text-indigo-400">
                                {tx.category}
                              </Badge>
                              {tx.location && (
                                <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                  • 📍 {tx.location}
                                </span>
                              )}
                              {tx.state && (
                                <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                  • 🇺🇸 {tx.state}
                                </span>
                              )}
                              <span className="text-[9px] text-slate-500 ml-1">
                                by {tx.payer_name} • {tx.card_name || 'Cash'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end justify-center">
                            {tx.currency === 'SGD' ? (
                              <span className="text-sm font-black text-white tracking-wide">
                                -S${tx.amount.toFixed(2)}
                              </span>
                            ) : (
                              <>
                                <span className="text-sm font-black text-white tracking-wide">
                                  -${tx.foreign_amount.toFixed(2)} {tx.currency}
                                </span>
                                <span className="text-[9px] font-bold text-slate-500">
                                  S${tx.amount.toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
