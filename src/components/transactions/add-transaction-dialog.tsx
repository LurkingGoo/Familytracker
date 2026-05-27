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
import { Plus, Sparkles, Globe } from 'lucide-react'
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
  ) => Promise<boolean>
}

export function AddTransactionDialog({ groupId, members, onSuccess }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Food')
  const [location, setLocation] = useState('')
  const [stateInput, setStateInput] = useState('')
  
  const [currency, setCurrency] = useState('SGD')
  const [exchangeRate, setExchangeRate] = useState(1.0)
  const [isFetchingRate, setIsFetchingRate] = useState(false)

  const [recentLocations, setRecentLocations] = useState<string[]>([])
  const [recentStates, setRecentStates] = useState<string[]>([])

  const { user, supabase } = useAuth()

  // Card selection
  const { cards, loading: loadingCards } = useMergedCards(groupId || undefined)
  const [selectedCardId, setSelectedCardId] = useState<string>('cash')

  // Payer (defaults to current user)
  const [payerId, setPayerId] = useState('')

  // Split management
  const [splitType, setSplitType] = useState<'equal' | 'exact'>('equal')
  const [exactShares, setExactShares] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Init currency from localStorage on first render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tf_preferred_currency')
      if (saved && saved !== 'SGD') setCurrency(saved)
    }
  }, [])


  useEffect(() => {
    if (!open) return

    if (typeof window !== 'undefined') {
      localStorage.setItem('tf_preferred_currency', currency)
    }
    if (currency === 'SGD') {
      setExchangeRate(1.0)
      return
    }
    let cancelled = false
    const fetchRate = async () => {
      setIsFetchingRate(true)
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/SGD`)
        const data = await res.json()
        if (!cancelled && data?.rates?.[currency]) {
          const rate = data.rates[currency]
          setExchangeRate(rate)
          // Cache the fetched rate so re-opens are instant
          if (typeof window !== 'undefined') {
            localStorage.setItem(`tf_rate_${currency}`, String(rate))
          }
        }
      } catch (err) {
        // Fallback: try last cached rate
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`tf_rate_${currency}`)
          if (cached && !cancelled) setExchangeRate(parseFloat(cached))
        }
        console.error('Error fetching exchange rate:', err)
        toast.error(`Could not refresh ${currency} rate — using cached value`)
      } finally {
        if (!cancelled) setIsFetchingRate(false)
      }
    }
    // Immediately apply cached rate (fast start), then refresh from API
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`tf_rate_${currency}`)
      if (cached) setExchangeRate(parseFloat(cached))
    }
    fetchRate()
    return () => { cancelled = true }
  }, [currency, open])

  // Initialize defaults and fetch locations
  useEffect(() => {
    if (user) {
      setPayerId(user.id)
    }
    if (open && user) {
      const fetchRecentData = async () => {
        const { data } = await supabase
          .from('transactions')
          .select('location, state')
          .eq('payer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (data) {
          const uniqueLocs = Array.from(new Set(data.map((d: any) => d.location).filter(Boolean))) as string[]
          const uniqueStates = Array.from(new Set(data.map((d: any) => d.state).filter(Boolean))) as string[]
          setRecentLocations(uniqueLocs)
          setRecentStates(uniqueStates)
          
          if (uniqueLocs.length > 0 && !location) setLocation(uniqueLocs[0])
          if (uniqueStates.length > 0 && !stateInput) setStateInput(uniqueStates[0])
        }
      }
      fetchRecentData()
    }
  }, [user, open, supabase])

  // Reset inputs when opening/closing
  const resetForm = () => {
    setAmount('')
    setDescription('')
    setCategory('Food')
    setLocation('')
    setStateInput('')
    const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('tf_preferred_currency') : null
    setCurrency(savedCurrency || 'SGD')
    setExchangeRate(1.0)
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
    if (isFetchingRate) {
      toast.error('Please wait for the exchange rate to load')
      return
    }

    const numericAmount = parseFloat(amount)
    const baseAmount = currency === 'SGD' ? numericAmount : parseFloat((numericAmount / exchangeRate).toFixed(2))

    const cardItem = selectedCardId === 'cash' ? null : cards.find((c) => c.id === selectedCardId)
    const cardId = cardItem ? cardItem.id : null
    const cardName = cardItem ? cardItem.name : 'Cash'

    // Compute splits based on logic
    let finalSplits: Array<{ debtorId: string; amountOwed: number }> = []

    if (!groupId) {
      // Personal transactions split 100% to the payer (the user)
      finalSplits = [{ debtorId: payerId, amountOwed: baseAmount }]
    } else {
      if (splitType === 'equal') {
        const shareAmount = parseFloat((baseAmount / members.length).toFixed(2))
        // Correct rounding discrepancies on the last member
        let totalDistributed = 0
        members.forEach((m, idx) => {
          if (idx === members.length - 1) {
            finalSplits.push({
              debtorId: m.id,
              amountOwed: parseFloat((baseAmount - totalDistributed).toFixed(2)),
            })
          } else {
            finalSplits.push({ debtorId: m.id, amountOwed: shareAmount })
            totalDistributed += shareAmount
          }
        })
      } else {
        // Exact splitting based on baseAmount
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

        if (Math.abs(sumShares - baseAmount) > 0.01) {
          toast.error(`Total shares ($${sumShares.toFixed(2)}) must sum up to the base transaction total ($${baseAmount.toFixed(2)} SGD)`)
          return
        }

        finalSplits = parsedShares
      }
    }

    setSubmitting(true)
    try {
      const isSuccess = await onSuccess(
        baseAmount,
        description.trim(),
        category,
        location.trim() || null,
        stateInput.trim() || null,
        currency,
        numericAmount,
        exchangeRate,
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

  const numericAmount = parseFloat(amount || '0')
  const estimatedBase = (numericAmount / exchangeRate).toFixed(2)

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
          {/* Amount & Currency */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs text-slate-300">Amount & Currency</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 placeholder-neutral-700 text-lg font-bold focus:outline-none focus:ring-1 focus:ring-white focus:border-white py-6"
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
                {isFetchingRate ? 'Fetching rate...' : `Est. Base Deduction: ${estimatedBase} SGD (Rate: ${exchangeRate})`}
              </p>
            )}
          </div>

          {/* Description & Category */}
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs text-slate-300">Description</Label>
              <Input
                id="desc"
                required
                placeholder="e.g. Sushi Dinner, Fuel"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Category</Label>
              <Select value={category} onValueChange={(val) => setCategory(val || 'Food')}>
                <SelectTrigger className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-white h-[42px]">
                  <SelectValue placeholder="Food" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950 text-white rounded-xl">
                  <SelectItem value="Food">🍔 Food</SelectItem>
                  <SelectItem value="Transport">🚕 Transport</SelectItem>
                  <SelectItem value="Accommodation">🏨 Accommodation</SelectItem>
                  <SelectItem value="Shopping">🛍️ Shopping</SelectItem>
                  <SelectItem value="Entertainment">🎢 Entertainment</SelectItem>
                  <SelectItem value="Other">🏷️ Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location & State */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loc" className="text-xs text-slate-300">Location (Optional)</Label>
              <Input
                id="loc"
                list="recent-locations"
                placeholder="e.g. Walmart"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
              />
              <datalist id="recent-locations">
                {recentLocations.map((loc, i) => (
                  <option key={i} value={loc} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="region" className="text-xs text-slate-300">Region / State (Optional)</Label>
              <Input
                id="region"
                list="recent-regions"
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
              <datalist id="recent-regions">
                {recentStates.map((st, i) => (
                  <option key={i} value={st} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Card selection (Merged) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Payment Card</Label>
            <Select value={selectedCardId} onValueChange={(val) => setSelectedCardId(val || 'cash')}>
              <SelectTrigger className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-300 text-left focus:outline-none focus:ring-1 focus:ring-white">
                <SelectValue placeholder="Select Payment Card" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-950 text-white rounded-xl max-h-[150px]">
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
                <Label className="text-xs text-slate-300">Expense Split Logic (SGD Base)</Label>
                <Tabs value={splitType} onValueChange={(v: any) => setSplitType(v)} className="w-full">
                  <TabsList className="grid grid-cols-2 bg-slate-900/60 rounded-xl p-1 border border-slate-800/50">
                    <TabsTrigger value="equal" className="rounded-lg text-xs font-semibold data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                      Split Equally
                    </TabsTrigger>
                    <TabsTrigger value="exact" className="rounded-lg text-xs font-semibold data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                      Exact SGD Shares
                    </TabsTrigger>
                  </TabsList>

                  {/* Split Equally Tab description */}
                  <TabsContent value="equal" className="pt-2">
                    <p className="text-[10px] text-slate-500 leading-relaxed text-center py-2 bg-slate-900/20 border border-slate-900 rounded-xl">
                      Divides SGD ${estimatedBase} evenly among all {members.length} members (SGD ${(parseFloat(estimatedBase) / members.length).toFixed(2)} each).
                    </p>
                  </TabsContent>

                  {/* Exact Split Shares */}
                  <TabsContent value="exact" className="pt-3 space-y-3 max-h-[140px] overflow-y-auto pr-1">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-300 truncate max-w-[150px]">👤 {m.name}</span>
                        <div className="relative w-[110px]">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">S$</span>
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
            disabled={submitting || isFetchingRate}
            className="w-full bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl py-6 mt-4 shadow-2xl flex items-center justify-center gap-2 border border-transparent"
          >
            {submitting ? 'Recording Expense...' : 'Record Transaction'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
