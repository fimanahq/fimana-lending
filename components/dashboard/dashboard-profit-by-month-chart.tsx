'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/format'
import type { DashboardMonthlyProfitRow } from '@/lib/types/lending'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

const tooltipContentStyle = {
  border: '1px solid rgba(97, 84, 62, 0.14)',
  borderRadius: '18px',
  backgroundColor: 'rgba(255, 252, 245, 0.96)',
  boxShadow: '0 18px 30px rgba(29, 28, 18, 0.08)',
}

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
}

function formatCompactMinorCurrency(valueMinor: number, currency: string) {
  return new Intl.NumberFormat('en-PH', {
    compactDisplay: 'short',
    currency,
    maximumFractionDigits: 1,
    notation: 'compact',
    style: 'currency',
  }).format(valueMinor / 100)
}

export function DashboardProfitByMonthChart({
  averageMonthlyProfitMinor,
  currency,
  rows,
  showInterestDue = true,
}: {
  averageMonthlyProfitMinor?: number
  currency: string
  rows: DashboardMonthlyProfitRow[]
  showInterestDue?: boolean
}) {
  const ariaLabel = rows.map((row) => (
    `${row.monthLabel}: ${showInterestDue ? `${formatMinorCurrency(row.interestDueMinor, currency)} interest due, ` : ''}${formatMinorCurrency(row.interestCollectedMinor, currency)} interest collected, ${formatMinorCurrency(row.penaltyCollectedMinor, currency)} penalties, ${formatMinorCurrency(row.excessProfitMinor ?? 0, currency)} excess profit, ${formatMinorCurrency(row.treasuryInterestEarnedMinor ?? 0, currency)} Treasury interest, ${formatMinorCurrency(row.totalProfitMinor, currency)} total profit`
  )).join('. ')

  return (
    <figure className={dashboardClass('dashboard-overview__interestChart')} aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 18, bottom: 8, left: 6 }}>
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
            formatter={(value, name) => [formatMinorCurrency(Number(value), currency), name]}
            labelFormatter={(label) => String(label)}
            contentStyle={tooltipContentStyle}
            wrapperStyle={{ zIndex: 8 }}
          />
          <Legend />
          <ReferenceLine y={0} stroke="rgba(97, 84, 62, 0.32)" />
          {typeof averageMonthlyProfitMinor === 'number' && averageMonthlyProfitMinor > 0 ? (
            <ReferenceLine
              y={averageMonthlyProfitMinor}
              stroke="#2d6b59"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={{
                value: 'Avg monthly',
                position: 'insideTopRight',
                fill: '#2d6b59',
                fontSize: 12,
              }}
            />
          ) : null}
          <Bar
            dataKey="interestCollectedMinor"
            name="Interest collected"
            fill="#2d6b59"
            stackId="profit"
            isAnimationActive={false}
          />
          <Bar
            dataKey="penaltyCollectedMinor"
            name="Penalty collected"
            fill="#b96d2a"
            stackId="profit"
            isAnimationActive={false}
          />
          <Bar
            dataKey="excessProfitMinor"
            name="Excess profit"
            fill="#76518f"
            stackId="profit"
            isAnimationActive={false}
          />
          <Bar
            dataKey="treasuryInterestEarnedMinor"
            name="Treasury interest"
            fill="#3f7f8c"
            stackId="profit"
            radius={[8, 8, 0, 0]}
            isAnimationActive={false}
          />
          {showInterestDue ? (
            <Line
              dataKey="interestDueMinor"
              name="Interest due"
              type="monotone"
              stroke="#7f5a2f"
              strokeDasharray="6 4"
              strokeWidth={2}
              dot={{ fill: '#7f5a2f', r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          ) : null}
          <Line
            dataKey="totalProfitMinor"
            name="Total profit"
            type="monotone"
            stroke="#17140f"
            strokeWidth={2.5}
            dot={{ fill: '#17140f', r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  )
}
