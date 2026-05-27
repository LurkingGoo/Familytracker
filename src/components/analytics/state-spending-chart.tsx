'use client'

import React, { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card } from '@/components/ui/card'
import { MapPin, Tag } from 'lucide-react'

interface Transaction {
  amount: number
  state: string | null
  category?: string
}

interface RegionSpendingChartProps {
  transactions: Transaction[]
}

const REGION_COLORS = ['#38bdf8', '#fbbf24', '#a3e635', '#f472b6', '#c084fc', '#fb923c', '#34d399', '#f87171']
const CAT_COLORS  = ['#818cf8', '#fb923c', '#34d399', '#f472b6', '#38bdf8', '#fbbf24']

const CATEGORIES = ['Food', 'Transport', 'Accommodation', 'Shopping', 'Entertainment', 'Other']

export function StateSpendingChart({ transactions }: RegionSpendingChartProps) {
  const [view, setView] = useState<'region' | 'category'>('region')

  const regionData = useMemo(() => {
    const totals: Record<string, number> = {}
    transactions.forEach(tx => {
      const key = tx.state?.trim() || 'Uncategorised'
      totals[key] = (totals[key] || 0) + tx.amount
    })
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0 && item.name !== 'Uncategorised')
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {}
    transactions.forEach(tx => {
      const key = tx.category || 'Other'
      totals[key] = (totals[key] || 0) + tx.amount
    })
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  const chartData = view === 'region' ? regionData : categoryData
  const colors = view === 'region' ? REGION_COLORS : CAT_COLORS

  if (regionData.length === 0 && categoryData.length === 0) return null

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    if (percent < 0.07) return null
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={9} fontWeight="bold">
        {name.length > 12 ? name.slice(0, 11) + '…' : name}
      </text>
    )
  }

  return (
    <Card className="border-neutral-900 bg-neutral-950/40 backdrop-blur-2xl rounded-2xl p-4 shadow-xl mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {view === 'region' ? <MapPin className="h-4 w-4 text-neutral-400" /> : <Tag className="h-4 w-4 text-neutral-400" />}
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            {view === 'region' ? 'Spending by Region' : 'Spending by Category'}
          </h3>
        </div>
        {/* Toggle */}
        <div className="flex items-center gap-1 bg-neutral-900/70 border border-neutral-800 rounded-xl p-0.5">
          <button
            onClick={() => setView('region')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ${view === 'region' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
          >
            Region
          </button>
          <button
            onClick={() => setView('category')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ${view === 'category' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
          >
            Category
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <p className="text-[10px] text-slate-500 text-center py-8 italic">
          No {view === 'region' ? 'region-tagged' : 'categorised'} data yet.
        </p>
      ) : (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={80}
                innerRadius={50}
                dataKey="value"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth={2}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`S$${Number(value).toFixed(2)}`, 'Amount']}
                contentStyle={{ backgroundColor: 'rgba(10, 10, 10, 0.9)', borderColor: '#262626', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
