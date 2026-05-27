'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'
import { StateSpendingChart } from '@/components/analytics/state-spending-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wallet, LogOut, ArrowUpRight, TrendingUp, Sparkles, AlertCircle, Plus, Users, CreditCard, PieChart as PieChartIcon, ReceiptText, Trash2, Copy, Check, Info, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'
import { getStateName } from '@/lib/us-states'

interface UnifiedGroup {
  role: string
  id: string
  title: string
  join_code: string
  preset_card_names: string[]
  created_at: string
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
  card_id: string | null
  card_name: string | null
  group_id: string | null
  created_at: string
  payer_name: string
  group_title: string | null
}

export default function PersonalDashboard() {
  const { profile, signOut, supabase, user } = useAuth()
  const router = useRouter()

  const [groups, setGroups] = useState<UnifiedGroup[]>([])
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [personalSpent, setPersonalSpent] = useState(0)
  const [netGroupBalance, setNetGroupBalance] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('All')

  const fetchUnifiedData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Fetch User's Workspaces
      const { data: memberRows, error: memberError } = await supabase
        .from('group_members')
        .select('role, groups(*)')
      if (memberError) throw memberError
      
      const seenGroupIds = new Set<string>()
      const activeGroups = (memberRows || [])
        .filter((item: any) => {
          if (!item.groups || seenGroupIds.has(item.groups.id)) return false
          seenGroupIds.add(item.groups.id)
          return true
        })
        .map((item: any) => ({
          role: item.role,
          id: item.groups.id,
          title: item.groups.title,
          join_code: item.groups.join_code,
          preset_card_names: item.groups.preset_card_names,
          created_at: item.groups.created_at
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

      // 3. Fetch transaction splits to calculate dues
      const txIds = (txData || []).map(t => t.id)
      let splitsData: any[] = []
      if (txIds.length > 0) {
        const { data, error } = await supabase
          .from('transaction_splits')
          .select('*')
          .in('transaction_id', txIds)
        if (!error && data) {
          splitsData = data
        }
      }

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
        payer_name: t.payer_id === user.id ? 'Me' : (profileMap.get(t.payer_id) || 'Group Member'),
        group_title: t.group_id ? (activeGroups.find(g => g.id === t.group_id)?.title || 'Shared Group') : null
      }))
      setTransactions(mappedTx)

      // 4. Calculate Net Group Balance
      const myOwedSplits = splitsData.filter(s => s.debtor_id === user.id && s.transaction_id && !s.is_settled)
      const othersOwedToMeSplits = splitsData.filter(s => {
        const tx = txData?.find(t => t.id === s.transaction_id)
        return tx && tx.payer_id === user.id && s.debtor_id !== user.id && !s.is_settled
      })

      const totalOwedByMe = myOwedSplits.reduce((sum, s) => sum + s.amount_owed, 0)
      const totalOwedToMe = othersOwedToMeSplits.reduce((sum, s) => sum + s.amount_owed, 0)

      setNetGroupBalance(totalOwedToMe - totalOwedByMe)

      // 5. Personal vault spending (solo)
      const personalSpentSum = mappedTx
        .filter(t => !t.group_id && t.payer_id === user.id)
        .reduce((sum, t) => sum + t.amount, 0)
      setPersonalSpent(personalSpentSum)

    } catch (err) {
      console.error('Error fetching unified dashboard data:', err)
      toast.error('Failed to update your dashboard')
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    fetchUnifiedData()
  }, [fetchUnifiedData])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Invite join code copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleAddTx = async (
    amount: number,
    description: string,
    category: string,
    location: string | null,
    state: string | null,
    currency: string,
    foreignAmount: number,
    exchangeRate: number,
    payerId: string,
    cardId: string | null,
    cardName: string | null,
    splits: Array<{ debtorId: string; amountOwed: number }>
  ) => {
    try {
      const transactionId = crypto.randomUUID()
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          id: transactionId,
          amount,
          description: description.trim(),
          category,
          location,
          state,
          currency,
          foreign_amount: foreignAmount,
          exchange_rate: exchangeRate,
          payer_id: payerId,
          card_id: cardId,
          card_name: cardName,
          group_id: null,
          created_at: new Date().toISOString()
        })
      if (txError) throw txError

      const { error: splitsError } = await supabase
        .from('transaction_splits')
        .insert({
          id: crypto.randomUUID(),
          transaction_id: transactionId,
          debtor_id: payerId,
          amount_owed: amount,
          is_settled: true,
          created_at: new Date().toISOString()
        })
      if (splitsError) throw splitsError

      toast.success('Expense recorded in Personal Vault!')
      await fetchUnifiedData()
      return true
    } catch (err: any) {
      toast.error('Failed to add transaction')
      return false
    }
  }

  const handleDeleteTx = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
      if (error) throw error
      toast.success('Expense deleted successfully')
      await fetchUnifiedData()
    } catch (err: any) {
      toast.error('Failed to remove transaction')
    }
  }

  return (
    <div className="min-h-screen pb-safe bg-black text-white px-4 py-8">
      <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-white/[0.01] blur-[150px] pointer-events-none" />

      <div className="mx-auto max-w-[600px] w-full z-10 relative">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between mb-8 border-b border-neutral-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 shadow-md">
              <Wallet className="h-5 w-5 text-neutral-350" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">TripFinance</h1>
              <p className="text-[10px] text-slate-500 mt-1">Hello, {profile?.name || 'Explorer'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/expenses')}
              className="border-neutral-900 bg-neutral-900/40 text-slate-400 hover:text-white rounded-xl h-9 w-9"
              title="All Expenses"
            >
              <ReceiptText className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/groups')}
              className="border-neutral-900 bg-neutral-900/40 text-slate-400 hover:text-white rounded-xl h-9 w-9"
              title="Workspaces"
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/cards')}
              className="border-indigo-900 bg-indigo-950/40 text-indigo-400 hover:bg-indigo-900/60 hover:text-white rounded-xl h-9 w-9 shadow-[0_0_15px_rgba(79,70,229,0.2)] transition-all duration-300"
              title="Manage Cards"
            >
              <CreditCard className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-slate-500 hover:text-rose-400 rounded-xl h-9 w-9"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Home Greetings */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-black tracking-tight bg-linear-to-b from-white to-neutral-400 bg-clip-text text-transparent">
              Home Hub
            </h2>
            <p className="text-[10px] text-neutral-450 font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-neutral-450" /> Unified Dashboard
            </p>
          </div>

          {profile && (
            <AddTransactionDialog
              groupId={null}
              members={[{ id: profile.id, name: profile.name || 'Me' }]}
              onSuccess={handleAddTx}
            />
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="border-neutral-900 bg-neutral-950/40 backdrop-blur-2xl rounded-2xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-0.5 w-full bg-neutral-800/40 group-hover:bg-neutral-600 transition-colors duration-300" />
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Personal Vault Spent</span>
              <span className="text-2xl font-extrabold text-white block font-mono">
                ${personalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[9px] text-slate-500 mt-2">Solo ledger spendings</p>
          </Card>

          <Card className="border-neutral-900 bg-neutral-950/40 backdrop-blur-2xl rounded-2xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-0.5 w-full bg-neutral-800/40 group-hover:bg-neutral-600 transition-colors duration-300" />
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Net Group Balance</span>
              <span className={`text-2xl font-extrabold block font-mono ${netGroupBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netGroupBalance >= 0 ? '+' : ''}${netGroupBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[9px] text-slate-500 mt-2">Net settlement weight</p>
          </Card>
        </div>

        {/* State Spending Visual Analytics */}
        <StateSpendingChart transactions={transactions} />

        {/* Onboarding / CTAs when totally empty */}
        {!loading && groups.length === 0 && transactions.length === 0 && (
          <Card className="border border-neutral-900 bg-neutral-950/20 backdrop-blur-md rounded-2xl p-6 mb-8 text-center">
            <Sparkles className="h-8 w-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">Welcome to TripFinance!</h3>
            <p className="text-[11px] text-slate-500 max-w-[340px] mx-auto mt-1 leading-relaxed">
              Your home space is ready. Connect a card to your secure wallet or create a workspace to invite your family members and track finances!
            </p>
            <div className="flex justify-center gap-3 mt-5">
              <Button
                onClick={() => router.push('/groups')}
                className="bg-white hover:bg-neutral-200 text-black text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Create Workspace
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/cards')}
                className="border-neutral-800 hover:bg-neutral-900 text-slate-300 text-xs px-4 py-2 rounded-lg"
              >
                Add Card
              </Button>
            </div>
          </Card>
        )}

        {/* Active Workspaces List (If exists) */}
        {!loading && groups.length > 0 && (
          <div className="mb-8 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
              Active Workspaces ({groups.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groups.map((g) => (
                <Card
                  key={g.id}
                  onClick={() => router.push(`/groups/${g.id}`)}
                  className="border-neutral-900 bg-neutral-950/30 hover:bg-neutral-950/50 backdrop-blur-xl rounded-xl p-4 cursor-pointer transition-all duration-300 relative group overflow-hidden"
                >
                  <div className="absolute top-0 left-0 h-0.5 w-full bg-neutral-800/40 group-hover:bg-white transition-colors duration-300" />
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h4 className="text-xs font-black text-white truncate max-w-[70%] group-hover:text-slate-200 transition-colors">
                      {g.title}
                    </h4>
                    <span className="text-[8px] border border-neutral-800 bg-neutral-900 text-slate-400 rounded px-1 font-semibold uppercase">
                      {g.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">Join Code:</span>
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-slate-300 font-bold">{g.join_code}</code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(g.join_code, g.id)
                        }}
                        className="text-slate-500 hover:text-white p-0.5"
                      >
                        {copiedId === g.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Consolidated Activity Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
              Timeline ({categoryFilter === 'All' ? transactions.length : transactions.filter(t => (t as any).category === categoryFilter).length})
            </h3>
          </div>

          {/* Category Filter Chips */}
          {!loading && transactions.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pb-1">
              {['All', 'Food', 'Transport', 'Accommodation', 'Shopping', 'Entertainment', 'Other'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all duration-200 ${
                    categoryFilter === cat
                      ? 'bg-white text-black border-white'
                      : 'bg-neutral-950/40 text-slate-400 border-neutral-800 hover:border-neutral-600 hover:text-slate-200'
                  }`}
                >
                  {cat === 'All' ? '✦ All' :
                   cat === 'Food' ? '🍔' :
                   cat === 'Transport' ? '🚕' :
                   cat === 'Accommodation' ? '🏨' :
                   cat === 'Shopping' ? '🛍️' :
                   cat === 'Entertainment' ? '🎢' : '🏷️'} {cat === 'All' ? '' : cat}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <p className="text-xs text-slate-500 font-medium">Fetching active streams...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {transactions.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center border border-neutral-900 border-dashed rounded-2xl py-16 px-4 text-center bg-neutral-950/20"
                  >
                    <Info className="h-8 w-8 text-slate-650 mb-2.5 text-neutral-500" />
                    <h4 className="text-xs font-semibold text-slate-400 font-medium">Stream is Silent</h4>
                    <p className="text-[10px] text-slate-500 max-w-[220px] mt-1">
                      Add a personal expense or record shared payments in a group to populate this timeline.
                    </p>
                  </motion.div>
                ) : (
                  (() => {
                    // Apply category filter
                    const filtered = categoryFilter === 'All'
                      ? transactions
                      : transactions.filter(tx => (tx as any).category === categoryFilter)

                    // Group transactions by date
                    const grouped = filtered.reduce((acc, tx) => {
                      const dateKey = new Date(tx.created_at).toLocaleDateString('en-SG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                      if (!acc[dateKey]) acc[dateKey] = []
                      acc[dateKey].push(tx)
                      return acc
                    }, {} as Record<string, UnifiedTransaction[]>)

                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center border border-neutral-900 border-dashed rounded-2xl py-12 px-4 text-center bg-neutral-950/20">
                          <p className="text-[10px] text-slate-500">No {categoryFilter} expenses found.</p>
                        </div>
                      )
                    }


                    return Object.entries(grouped).map(([dateLabel, dayTxs]) => (
                      <div key={dateLabel} className="space-y-2">
                        <div className="flex items-center gap-2 px-1 pt-2">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{dateLabel}</span>
                          <div className="flex-1 h-px bg-neutral-900" />
                        </div>
                        {dayTxs.map((tx) => {
                          const isPersonal = !tx.group_id
                          const stateName = getStateName(tx.state)
                          return (
                            <motion.div
                              key={tx.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Card className="border-neutral-900 bg-neutral-950/40 hover:bg-neutral-950/60 backdrop-blur-2xl transition-all duration-300 group overflow-hidden p-4 rounded-xl flex items-center justify-between gap-4 relative cursor-pointer">
                                {/* Edit overlay — clicking the card opens the edit dialog */}
                                <EditTransactionDialog
                                  transaction={tx as any}
                                  groupId={tx.group_id}
                                  onSuccess={fetchUnifiedData}
                                />
                                <div className="flex items-center gap-3 max-w-[60%] relative z-10 pointer-events-none">
                                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-neutral-900/60 border border-neutral-800 text-neutral-400 group-hover:text-white transition-colors duration-300">
                                    <ArrowUpRight className="h-4.5 w-4.5" />
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <h4 className="text-sm font-semibold text-slate-100 group-hover:text-white truncate">
                                      {tx.description}
                                    </h4>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge className={`text-[8px] px-1.5 py-0 rounded-md border ${isPersonal ? 'border-neutral-800 bg-neutral-900/40 text-neutral-400' : 'border-emerald-950 bg-emerald-950/20 text-emerald-400'}`}>
                                        {isPersonal ? 'Personal' : tx.group_title}
                                      </Badge>
                                      {(tx as any).category && (
                                        <Badge className="text-[8px] px-1.5 py-0 rounded-md border border-indigo-950 bg-indigo-950/20 text-indigo-400">
                                          {(tx as any).category}
                                        </Badge>
                                      )}
                                      {tx.location && (
                                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                          • 📍 {tx.location}
                                        </span>
                                      )}
                                      {stateName && (
                                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                          • 🇺🇸 {stateName}
                                        </span>
                                      )}
                                      <span className="text-[9px] text-slate-500 ml-1">
                                        by {tx.payer_name} • {tx.card_name || 'Cash'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 relative z-10">
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
                                  {tx.payer_id === user?.id && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteTx(tx.id) }}
                                      className="text-slate-600 hover:text-rose-400 hover:bg-rose-950/10 rounded-lg h-8 w-8 transition-all duration-200 shrink-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </Card>
                            </motion.div>
                          )
                        })}
                      </div>
                    ))
                  })()
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
