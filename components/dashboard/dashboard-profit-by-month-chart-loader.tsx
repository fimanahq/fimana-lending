'use client'

import { useEffect, useState } from 'react'
import { DashboardProfitByMonthChart, type DashboardProfitByMonthChartProps } from './dashboard-profit-by-month-chart'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

function DashboardProfitByMonthChartFallback() {
  return (
    <figure
      className={dashboardClass('dashboard-overview__interestChart', 'dashboard-overview__deferredBlock')}
      aria-label="Loading monthly collected profit chart"
    >
      <div className="ui-skeleton" aria-hidden="true">
        <span className="ui-skeleton__line" />
        <span className="ui-skeleton__line" />
        <span className="ui-skeleton__line" />
      </div>
    </figure>
  )
}

export function DashboardProfitByMonthChartLoader(props: DashboardProfitByMonthChartProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <DashboardProfitByMonthChartFallback />
  }

  return <DashboardProfitByMonthChart {...props} />
}
