'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { useTransactions } from '@/hooks/use-transactions'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, ArrowUpRight, TrendingUp, Sparkles, FolderLock, Landmark, CheckSquare, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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

  // Calculate Debts (Greedy Settlement Matcher)
  const calculateBalances = useCallback(() => {
    if (members.length === 0) return

    // Initialize balance maps
    const paidMap: Record<string, number> = {}
    const owedMap: Record<string, number> = {}

    members.forEach((m) => {
      paidMap[m.id] = 0
      owedMap[m.id] = 0
    })

    // Accumulate total paid by each member
    transactions.forEach((tx) => {
      if (paidMap[tx.payer_id] !== undefined) {
        paidMap[tx.payer_id] += tx.amount
      }
    })

    // Accumulate total owed by each member (only unsettled ones!)
    splits.forEach((s) => {
      if (owedMap[s.debtor_id] !== undefined && !s.is_settled) {
        owedMap[s.debtor_id] += s.amount_owed
      }
    })

    // Net balance = Paid - Owed
    const netBalances = members.map((m) => ({
      id: m.id,
      name: m.name,
      net: paidMap[m.id] - owedMap[m.id],
    }))

    // Separate creditors and debtors
    const creditors = netBalances.filter((b) => b.net > 0.01).sort((a, b) => b.net - a.net)
    const debtors = netBalances.filter((b) => b.net < -0.01).sort((a, b) => a.net - b.net) // most negative first

    const calculatedDebts: Debt[] = []

    let cIdx = 0
    let dIdx = 0

    // Greedily match debtors to creditors
    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx]
      const debtor = debtors[dIdx]

      const owedAmount = Math.abs(debtor.net)
      const creditAmount = creditor.net

      const transfer = Math.min(owedAmount, creditAmount)

      calculatedDebts.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: parseFloat(transfer.toFixed(2)),
      })

      // Update balances
      debtor.net += transfer
      creditor.net -= transfer

      if (Math.abs(debtor.net) < 0.01) dIdx++
      if (Math.abs(creditor.net) < 0.01) cIdx++
    }

    setDebts(calculatedDebts)
  }, [members, transactions, splits])

  useEffect(() => {
    calculateBalances()
  }, [transactions, splits, calculateBalances])

  // Handle transaction creation trigger
  const handleAddTx = async (
    amount: number,
    description: string,
    payerId: string,
    cardId: string | null,
    cardName: string | null,
    splitInputs: Array<{ debtorId: string; amountOwed: number }>
  ) => {
    const isSuccess = await addTransaction(amount, description, payerId, cardId, cardName, splitInputs)
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
    <div className="min-h-screen pb-safe bg-radial from-slate-900 via-slate-950 to-black text-white px-4 py-8">
      {/* Background glow backdrops */}
      <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-cyan-600/5 blur-[100px] pointer-events-none" />

      <div className="mx-auto max-w-[600px] w-full z-10 relative">
        {/* Navigation Bar */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/groups')}
            className="border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white rounded-xl h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
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
          <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-xl shadow-lg mb-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 h-0.5 w-full bg-linear-to-r from-violet-600 to-cyan-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl font-extrabold bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  {group.title}
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-cyan-400" /> {members.length} members in workspace
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase font-bold">INVITE</span>
                <Badge className="border-slate-800 bg-slate-900/80 text-slate-300 font-mono font-bold tracking-widest text-[10px] rounded-lg px-2 py-0.5 flex gap-1">
                  <FolderLock className="h-3 w-3 text-cyan-500" /> {group.join_code}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-[10px] text-slate-400 flex flex-col gap-1 border-t border-slate-900 pt-3">
                <span className="font-semibold text-slate-300">Preset Shared Cards:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {group.preset_card_names?.map((name) => (
                    <Badge key={name} className="border-slate-900 bg-slate-900/60 text-slate-400 text-[9px] rounded-md px-1.5 py-0.5 font-normal">
                      💳 {name}
                    </Badge>
                  )) || <span className="text-slate-500 italic">No presets configured</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Group Metrics stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md rounded-xl p-3 shadow-md">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Group Spent</span>
            <span className="text-base font-extrabold text-white tracking-wide">
              ${groupTotalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </Card>

          <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md rounded-xl p-3 shadow-md">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1">My Total Share</span>
            <span className="text-base font-extrabold text-white">
              ${myTotalOwed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </Card>

          <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md rounded-xl p-3 shadow-md">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1">My Balance</span>
            <span className={`text-base font-extrabold tracking-wide ${myBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {myBalance >= 0 ? '+' : ''}${myBalance.toFixed(2)}
            </span>
          </Card>
        </div>

        {/* Action bar and settlement lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Debt Settlement card */}
          <Card className="border-slate-900 bg-slate-950/30 rounded-2xl p-4 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-violet-400" /> Balances Settlement
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
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] h-7 px-3 font-semibold"
                    >
                      {settling === `${d.fromId}-${d.toId}` ? 'Settling...' : 'Settle'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Expenses List & Trigger dialog */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
              Group Ledgers ({transactions.length})
            </h3>
            {!loadingDetails && members.length > 0 && (
              <AddTransactionDialog
                groupId={groupId}
                members={members}
                onSuccess={handleAddTx}
              />
            )}
          </div>

          {loadingTx ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
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
                  transactions.map((tx) => {
                    const isSettlement = tx.description.startsWith('Settlement:')
                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="border-slate-800/80 bg-slate-950/40 hover:bg-slate-950/60 backdrop-blur-xl transition-all duration-300 group overflow-hidden p-4 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 max-w-[65%]">
                            <div className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-colors duration-300 ${isSettlement ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' : 'bg-slate-900/60 border-slate-800/80 text-slate-400 group-hover:text-violet-400'}`}>
                              <ArrowUpRight className="h-4.5 w-4.5" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <h4 className={`text-sm font-semibold truncate ${isSettlement ? 'text-emerald-300' : 'text-slate-100 group-hover:text-white'}`}>
                                {tx.description}
                              </h4>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className="border-slate-900 bg-slate-900/60 text-slate-400 rounded-md text-[8px] px-1.5 py-0">
                                  Paid by: {tx.payer_name}
                                </Badge>
                                <Badge className="border-slate-900 bg-slate-900/60 text-slate-400 rounded-md text-[8px] px-1.5 py-0">
                                  {tx.card_name || 'Cash'}
                                </Badge>
                                <span className="text-[9px] text-slate-500">
                                  {new Date(tx.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-black tracking-wide ${isSettlement ? 'text-emerald-400' : 'text-white'}`}>
                              ${tx.amount.toFixed(2)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTransaction(tx.id)}
                              className="text-slate-600 hover:text-rose-400 hover:bg-rose-950/10 rounded-lg h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
