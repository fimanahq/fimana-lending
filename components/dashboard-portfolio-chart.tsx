'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/format'
import type { DashboardProgressSegment } from '@/components/dashboard-overview-data'

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
    default:
      return '#b96d2a'
  }
}

export function DashboardPortfolioChart({
  caption,
  centerKicker,
  centerSubvalue,
  centerValue,
  currency,
  segments,
}: {
  caption: string
  centerKicker: string
  centerSubvalue: string
  centerValue: number
  currency: string
  segments: DashboardProgressSegment[]
}) {
  const ariaLabel = segments
    .map((segment) => `${segment.label}: ${segment.percentage.toFixed(2)}%, ${formatCurrency(segment.value, currency)}`)
    .join('. ')

  return (
    <figure className="dashboard-overview__progressChartPanel" aria-label={ariaLabel}>
      <div className="dashboard-overview__progressChartCanvas">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
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
                return formatCurrency(normalizedValue, currency)
              }}
              contentStyle={tooltipContentStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
              wrapperStyle={tooltipWrapperStyle}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="dashboard-overview__progressChartCenter" aria-hidden="true">
          <span className="dashboard-overview__progressChartKicker">{centerKicker}</span>
          <strong>{formatCurrency(centerValue, currency)}</strong>
          <span>{centerSubvalue}</span>
        </div>
      </div>

      <figcaption className="dashboard-overview__progressCaption">
        {caption}
      </figcaption>
    </figure>
  )
}
