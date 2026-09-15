'use client'

import { useEffect, useState } from 'react'
import {
  DashboardProfitByMonthChart,
  type DashboardProfitByMonthChartProps,
} from './dashboard-profit-by-month-chart'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

function DashboardProfitByMonthChartFallback({ variant = 'profit' }: Pick<DashboardProfitByMonthChartProps, 'variant'>) {
  const isReceivablesChart = variant === 'receivables'

  return (
    <div className={dashboardClass('dashboard-overview__interestChartFrame')}>
      <div className={dashboardClass('dashboard-overview__interestChartToolbar')} aria-hidden="true">
        <div className={dashboardClass('dashboard-overview__interestChartToolbarCopy')}>
          <strong>{isReceivablesChart ? 'Expected and actual preview' : 'Gross and net profit preview'}</strong>
          <span>Loading full chart controls</span>
        </div>
        <span className={dashboardClass('dashboard-overview__interestChartToolbarPlaceholder')} />
      </div>
      <div className={dashboardClass('dashboard-overview__interestChartLegendPlaceholder')} aria-hidden="true">
        <span />
        <span />
      </div>
      <figure
        className={dashboardClass('dashboard-overview__interestChart', 'dashboard-overview__deferredBlock')}
        aria-label={`Loading monthly ${isReceivablesChart ? 'receivables' : 'collected profit'} chart`}
      >
        <div className="ui-skeleton" aria-hidden="true">
          <span className="ui-skeleton__line" />
          <span className="ui-skeleton__line" />
          <span className="ui-skeleton__line" />
        </div>
      </figure>
    </div>
  )
}

export function DashboardProfitByMonthChartLoader(props: DashboardProfitByMonthChartProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <DashboardProfitByMonthChartFallback variant={props.variant} />
  }

  return <DashboardProfitByMonthChart {...props} />
}
