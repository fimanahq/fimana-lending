'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { Button } from '@/components/shared'
import { formatCurrency } from '@/lib/format'
import type { DashboardMonthlyProfitRow } from '@/lib/types/lending'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)
const COMPACT_CHART_MEDIA_QUERY = '(max-width: 980px)'
const FOCUSABLE_ELEMENT_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type ChartLegendItem = {
  color: string
  label: string
  style: 'bar' | 'line' | 'line-dashed'
}

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>
}

const compactLegendItems: ChartLegendItem[] = [
  { color: '#2d6b59', label: 'Gross profit', style: 'bar' },
  { color: '#17140f', label: 'Net profit', style: 'line' },
]

const detailedLegendItems: ChartLegendItem[] = [
  { color: '#2d6b59', label: 'Interest collected', style: 'bar' },
  { color: '#b96d2a', label: 'Penalty collected', style: 'bar' },
  { color: '#76518f', label: 'Excess profit', style: 'bar' },
  { color: '#3f7f8c', label: 'Treasury interest', style: 'bar' },
  { color: '#7f5a2f', label: 'Interest due', style: 'line-dashed' },
  { color: '#17140f', label: 'Net profit', style: 'line' },
]

const tooltipContentStyle: CSSProperties = {
  border: '1px solid rgba(97, 84, 62, 0.14)',
  borderRadius: '18px',
  backgroundColor: 'rgba(255, 252, 245, 0.96)',
  boxShadow: '0 18px 30px rgba(29, 28, 18, 0.08)',
  minWidth: '15rem',
  padding: '0.75rem',
}

const tooltipTitleStyle: CSSProperties = {
  color: '#17140f',
  fontSize: '0.85rem',
  fontWeight: 700,
  margin: '0 0 0.5rem',
}

const tooltipListStyle: CSSProperties = {
  display: 'grid',
  gap: '0.35rem',
  margin: 0,
}

const tooltipRowStyle: CSSProperties = {
  alignItems: 'baseline',
  display: 'flex',
  gap: '1rem',
  justifyContent: 'space-between',
}

const tooltipTotalRowStyle: CSSProperties = {
  ...tooltipRowStyle,
  borderTop: '1px solid rgba(97, 84, 62, 0.12)',
  marginTop: '0.2rem',
  paddingTop: '0.45rem',
}

const tooltipLabelStyle: CSSProperties = {
  color: '#6f6656',
  fontSize: '0.78rem',
}

const tooltipValueStyle: CSSProperties = {
  color: '#17140f',
  fontSize: '0.82rem',
  fontWeight: 700,
  whiteSpace: 'nowrap',
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

type ProfitGrowthTooltipProps = TooltipContentProps & {
  compact: boolean
  currency: string
  showInterestDue: boolean
}

function ProfitGrowthTooltip({
  active,
  compact,
  currency,
  payload,
  showInterestDue,
}: ProfitGrowthTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const row = payload[0]?.payload as DashboardMonthlyProfitRow | undefined

  if (!row) {
    return null
  }

  const rewardExpenseMinor = row.rewardExpenseMinor ?? 0
  const businessExpenseMinor = row.businessExpenseMinor ?? 0
  const netProfitMinor = row.netProfitMinor ?? row.totalProfitMinor

  const renderRow = (label: string, valueMinor: number, style: CSSProperties = tooltipRowStyle) => (
    <div style={style}>
      <span style={tooltipLabelStyle}>{label}</span>
      <strong style={tooltipValueStyle}>{formatMinorCurrency(valueMinor, currency)}</strong>
    </div>
  )

  if (compact) {
    return (
      <div style={tooltipContentStyle}>
        <p style={tooltipTitleStyle}>{row.monthLabel}</p>
        <div style={tooltipListStyle}>
          {renderRow('Gross profit', row.totalProfitMinor)}
          {renderRow('Net profit', netProfitMinor, tooltipTotalRowStyle)}
        </div>
      </div>
    )
  }

  return (
    <div style={tooltipContentStyle}>
      <p style={tooltipTitleStyle}>{row.monthLabel}</p>
      <div style={tooltipListStyle}>
        {renderRow('Interest collected', row.interestCollectedMinor)}
        {renderRow('Penalty collected', row.penaltyCollectedMinor)}
        {renderRow('Excess profit', row.excessProfitMinor ?? 0)}
        {renderRow('Treasury interest', row.treasuryInterestEarnedMinor ?? 0)}
        {renderRow('Gross profit', row.totalProfitMinor, tooltipTotalRowStyle)}
        {renderRow('Reward expenses', rewardExpenseMinor)}
        {renderRow('Business expenses', businessExpenseMinor)}
        {renderRow('Net profit', netProfitMinor, tooltipTotalRowStyle)}
        {showInterestDue ? renderRow('Interest due', row.interestDueMinor) : null}
      </div>
    </div>
  )
}

function ProfitChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <ul className={dashboardClass('dashboard-overview__interestChartLegend')} aria-label="Chart legend">
      {items.map((item) => (
        <li key={item.label} className={dashboardClass('dashboard-overview__interestChartLegendItem')}>
          <span
            className={dashboardClass(
              'dashboard-overview__interestChartLegendSwatch',
              `dashboard-overview__interestChartLegendSwatch--${item.style}`,
            )}
            style={{ color: item.color }}
            aria-hidden="true"
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

function getCompactChartPreference() {
  return typeof window !== 'undefined' && window.matchMedia(COMPACT_CHART_MEDIA_QUERY).matches
}

export type DashboardProfitByMonthChartProps = {
  averageMonthlyProfitMinor?: number
  currency: string
  rows: DashboardMonthlyProfitRow[]
  showInterestDue?: boolean
}

export function DashboardProfitByMonthChart({
  averageMonthlyProfitMinor,
  currency,
  rows,
  showInterestDue = true,
}: DashboardProfitByMonthChartProps) {
  const [isCompactViewport, setIsCompactViewport] = useState(getCompactChartPreference)
  const [isExpanded, setIsExpanded] = useState(false)
  const chartFrameRef = useRef<HTMLDivElement>(null)
  const chartViewerId = useId()
  const chartViewerTitleId = `${chartViewerId}-title`
  const fullscreenButtonId = `${chartViewerId}-fullscreen-toggle`
  const isCompact = isCompactViewport && !isExpanded

  const restoreCollapsedChart = useCallback(() => {
    setIsExpanded(false)

    if (typeof screen !== 'undefined') {
      try {
        screen.orientation?.unlock()
      } catch {
        // Orientation unlocking is best-effort and unavailable in some mobile browsers.
      }
    }

    requestAnimationFrame(() => {
      document.getElementById(fullscreenButtonId)?.focus()
    })
  }, [fullscreenButtonId])

  const closeExpandedChart = useCallback(async () => {
    if (document.fullscreenElement === chartFrameRef.current) {
      try {
        await document.exitFullscreen()
      } catch {
        // The CSS full-viewport fallback can still close when native fullscreen exit fails.
      }
    }

    restoreCollapsedChart()
  }, [restoreCollapsedChart])

  const openExpandedChart = useCallback(async () => {
    setIsExpanded(true)

    const chartFrame = chartFrameRef.current

    if (chartFrame?.requestFullscreen && !document.fullscreenElement) {
      try {
        await chartFrame.requestFullscreen()
      } catch {
        // Keep the CSS full-viewport fallback active when native fullscreen is unavailable.
      }
    }

    if (typeof screen !== 'undefined') {
      const orientation = screen.orientation as LockableScreenOrientation | undefined

      try {
        await orientation?.lock?.('landscape')
      } catch {
        // The portrait rotate-device prompt remains visible when landscape locking is unavailable.
      }
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_CHART_MEDIA_QUERY)
    const syncCompactViewport = () => setIsCompactViewport(mediaQuery.matches)

    syncCompactViewport()
    mediaQuery.addEventListener('change', syncCompactViewport)

    return () => mediaQuery.removeEventListener('change', syncCompactViewport)
  }, [])

  useEffect(() => {
    if (!isExpanded) {
      return
    }

    const previousBodyOverflow = document.body.style.overflow
    const focusFirstViewerControl = () => {
      const firstFocusableElement = chartFrameRef.current?.querySelector<HTMLElement>(FOCUSABLE_ELEMENT_SELECTOR)

      firstFocusableElement?.focus()
    }
    const handleFullscreenChange = () => {
      if (document.fullscreenElement !== chartFrameRef.current) {
        restoreCollapsedChart()
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        void closeExpandedChart()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const chartFrame = chartFrameRef.current
      const focusableElements = chartFrame
        ? Array.from(chartFrame.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENT_SELECTOR))
        : []

      if (!chartFrame || focusableElements.length === 0) {
        return
      }

      const firstFocusableElement = focusableElements[0]
      const lastFocusableElement = focusableElements.at(-1)
      const activeElement = document.activeElement

      if (event.shiftKey && (activeElement === firstFocusableElement || !chartFrame.contains(activeElement))) {
        event.preventDefault()
        lastFocusableElement?.focus()
      } else if (!event.shiftKey && (activeElement === lastFocusableElement || !chartFrame.contains(activeElement))) {
        event.preventDefault()
        firstFocusableElement.focus()
      }
    }
    const handleFocusIn = (event: FocusEvent) => {
      if (!chartFrameRef.current?.contains(event.target as Node)) {
        focusFirstViewerControl()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)
    requestAnimationFrame(focusFirstViewerControl)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)

      if (typeof screen !== 'undefined') {
        try {
          screen.orientation?.unlock()
        } catch {
          // Orientation unlocking is best-effort and unavailable in some mobile browsers.
        }
      }
    }
  }, [closeExpandedChart, fullscreenButtonId, isExpanded, restoreCollapsedChart])

  const ariaLabel = rows.map((row) => {
    const netProfit = formatMinorCurrency(row.netProfitMinor ?? row.totalProfitMinor, currency)

    if (isCompact) {
      return `${row.monthLabel}: ${formatMinorCurrency(row.totalProfitMinor, currency)} gross profit, ${netProfit} net profit`
    }

    return `${row.monthLabel}: ${showInterestDue ? `${formatMinorCurrency(row.interestDueMinor, currency)} interest due, ` : ''}${formatMinorCurrency(row.interestCollectedMinor, currency)} interest collected, ${formatMinorCurrency(row.penaltyCollectedMinor, currency)} penalties, ${formatMinorCurrency(row.excessProfitMinor ?? 0, currency)} excess profit, ${formatMinorCurrency(row.treasuryInterestEarnedMinor ?? 0, currency)} Treasury interest, ${formatMinorCurrency(row.rewardExpenseMinor ?? 0, currency)} reward expenses, ${formatMinorCurrency(row.businessExpenseMinor ?? 0, currency)} business expenses, ${netProfit} net profit`
  }).join('. ')

  const legendItems = isCompact
    ? compactLegendItems
    : detailedLegendItems.filter((item) => showInterestDue || item.label !== 'Interest due')

  return (
    <div
      ref={chartFrameRef}
      id={chartViewerId}
      className={dashboardClass(
        'dashboard-overview__interestChartFrame',
        isExpanded && 'dashboard-overview__interestChartFrame--expanded',
      )}
      role={isExpanded ? 'dialog' : undefined}
      aria-modal={isExpanded ? 'true' : undefined}
      aria-labelledby={isExpanded ? chartViewerTitleId : undefined}
    >
      <div className={dashboardClass('dashboard-overview__interestChartToolbar')}>
        <div className={dashboardClass('dashboard-overview__interestChartToolbarCopy')}>
          <strong id={chartViewerTitleId}>
            {isExpanded ? 'Monthly collected profit' : 'Gross and net profit preview'}
          </strong>
          <span>
            {isExpanded ? 'Full monthly profit breakdown' : 'Open the full chart for every profit source'}
          </span>
        </div>
        <Button
          id={fullscreenButtonId}
          variant="secondary"
          size="sm"
          className={dashboardClass('dashboard-overview__interestChartFullscreenButton')}
          aria-controls={chartViewerId}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Exit full-screen profit chart' : 'View profit chart full screen'}
          onClick={isExpanded ? () => void closeExpandedChart() : () => void openExpandedChart()}
        >
          {isExpanded ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
        </Button>
      </div>
      <p
        className={dashboardClass('dashboard-overview__interestChartRotateHint')}
        role="status"
      >
        Rotate your device to landscape for the best chart view.
      </p>
      <ProfitChartLegend items={legendItems} />
      <figure
        className={dashboardClass('dashboard-overview__interestChart')}
        aria-label={ariaLabel}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 18, bottom: 8, left: 6 }}>
            <CartesianGrid stroke="rgba(97, 84, 62, 0.12)" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              interval={isCompact ? 1 : 0}
              tickLine={false}
              axisLine={{ stroke: 'rgba(97, 84, 62, 0.16)' }}
            />
            <YAxis
              tickFormatter={(value) => formatCompactMinorCurrency(Number(value), currency)}
              tickLine={false}
              axisLine={false}
              width={isCompact ? 60 : 78}
            />
            <Tooltip
              content={(props) => (
                <ProfitGrowthTooltip
                  {...props}
                  compact={isCompact}
                  currency={currency}
                  showInterestDue={showInterestDue}
                />
              )}
              wrapperStyle={{ zIndex: 8 }}
            />
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
            {isCompact ? (
              <Bar
                dataKey="totalProfitMinor"
                name="Gross profit"
                fill="#2d6b59"
                radius={[8, 8, 0, 0]}
                isAnimationActive={false}
              />
            ) : (
              <>
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
              </>
            )}
            <Line
              dataKey="netProfitMinor"
              name="Net profit"
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
    </div>
  )
}
