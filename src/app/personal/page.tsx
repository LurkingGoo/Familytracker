'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { useTransactions } from '@/hooks/use-transactions'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Trash2, ArrowUpRight, TrendingUp, Calendar, Wallet, LogOut, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PersonalDashboard() {
  const { profile, signOut } = useAuth()
  const { transactions, loading, addTransaction, deleteTransaction } = useTransactions(null)
  const router = useRouter()

  // Calculate metrics
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  
  // Find top utilized card
  const cardCounts: Record<string, number> = {}
  transactions.forEach((tx) => {
    const name = tx.card_name || 'Cash'
    cardCounts[name] = (cardCounts[name] || 0) + 1
  })
  
  let topCard = 'None'
  let maxCount = 0
  Object.entries(cardCounts).forEach(([name, count]) => {
    if (count > maxCount) {
      maxCount = count
      topCard = name
    }
  })

  const handleAddTx = async (
    amount: number,
    description: string,
    payerId: string,
    cardId: string | null,
    cardName: string | null,
    splits: Array<{ debtorId: string; amountOwed: number }>
  ) => {
    return await addTransaction(amount, description, payerId, cardId, cardName, splits)
  }

  return (
    <div className="min-h-screen pb-safe bg-radial from-slate-900 via-slate-950 to-black text-white px-4 py-8">
      {/* Backdrops */}
      <div className="absolute top-[-10%] left-[-15%] h-[50%] w-[50%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] h-[50%] w-[50%] rounded-full bg-cyan-600/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-[600px] w-full z-10 relative">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between mb-8 border-b border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-linear-to-tr from-violet-600 to-cyan-500 shadow-md shadow-violet-500/10">
              <Wallet className="h-5 w-5 text-white" />
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
              onClick={() => router.push('/groups')}
              className="border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white rounded-xl h-9 w-9"
              title="Workspaces"
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/cards')}
              className="border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white rounded-xl h-9 w-9"
              title="Wallet"
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

        {/* Dashboard Title & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-black tracking-tight bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Personal Vault
            </h2>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest text-cyan-400">
              Private Ledger
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

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md rounded-xl p-3 shadow-md">
            <CardHeader className="p-0 pb-1.5 flex flex-row items-center justify-between">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total Spent</span>
              <TrendingUp className="h-3 w-3 text-emerald-400" />
            </CardHeader>
            <CardContent className="p-0">
              <span className="text-lg font-bold text-white tracking-wide">
                ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </CardContent>
          </Card>

          <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md rounded-xl p-3 shadow-md">
            <CardHeader className="p-0 pb-1.5 flex flex-row items-center justify-between">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Payments</span>
              <Calendar className="h-3 w-3 text-violet-400" />
            </CardHeader>
            <CardContent className="p-0">
              <span className="text-lg font-bold text-white">
                {transactions.length} items
              </span>
            </CardContent>
          </Card>

          <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md rounded-xl p-3 shadow-md overflow-hidden">
            <CardHeader className="p-0 pb-1.5 flex flex-row items-center justify-between">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Top Card</span>
              <CreditCard className="h-3 w-3 text-cyan-400" />
            </CardHeader>
            <CardContent className="p-0">
              <span className="text-xs font-bold text-white truncate block max-w-full">
                {topCard}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Ledger */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
            Transaction History ({transactions.length})
          </h3>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              <p className="text-xs text-slate-500 font-medium">Loading private ledger...</p>
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
                    <Wallet className="h-8 w-8 text-slate-600 mb-2.5" />
                    <h4 className="text-xs font-semibold text-slate-400">Ledger is Clean</h4>
                    <p className="text-[10px] text-slate-500 max-w-[220px] mt-1">
                      No private expenses recorded yet. Click "Add Expense" to track your solo spending.
                    </p>
                  </motion.div>
                ) : (
                  transactions.map((tx) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="border-slate-800/80 bg-slate-950/40 hover:bg-slate-950/60 backdrop-blur-xl transition-all duration-300 group overflow-hidden p-4 rounded-xl flex items-center justify-between gap-4">
                        {/* Transaction Detail */}
                        <div className="flex items-center gap-3 max-w-[65%]">
                          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-400 group-hover:text-violet-400 transition-colors duration-300">
                            <ArrowUpRight className="h-4.5 w-4.5" />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-100 group-hover:text-white truncate">
                              {tx.description}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge className="border-slate-900 bg-slate-900/60 text-slate-400 hover:bg-slate-900 rounded-md text-[9px] px-1.5 py-0">
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

                        {/* Amount & Actions */}
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-white tracking-wide">
                            -${tx.amount.toFixed(2)}
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
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
