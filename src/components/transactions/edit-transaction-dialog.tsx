'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/supabase-provider'
import { useMergedCards } from '@/hooks/use-merged-cards'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Globe } from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction } from '@/hooks/use-transactions'

interface EditTransactionDialogProps {
  transaction: Transaction
  groupId: string | null
  onSuccess: () => void
}

const CATEGORIES = ['Food', 'Transport', 'Accommodation', 'Shopping', 'Entertainment', 'Other']
const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍔',
  Transport: '🚕',
  Accommodation: '🏨',
  Shopping: '🛍️',
  Entertainment: '🎢',
  Other: '🏷️',
}

export function EditTransactionDialog({ transaction, groupId, onSuccess }: EditTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState(transaction.description)
  const [category, setCategory] = useState(transaction.category || 'Other')
  const [location, setLocation] = useState(transaction.location || '')
  const [stateInput, setStateInput] = useState(transaction.state || '')
  const [amount, setAmount] = useState(String(transaction.foreign_amount > 0 ? transaction.foreign_amount : transaction.amount))
  const [currency, setCurrency] = useState(transaction.currency || 'SGD')
  const [exchangeRate, setExchangeRate] = useState(transaction.exchange_rate || 1.0)
  const [isFetchingRate, setIsFetchingRate] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { supabase } = useAuth()
  const { cards } = useMergedCards(groupId || undefined)
  const [selectedCardId, setSelectedCardId] = useState<string>(transaction.card_id || 'cash')

  // Fetch exchange rate when currency changes
  useEffect(() => {
    if (currency === 'SGD') {
      setExchangeRate(1.0)
      return
    }
    const fetchRate = async () => {
      setIsFetchingRate(true)
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/SGD`)
        const data = await res.json()
        if (data && data.rates && data.rates[currency]) {
          setExchangeRate(data.rates[currency])
        }
      } catch (err) {
        toast.error(`Failed to fetch rate for ${currency}`)
      } finally {
        setIsFetchingRate(false)
      }
    }
    fetchRate()
  }, [currency])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      // Reset to transaction values when re-opening
      setDescription(transaction.description)
      setCategory(transaction.category || 'Other')
      setLocation(transaction.location || '')
      setStateInput(transaction.state || '')
      setAmount(String(transaction.foreign_amount > 0 ? transaction.foreign_amount : transaction.amount))
      setCurrency(transaction.currency || 'SGD')
      setExchangeRate(transaction.exchange_rate || 1.0)
      setSelectedCardId(transaction.card_id || 'cash')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      toast.error('Description is required')
      return
    }
    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (isFetchingRate) {
      toast.error('Please wait for exchange rate to load')
      return
    }

    const baseAmount = currency === 'SGD' ? numericAmount : parseFloat((numericAmount / exchangeRate).toFixed(2))
    const cardItem = selectedCardId === 'cash' ? null : cards.find((c) => c.id === selectedCardId)
    const cardName = cardItem ? cardItem.name : 'Cash'

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          description: description.trim(),
          category,
          location: location.trim() || null,
          state: stateInput || null,
          amount: baseAmount,
          currency,
          foreign_amount: numericAmount,
          exchange_rate: exchangeRate,
          card_id: cardItem?.id ?? null,
          card_name: cardName,
        })
        .eq('id', transaction.id)

      if (error) throw error

      toast.success('Expense updated!')
      setOpen(false)
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update expense')
    } finally {
      setSubmitting(false)
    }
  }

  const numericAmount = parseFloat(amount || '0')
  const estimatedBase = (numericAmount / exchangeRate).toFixed(2)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Trigger: invisible button, parent card's onClick will control open state */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute inset-0 z-0 cursor-pointer"
        aria-label="Edit expense"
      />

      <DialogContent className="border-neutral-900 bg-neutral-950/95 text-white max-w-[420px] rounded-2xl shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-linear-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            <Pencil className="h-5 w-5 text-neutral-300" /> Edit Expense
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs mt-1">
            Update the details for this expense.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Amount & Currency */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-amount" className="text-xs text-slate-300">Amount & Currency</Label>
            <div className="flex gap-2">
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 text-lg font-bold focus:outline-none focus:ring-1 focus:ring-white focus:border-white py-6"
              />
              <Select value={currency} onValueChange={(val) => setCurrency(val || 'SGD')}>
                <SelectTrigger className="w-[100px] border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 text-sm h-[50px]">
                  <SelectValue placeholder="SGD" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950 text-white rounded-xl">
                  <SelectItem value="SGD">SGD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="MYR">MYR</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="THB">THB</SelectItem>
                  <SelectItem value="KRW">KRW</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {currency !== 'SGD' && (
              <p className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-1">
                <Globe className="h-3 w-3" />
                {isFetchingRate ? 'Fetching rate...' : `Est. Base: ${estimatedBase} SGD`}
              </p>
            )}
          </div>

          {/* Description & Category */}
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc" className="text-xs text-slate-300">Description</Label>
              <Input
                id="edit-desc"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Category</Label>
              <Select value={category} onValueChange={(val) => setCategory(val || 'Other')}>
                <SelectTrigger className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-white h-[42px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950 text-white rounded-xl">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location & State */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-loc" className="text-xs text-slate-300">Location</Label>
              <Input
                id="edit-loc"
                placeholder="e.g. Walmart"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-region" className="text-xs text-slate-300">Region / State</Label>
              <Input
                id="edit-region"
                list="edit-recent-regions"
                placeholder={
                  currency === 'JPY' ? 'e.g. Sapporo, Osaka' :
                  currency === 'MYR' ? 'e.g. Penang, KL' :
                  currency === 'EUR' ? 'e.g. Paris, Berlin' :
                  currency === 'GBP' ? 'e.g. London, Edinburgh' :
                  currency === 'AUD' ? 'e.g. Sydney, Melbourne' :
                  currency === 'KRW' ? 'e.g. Seoul, Busan' :
                  currency === 'THB' ? 'e.g. Bangkok, Chiang Mai' :
                  'e.g. California, New York'
                }
                value={stateInput}
                onChange={(e) => setStateInput(e.target.value)}
                className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
              />
              <datalist id="edit-recent-regions" />
            </div>
          </div>

          {/* Card */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Payment Card</Label>
            <Select value={selectedCardId} onValueChange={(val) => setSelectedCardId(val || 'cash')}>
              <SelectTrigger className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-300 text-left focus:outline-none focus:ring-1 focus:ring-white">
                <SelectValue placeholder="Select Payment Card" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-950 text-white rounded-xl">
                <SelectItem value="cash">💵 Cash</SelectItem>
                {cards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>💳 {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting || isFetchingRate}
            className="w-full bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl py-6 mt-2 shadow-2xl"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
