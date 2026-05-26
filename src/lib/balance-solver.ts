export interface MemberDetails {
  id: string
  name: string
}

export interface TransactionDetails {
  payer_id: string
  amount: number
}

export interface SplitDetails {
  debtor_id: string
  amount_owed: number
  is_settled: boolean
}

export interface Debt {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}

export function calculateDebts(
  members: MemberDetails[],
  transactions: TransactionDetails[],
  splits: SplitDetails[]
): Debt[] {
  if (members.length === 0) return []

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
  const debtors = netBalances.filter((b) => b.net < -0.01).sort((a, b) => a.net - b.net)

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

  return calculatedDebts
}
