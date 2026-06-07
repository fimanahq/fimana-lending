'use client'

import { useEffect, useRef, useState } from 'react'
import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/format'
import type { DashboardProgressSegment } from '@/components/dashboard/dashboard-overview-data'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

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

function getProgressToneColor(tone: DashboardProgressSegment['tone']) {
  switch (tone) {
    case 'green':
      return '#2d6b59'
    case 'amber':
      return '#b96d2a'
    case 'olive':
      return '#5f7153'
    case 'red':
      return '#8f3326'
    default:
      return '#b96d2a'
  }
}

export function DashboardPortfolioChart({
  caption,
  centerKicker,
  centerSubvalue,
  centerValue,
  centerValueMinor,
  currency,
  segments,
}: {
  caption: string
  centerKicker: string
  centerSubvalue: string
  centerValue?: string
  centerValueMinor: number
  currency: string
  segments: DashboardProgressSegment[]
}) {
  const ariaLabel = segments
    .map((segment) => `${segment.label}: ${segment.percentage.toFixed(2)}%, ${formatCurrency(segment.valueMinor / 100, currency)}`)
    .join('. ')
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const updateSize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      setChartSize({
        width: Math.max(0, Math.floor(width)),
        height: Math.max(0, Math.floor(height)),
      })
    }

    updateSize()

    const resizeObserver = new ResizeObserver(() => {
      updateSize()
    })

    resizeObserver.observe(canvas)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <figure className={dashboardClass('dashboard-overview__progressChartPanel')} aria-label={ariaLabel}>
      <div ref={canvasRef} className={dashboardClass('dashboard-overview__progressChartCanvas')}>
        {chartSize.width > 0 && chartSize.height > 0 ? (
          <PieChart width={chartSize.width} height={chartSize.height}>
            <Pie
              data={segments}
              dataKey="valueMinor"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="85%"
              outerRadius="100%"
              paddingAngle={2}
              cornerRadius={10}
              stroke="none"
              isAnimationActive={false}
            >
              {segments.map((segment) => (
                <Cell key={segment.key} fill={getProgressToneColor(segment.tone)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => {
                const normalizedValue = Array.isArray(value) ? Number(value[0] || 0) : Number(value || 0)
                return formatCurrency(normalizedValue / 100, currency)
              }}
              contentStyle={tooltipContentStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
              wrapperStyle={tooltipWrapperStyle}
            />
          </PieChart>
        ) : null}

        <div className={dashboardClass('dashboard-overview__progressChartCenter')} aria-hidden="true">
          <span className={dashboardClass('dashboard-overview__progressChartKicker')}>{centerKicker}</span>
          <strong>{centerValue ?? formatCurrency(centerValueMinor / 100, currency)}</strong>
          <span>{centerSubvalue}</span>
        </div>
      </div>

      <figcaption className={dashboardClass('dashboard-overview__progressCaption')}>
        {caption}
      </figcaption>
    </figure>
  )
}
