import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/providers/supabase-provider'
import { toast } from 'sonner'

export interface Transaction {
  id: string
  amount: number
  description: string
  payer_id: string
  card_id: string | null
  card_name: string | null
  group_id: string | null
  created_at: string
  payer_name?: string
}

export interface TransactionSplit {
  id: string
  transaction_id: string
  debtor_id: string
  amount_owed: number
  is_settled: boolean
  created_at: string
  debtor_name?: string
}

export interface SplitInput {
  debtorId: string
  amountOwed: number
}

export function useTransactions(groupId: string | null = null) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [splits, setSplits] = useState<TransactionSplit[]>([])
  const [loading, setLoading] = useState(true)
  const { supabase, user } = useAuth()

  const fetchTransactions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Fetch Transactions
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (groupId) {
        query = query.eq('group_id', groupId)
      } else {
        query = query.is('group_id', null)
      }

      const { data: txData, error: txError } = await query
      if (txError) throw txError

      // Fetch Profiles to map names
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')

      const profileMap = new Map<string, string>()
      if (!profileError && profileData) {
        profileData.forEach((p) => profileMap.set(p.id, p.name || 'Unknown User'))
      }

      const mappedTx: Transaction[] = (txData || []).map((t) => ({
        ...t,
        payer_name: profileMap.get(t.payer_id) || 'Unknown User',
      }))

      setTransactions(mappedTx)

      // 2. Fetch splits for these transactions
      if (mappedTx.length > 0) {
        const txIds = mappedTx.map((t) => t.id)
        const { data: splitsData, error: splitsError } = await supabase
          .from('transaction_splits')
          .select('*')
          .in('transaction_id', txIds)

        if (splitsError) throw splitsError

        const mappedSplits: TransactionSplit[] = (splitsData || []).map((s) => ({
          ...s,
          debtor_name: profileMap.get(s.debtor_id) || 'Unknown User',
        }))

        setSplits(mappedSplits)
      } else {
        setSplits([])
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, user, groupId])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const addTransaction = async (
    amount: number,
    description: string,
    payerId: string,
    cardId: string | null,
    cardName: string | null,
    splitInputs: SplitInput[]
  ) => {
    if (!user) return false

    // Validate that splits sum matches transaction amount exactly
    const sumSplits = splitInputs.reduce((sum, s) => sum + s.amountOwed, 0)
    // Avoid float precision discrepancies by checking difference within 1 cent
    if (Math.abs(sumSplits - amount) > 0.01) {
      toast.error(`The split amounts ($${sumSplits.toFixed(2)}) must sum up to the transaction total ($${amount.toFixed(2)})`)
      return false
    }

    try {
      // **CLIENT-SIDE UUID GENERATION** for offline support
      const transactionId = crypto.randomUUID()

      // 1. Insert parent Transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          id: transactionId,
          amount,
          description: description.trim(),
          payer_id: payerId,
          card_id: cardId && cardId.startsWith('preset-') ? null : cardId,
          card_name: cardName,
          group_id: groupId,
          created_at: new Date().toISOString(),
        })

      if (txError) throw txError

      // 2. Insert Split distribution with client-side UUIDs
      const splitRows = splitInputs.map((s) => ({
        id: crypto.randomUUID(),
        transaction_id: transactionId,
        debtor_id: s.debtorId,
        amount_owed: s.amountOwed,
        is_settled: false,
        created_at: new Date().toISOString(),
      }))

      const { error: splitsError } = await supabase
        .from('transaction_splits')
        .insert(splitRows)

      if (splitsError) throw splitsError

      toast.success('Expense recorded successfully!')
      await fetchTransactions()
      return true
    } catch (err: any) {
      console.error('Error adding transaction:', err)
      toast.error(err.message || 'Failed to save transaction')
      return false
    }
  }

  const deleteTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)

      if (error) throw error

      toast.success('Transaction removed successfully')
      await fetchTransactions()
      return true
    } catch (err: any) {
      console.error('Error deleting transaction:', err)
      toast.error('Failed to remove transaction')
      return false
    }
  }

  return {
    transactions,
    splits,
    loading,
    addTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  }
}
