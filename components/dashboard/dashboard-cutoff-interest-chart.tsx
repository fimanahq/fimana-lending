'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/format'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

export interface DashboardInterestMonthlyRow {
  monthKey: string
  monthLabel: string
  interestDueMinor: number
  interestCollectedMinor: number
  remainingInterestMinor: number
  cutoffCount: number
}

const tooltipContentStyle = {
  border: '1px solid rgba(97, 84, 62, 0.14)',
  borderRadius: '18px',
  backgroundColor: 'rgba(255, 252, 245, 0.96)',
  boxShadow: '0 18px 30px rgba(29, 28, 18, 0.08)',
}

const tooltipItemStyle = {
  color: '#17140f',
  fontWeight: 700,
}

const tooltipLabelStyle = {
  color: 'rgba(84, 67, 57, 0.74)',
  fontWeight: 700,
  marginBottom: '0.25rem',
}

const tooltipWrapperStyle = {
  zIndex: 8,
}

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
}

function formatCompactMinorCurrency(valueMinor: number, currency: string) {
  const value = valueMinor / 100
  return new Intl.NumberFormat('en-PH', {
    compactDisplay: 'short',
    currency,
    maximumFractionDigits: 1,
    notation: 'compact',
    style: 'currency',
  }).format(value)
}

export function DashboardCutoffInterestChart({
  currency,
  rows,
}: {
  currency: string
  rows: DashboardInterestMonthlyRow[]
}) {
  const ariaLabel = rows
    .map((row) => (
      `${row.monthLabel}: ${formatMinorCurrency(row.interestDueMinor, currency)} due, ${formatMinorCurrency(row.interestCollectedMinor, currency)} collected`
    ))
    .join('. ')

  return (
    <figure className={dashboardClass('dashboard-overview__interestChart')} aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 8, right: 18, bottom: 8, left: 6 }}
        >
          <CartesianGrid stroke="rgba(97, 84, 62, 0.12)" vertical={false} />
          <XAxis
            dataKey="monthLabel"
            tickLine={false}
            axisLine={{ stroke: 'rgba(97, 84, 62, 0.16)' }}
          />
          <YAxis
            tickFormatter={(value) => formatCompactMinorCurrency(Number(value), currency)}
            tickLine={false}
            axisLine={false}
            width={78}
          />
          <Tooltip
            formatter={(value, name) => [
              formatMinorCurrency(Number(value), currency),
              name,
            ]}
            labelFormatter={(label) => String(label)}
            contentStyle={tooltipContentStyle}
            itemStyle={tooltipItemStyle}
            labelStyle={tooltipLabelStyle}
            wrapperStyle={tooltipWrapperStyle}
          />
          <Legend />
          <Bar
            dataKey="interestDueMinor"
            name="Interest due"
            fill="#b96d2a"
            radius={[8, 8, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="interestCollectedMinor"
            name="Interest collected"
            fill="#2d6b59"
            radius={[8, 8, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}
