import { test } from 'node:test'
import assert from 'node:assert'
import { calculateDebts } from '../balance-solver'

test('calculateDebts - empty group', () => {
  const result = calculateDebts([], [], [])
  assert.deepStrictEqual(result, [])
})

test('calculateDebts - simple two person split', () => {
  const members = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ]
  const transactions = [
    { payer_id: '1', amount: 50.0 }, // Alice paid $50
  ]
  const splits = [
    { debtor_id: '1', amount_owed: 25.0, is_settled: false }, // Alice owes $25 to herself
    { debtor_id: '2', amount_owed: 25.0, is_settled: false }, // Bob owes $25 to Alice
  ]

  const result = calculateDebts(members, transactions, splits)
  
  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].fromId, '2') // Bob owes
  assert.strictEqual(result[0].toId, '1')   // to Alice
  assert.strictEqual(result[0].amount, 25.0)
})

test('calculateDebts - complex multi-user settlement simplification', () => {
  const members = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' },
  ]
  
  // Total expenses: $160
  // Each person's share: $53.33 (Alice & Bob get slight rounding adjustment)
  const transactions = [
    { payer_id: '1', amount: 100.0 }, // Alice paid $100
    { payer_id: '2', amount: 60.0 },  // Bob paid $60
  ]
  
  const splits = [
    // Alice's transaction splits
    { debtor_id: '1', amount_owed: 33.33, is_settled: false },
    { debtor_id: '2', amount_owed: 33.33, is_settled: false },
    { debtor_id: '3', amount_owed: 33.34, is_settled: false },
    // Bob's transaction splits
    { debtor_id: '1', amount_owed: 20.0, is_settled: false },
    { debtor_id: '2', amount_owed: 20.0, is_settled: false },
    { debtor_id: '3', amount_owed: 20.0, is_settled: false },
  ]

  const result = calculateDebts(members, transactions, splits)

  // Net totals:
  // Alice: Paid 100, Owed (33.33 + 20) = 53.33 -> Net +46.67
  // Bob: Paid 60, Owed (33.33 + 20) = 53.33 -> Net +6.67
  // Charlie: Paid 0, Owed (33.34 + 20) = 53.34 -> Net -53.34
  
  // Greedy solution expects:
  // Charlie owes Alice $46.67
  // Charlie owes Bob $6.67
  assert.strictEqual(result.length, 2)
  
  const charlieToAlice = result.find(d => d.fromId === '3' && d.toId === '1')
  const charlieToBob = result.find(d => d.fromId === '3' && d.toId === '2')

  assert.ok(charlieToAlice)
  assert.ok(charlieToBob)
  assert.strictEqual(charlieToAlice.amount, 46.67)
  assert.strictEqual(charlieToBob.amount, 6.67)
})

test('calculateDebts - ignores already settled splits', () => {
  const members = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ]
  const transactions = [
    { payer_id: '1', amount: 50.0 },
  ]
  const splits = [
    { debtor_id: '1', amount_owed: 25.0, is_settled: true }, // settled
    { debtor_id: '2', amount_owed: 25.0, is_settled: true }, // settled
  ]

  const result = calculateDebts(members, transactions, splits)
  assert.deepStrictEqual(result, [])
})
