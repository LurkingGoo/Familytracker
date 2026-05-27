'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { useTransactions } from '@/hooks/use-transactions'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'
import { StateSpendingChart } from '@/components/analytics/state-spending-chart'
import { calculateDebts } from '@/lib/balance-solver'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, ArrowUpRight, TrendingUp, Sparkles, FolderLock, Landmark, CheckSquare, Trash2, Check, Copy, ReceiptText } from 'lucide-react'
import { toast } from 'sonner'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'
import { getStateName } from '@/lib/us-states'

interface GroupDetails {
  id: string
  title: string
  join_code: string
  preset_card_names: string[]
  created_by: string
}

interface MemberDetails {
  id: string
  name: string
}

interface Debt {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}

export default function GroupWorkspace() {
  const params = useParams()
  const groupId = params.id as string
  const { supabase, user } = useAuth()
  const router = useRouter()

  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [members, setMembers] = useState<MemberDetails[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [loadingDetails, setLoadingDetails] = useState(true)
  const [settling, setSettling] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('All')

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Invite join code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const { transactions, splits, loading: loadingTx, addTransaction, deleteTransaction, refetch } = useTransactions(groupId)

  // Fetch Group and Members
  const loadGroupDetails = useCallback(async () => {
    if (!user || !groupId) return
    setLoadingDetails(true)
    try {
      // 1. Fetch Group Title and Presets
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupError) throw groupError
      setGroup(groupData)

      // 2. Fetch Group Members profiles
      const { data: memberRows, error: memberError } = await supabase
        .from('group_members')
        .select('role, profiles(id, name)')
        .eq('group_id', groupId)

      if (memberError) throw memberError

      const mappedMembers: MemberDetails[] = (memberRows || [])
        .filter((row: any) => row.profiles)
        .map((row: any) => ({
          id: row.profiles.id,
          name: row.profiles.name || 'Group Member',
        }))

      setMembers(mappedMembers)
    } catch (err) {
      console.error('Error fetching group workspace details:', err)
      toast.error('Failed to load group workspace')
      router.push('/groups')
    } finally {
      setLoadingDetails(false)
    }
  }, [supabase, user, groupId, router])

  useEffect(() => {
    loadGroupDetails()
  }, [loadGroupDetails])

  // Calculate Debts (Greedy Settlement Matcher via standalone utility)
  useEffect(() => {
    if (members.length > 0) {
      const calculatedDebts = calculateDebts(members, transactions, splits)
      setDebts(calculatedDebts)
    } else {
      setDebts([])
    }
  }, [members, transactions, splits])

  // Handle transaction creation trigger
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
    splitInputs: Array<{ debtorId: string; amountOwed: number }>
  ) => {
    const isSuccess = await addTransaction(
      amount,
      description,
      category,
      location,
      state,
      currency,
      foreignAmount,
      exchangeRate,
      payerId,
      cardId,
      cardName,
      splitInputs
    )
    if (isSuccess) {
      await refetch()
    }
    return isSuccess
  }

  // Settle individual debt
  const handleSettleDebt = async (debt: Debt) => {
    setSettling(`${debt.fromId}-${debt.toId}`)
    try {
      // Find all unsettled splits belonging to parent transactions paid by `debt.toId` where debtor is `debt.fromId`
      const txIdsOfCreditor = transactions
        .filter((tx) => tx.payer_id === debt.toId)
        .map((tx) => tx.id)

      if (txIdsOfCreditor.length === 0) {
        throw new Error('No unsettled transactions found for this settlement')
      }

      // Mark all splits under those transaction IDs for that debtor as is_settled = true
      const { error } = await supabase
        .from('transaction_splits')
        .update({ is_settled: true })
        .eq('debtor_id', debt.fromId)
        .in('transaction_id', txIdsOfCreditor)

      if (error) throw error

      // Also inject a denormalized settlement transaction row so there is historical record
      const settlementId = crypto.randomUUID()
      await supabase.from('transactions').insert({
        id: settlementId,
        amount: debt.amount,
        description: `Settlement: ${debt.fromName} paid ${debt.toName}`,
        payer_id: debt.fromId,
        card_id: null,
        card_name: 'Cash / Settle',
        group_id: groupId,
        created_at: new Date().toISOString(),
      })

      // Also create a 100% split to the creditor that is automatically settled
      await supabase.from('transaction_splits').insert({
        id: crypto.randomUUID(),
        transaction_id: settlementId,
        debtor_id: debt.toId,
        amount_owed: debt.amount,
        is_settled: true,
        created_at: new Date().toISOString(),
      })

      toast.success(`Marked balance as settled!`)
      await refetch()
    } catch (err: any) {
      console.error('Error settling debt:', err)
      toast.error('Failed to settle balance')
    } finally {
      setSettling(null)
    }
  }

  // Calculate metrics
  const groupTotalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  
  const myTotalPaid = transactions
    .filter((tx) => tx.payer_id === user?.id)
    .reduce((sum, tx) => sum + tx.amount, 0)

  const myTotalOwed = splits
    .filter((s) => s.debtor_id === user?.id && !s.is_settled)
    .reduce((sum, s) => sum + s.amount_owed, 0)

  const myBalance = myTotalPaid - myTotalOwed

  return (
    <div className="min-h-screen pb-safe bg-black text-white px-4 py-8">
      {/* Subtle background ambient blur */}
      <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-white/[0.01] blur-[150px] pointer-events-none" />

      <div className="mx-auto max-w-[600px] w-full z-10 relative">
        {/* Navigation Bar */}
        <div className="flex items-center gap-3 mb-6">
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
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-none">
              {loadingDetails ? 'Loading details...' : group?.title}
            </h2>
            <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
              Shared Group Workspace
            </p>
          </div>
        </div>

        {/* Group Info header card */}
        {!loadingDetails && group && (
          <Card className="border-neutral-900 bg-neutral-950/40 backdrop-blur-2xl shadow-lg mb-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 h-0.5 w-full bg-neutral-800/40" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl font-black bg-linear-to-b from-white to-neutral-400 bg-clip-text text-transparent">
                  {group.title}
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-neutral-400" /> {members.length} members in workspace
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase font-bold">INVITE</span>
                <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-0.5">
                  <code className="font-mono text-[10px] font-bold text-slate-200">{group.join_code}</code>
                  <button
                    onClick={() => copyToClipboard(group.join_code)}
                    className="text-slate-400 hover:text-white p-0.5 hover:bg-neutral-850 rounded"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex justify-between items-center pb-4 pt-1 border-t border-slate-900/60">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">My Balance</span>
                <span className={`text-base font-extrabold block tracking-wide ${myBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {myBalance >= 0 ? '+' : ''}${myBalance.toFixed(2)}
                </span>
              </div>
              <div className="flex gap-4 text-right">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Paid</span>
                  <span className="text-xs font-semibold text-slate-300">${myTotalPaid.toFixed(2)}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Owe</span>
                  <span className="text-xs font-semibold text-slate-300">${myTotalOwed.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <StateSpendingChart transactions={transactions} />

        {/* Action bar and settlement lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="border-slate-900 bg-slate-950/30 rounded-2xl p-4 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-neutral-300" /> Balances Settlement
              </h3>
              <p className="text-[9px] text-slate-500">
                Instantly clear dynamic workspace shares between creditors and debtors.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-900 max-h-[160px] overflow-y-auto pr-1">
              {debts.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-[10px] text-slate-500 italic gap-1">
                  <CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> All group balances are fully settled!
                </div>
              ) : (
                debts.map((d) => (
                  <div key={`${d.fromId}-${d.toId}`} className="flex items-center justify-between text-xs py-1 border-b border-slate-900/50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-200">
                        <strong className="text-slate-100">{d.fromName}</strong> owes <strong className="text-slate-100">{d.toName}</strong>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">${d.amount.toFixed(2)}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSettleDebt(d)}
                      disabled={settling !== null}
                      className="bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-[10px] h-7 px-3 font-semibold"
                    >
                      {settling === `${d.fromId}-${d.toId}` ? 'Settling...' : 'Settle'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
              Group Ledgers ({categoryFilter === 'All' ? transactions.length : transactions.filter(t => t.category === categoryFilter).length})
            </h3>
            {!loadingDetails && members.length > 0 && (
              <AddTransactionDialog
                groupId={groupId}
                members={members}
                onSuccess={handleAddTx}
              />
            )}
          </div>

          {/* Category Filter Chips */}
          {!loadingTx && transactions.length > 0 && (
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

          {loadingTx ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <p className="text-xs text-slate-500 font-medium">Fetching group ledgers...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {transactions.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center border border-slate-900 border-dashed rounded-2xl py-16 px-4 text-center bg-slate-950/20"
                  >
                    <Users className="h-8 w-8 text-slate-600 mb-2" />
                    <h4 className="text-xs font-semibold text-slate-400">Workspace is Empty</h4>
                    <p className="text-[10px] text-slate-500 max-w-[220px] mt-1">
                      No shared expenses recorded yet. Click "Add Expense" to spawn group transactions.
                    </p>
                  </motion.div>
                ) : (
                  (() => {
                    const filtered = categoryFilter === 'All'
                      ? transactions
                      : transactions.filter(tx => tx.category === categoryFilter || (categoryFilter === 'Other' && !tx.category))
                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center border border-neutral-900 border-dashed rounded-2xl py-12 px-4 text-center bg-neutral-950/20">
                          <p className="text-[10px] text-slate-500">No {categoryFilter} expenses in this workspace.</p>
                        </div>
                      )
                    }
                    return filtered.map((tx) => {
                    const isSettlement = tx.description.startsWith('Settlement:')
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
                          {!isSettlement && (
                            <EditTransactionDialog
                              transaction={tx}
                              groupId={groupId}
                              onSuccess={refetch}
                            />
                          )}
                          <div className={`flex items-center gap-3 max-w-[60%] relative z-10 ${!isSettlement ? 'pointer-events-none' : ''}`}>
                            <div className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-colors duration-300 ${isSettlement ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 group-hover:text-white'}`}>
                              <ArrowUpRight className="h-4.5 w-4.5" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <h4 className={`text-sm font-semibold truncate ${isSettlement ? 'text-emerald-300' : 'text-slate-100 group-hover:text-white'}`}>
                                {tx.description}
                              </h4>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className="border-slate-900 bg-slate-900/60 text-slate-400 rounded-md text-[8px] px-1.5 py-0">
                                  Paid by: {tx.payer_id === user?.id ? 'Me' : (tx.payer_name || 'Group Member')}
                                </Badge>
                                {tx.category && (
                                  <Badge className="border-indigo-950 bg-indigo-950/20 text-indigo-400 rounded-md text-[8px] px-1.5 py-0">
                                    {tx.category}
                                  </Badge>
                                )}
                                <Badge className="border-slate-900 bg-slate-900/60 text-slate-400 rounded-md text-[8px] px-1.5 py-0">
                                  {tx.card_name || 'Cash'}
                                </Badge>
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
                                <span className="text-[9px] text-slate-500">
                                  {new Date(tx.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 relative z-10">
                            <div className="flex flex-col items-end justify-center">
                              {tx.currency === 'SGD' || isSettlement ? (
                                <span className={`text-sm font-black tracking-wide ${isSettlement ? 'text-emerald-400' : 'text-white'}`}>
                                  ${tx.amount.toFixed(2)}
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
                            {tx.payer_id === user?.id && !isSettlement && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); deleteTransaction(tx.id) }}
                                className="text-slate-600 hover:text-rose-400 hover:bg-rose-950/10 rounded-lg h-8 w-8 transition-all duration-200 shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    )
                    })
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
