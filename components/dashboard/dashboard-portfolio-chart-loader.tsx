'use client'

import { useEffect, useState } from 'react'
import { DashboardPortfolioChart, type DashboardPortfolioChartProps } from './dashboard-portfolio-chart'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

function DashboardPortfolioChartFallback() {
  return (
    <div className={dashboardClass('dashboard-overview__progressChartPanel', 'dashboard-overview__deferredBlock')}>
      <div className="ui-skeleton" aria-hidden="true">
        <span className="ui-skeleton__line" />
        <span className="ui-skeleton__line" />
        <span className="ui-skeleton__line" />
      </div>
    </div>
  )
}

export function DashboardPortfolioChartLoader(props: DashboardPortfolioChartProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <DashboardPortfolioChartFallback />
  }

  return <DashboardPortfolioChart {...props} />
}
