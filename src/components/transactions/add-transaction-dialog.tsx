'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/supabase-provider'
import { useMergedCards } from '@/hooks/use-merged-cards'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface Member {
  id: string
  name: string
}

interface AddTransactionDialogProps {
  groupId: string | null // null if personal transaction
  members: Member[]
  onSuccess: (
    amount: number,
    description: string,
    payerId: string,
    cardId: string | null,
    cardName: string | null,
    splits: Array<{ debtorId: string; amountOwed: number }>
  ) => Promise<boolean>
}

export function AddTransactionDialog({ groupId, members, onSuccess }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const { user } = useAuth()

  // State for card selection
  const { cards, loading: loadingCards } = useMergedCards(groupId || undefined)
  const [selectedCardId, setSelectedCardId] = useState<string>('cash')

  // Payer state (defaults to current logged-in user)
  const [payerId, setPayerId] = useState('')

  // Split management state
  const [splitType, setSplitType] = useState<'equal' | 'exact'>('equal')
  const [exactShares, setExactShares] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Initialize defaults
  useEffect(() => {
    if (user) {
      setPayerId(user.id)
    }
  }, [user, open])

  // Reset inputs when opening/closing
  const resetForm = () => {
    setAmount('')
    setDescription('')
    setSelectedCardId('cash')
    if (user) setPayerId(user.id)
    setSplitType('equal')
    setExactShares({})
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      resetForm()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (!description.trim()) {
      toast.error('Expense description is required')
      return
    }
    if (!payerId) {
      toast.error('Payer is required')
      return
    }

    const numericAmount = parseFloat(amount)
    const cardItem = selectedCardId === 'cash' ? null : cards.find((c) => c.id === selectedCardId)
    const cardId = cardItem ? cardItem.id : null
    const cardName = cardItem ? cardItem.name : 'Cash'

    // Compute splits based on logic
    let finalSplits: Array<{ debtorId: string; amountOwed: number }> = []

    if (!groupId) {
      // Personal transactions split 100% to the payer (the user)
      finalSplits = [{ debtorId: payerId, amountOwed: numericAmount }]
    } else {
      if (splitType === 'equal') {
        const shareAmount = parseFloat((numericAmount / members.length).toFixed(2))
        // Correct rounding discrepancies on the last member
        let totalDistributed = 0
        members.forEach((m, idx) => {
          if (idx === members.length - 1) {
            finalSplits.push({
              debtorId: m.id,
              amountOwed: parseFloat((numericAmount - totalDistributed).toFixed(2)),
            })
          } else {
            finalSplits.push({ debtorId: m.id, amountOwed: shareAmount })
            totalDistributed += shareAmount
          }
        })
      } else {
        // Exact splitting
        let sumShares = 0
        const parsedShares: Array<{ debtorId: string; amountOwed: number }> = []

        for (const m of members) {
          const shareVal = parseFloat(exactShares[m.id] || '0')
          if (isNaN(shareVal) || shareVal < 0) {
            toast.error(`Please input a valid share amount for ${m.name}`)
            return
          }
          parsedShares.push({ debtorId: m.id, amountOwed: shareVal })
          sumShares += shareVal
        }

        if (Math.abs(sumShares - numericAmount) > 0.01) {
          toast.error(`Total shares ($${sumShares.toFixed(2)}) must sum up to the transaction total ($${numericAmount.toFixed(2)})`)
          return
        }

        finalSplits = parsedShares
      }
    }

    setSubmitting(true)
    try {
      const isSuccess = await onSuccess(
        numericAmount,
        description.trim(),
        payerId,
        cardId,
        cardName,
        finalSplits
      )
      if (isSuccess) {
        setOpen(false)
        resetForm()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button className="bg-white hover:bg-neutral-200 text-black rounded-xl shadow-lg font-medium flex gap-1.5 py-4 px-4 border border-transparent">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      } />
      <DialogContent className="border-neutral-900 bg-neutral-950/95 text-white max-w-[420px] rounded-2xl shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-linear-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            <Sparkles className="h-5 w-5 text-neutral-300" /> Record Expense
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs mt-1">
            Input transaction amount, description, card, and splitting parameters.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs text-slate-300">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 placeholder-neutral-700 text-lg font-bold focus:outline-none focus:ring-1 focus:ring-white focus:border-white py-6"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-xs text-slate-300">Description</Label>
            <Input
              id="desc"
              required
              placeholder="e.g. Sushi Dinner, Fuel, Target groceries"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
            />
          </div>

          {/* Card selection (Merged) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Payment Card</Label>
            <Select value={selectedCardId} onValueChange={(val) => setSelectedCardId(val || 'cash')}>
              <SelectTrigger className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-300 text-left focus:outline-none focus:ring-1 focus:ring-white">
                <SelectValue placeholder="Select Payment Card" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-950 text-white rounded-xl">
                <SelectItem value="cash">💵 Cash / Cash Equivalent</SelectItem>
                {loadingCards ? (
                  <SelectItem value="loading" disabled>Loading cards preset...</SelectItem>
                ) : (
                  cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      💳 {c.name} {c.isPreset ? '(Preset)' : '(Personal)'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Group Payer and Split Layout */}
          {groupId && members.length > 0 && (
            <>
              {/* Who paid */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Who Paid?</Label>
                <Select value={payerId} onValueChange={(val) => setPayerId(val || '')}>
                  <SelectTrigger className="border-slate-800 bg-slate-900/60 rounded-xl text-slate-300">
                    <SelectValue placeholder="Select Payer" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-950 text-white rounded-xl">
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        👤 {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Splitting Logic Tabs */}
              <div className="space-y-2.5 pt-2 border-t border-slate-900">
                <Label className="text-xs text-slate-300">Expense Split Logic</Label>
                <Tabs value={splitType} onValueChange={(v: any) => setSplitType(v)} className="w-full">
                  <TabsList className="grid grid-cols-2 bg-slate-900/60 rounded-xl p-1 border border-slate-800/50">
                    <TabsTrigger value="equal" className="rounded-lg text-xs font-semibold data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                      Split Equally
                    </TabsTrigger>
                    <TabsTrigger value="exact" className="rounded-lg text-xs font-semibold data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                      Exact Shares
                    </TabsTrigger>
                  </TabsList>

                  {/* Split Equally Tab description */}
                  <TabsContent value="equal" className="pt-2">
                    <p className="text-[10px] text-slate-500 leading-relaxed text-center py-2 bg-slate-900/20 border border-slate-900 rounded-xl">
                      Divides $ {amount || '0.00'} evenly among all {members.length} members ($ {amount ? (parseFloat(amount) / members.length).toFixed(2) : '0.00'} each).
                    </p>
                  </TabsContent>

                  {/* Exact Split Shares */}
                  <TabsContent value="exact" className="pt-3 space-y-3 max-h-[140px] overflow-y-auto pr-1">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-300 truncate max-w-[150px]">👤 {m.name}</span>
                        <div className="relative w-[110px]">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={exactShares[m.id] || ''}
                            onChange={(e) =>
                              setExactShares({ ...exactShares, [m.id]: e.target.value })
                            }
                            className="border-neutral-800 bg-neutral-900/50 rounded-lg text-right pl-6 focus:outline-none focus:ring-1 focus:ring-white h-8 text-xs text-slate-200"
                          />
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl py-6 mt-4 shadow-2xl flex items-center justify-center gap-2 border border-transparent"
          >
            {submitting ? 'Recording Expense...' : 'Record Transaction'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
