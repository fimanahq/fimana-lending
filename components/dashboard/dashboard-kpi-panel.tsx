'use client'

import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { getCachedDashboardKpis, saveDashboardKpis, subscribeDashboardKpis } from '@/lib/dashboard-kpi-cache'
import type { DashboardKpis } from '@/lib/types/lending'
import { DashboardKpiCards } from './dashboard-kpi-cards'
import { DashboardKpiSkeleton } from './dashboard-kpi-skeleton'
import { DashboardLoadingSpinner } from './dashboard-loading-spinner'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

function useCachedKpis() {
  const { user } = useAuth()
  const cached = useSyncExternalStore(
    subscribeDashboardKpis,
    () => getCachedDashboardKpis(user?.id ?? null),
    () => null,
  )
  return { cached, userId: user?.id ?? null }
}

export function DashboardKpiFallback() {
  const { cached } = useCachedKpis()
  return cached ? (
    <>
      <DashboardKpiCards summary={cached} pendingReviewCount={<DashboardLoadingSpinner label="Loading pending reviews" />} />
      <p className={dashboardClass('dashboard-overview__refreshStatus')}><DashboardLoadingSpinner label="Refreshing dashboard figures" /></p>
    </>
  ) : <DashboardKpiSkeleton />
}

export function DashboardKpiPanel({
  cacheUserId,
  kpis,
  pendingReviewCount,
}: {
  cacheUserId: string | null
  kpis: DashboardKpis | null
  pendingReviewCount: ReactNode
}) {
  useEffect(() => {
    if (kpis && cacheUserId) {
      saveDashboardKpis(cacheUserId, kpis)
    }
  }, [cacheUserId, kpis])

  if (!kpis) {
    return (
      <section className={dashboardClass('dashboard-overview__executive')} role="alert">
        <div className="notice">Dashboard figures could not be loaded. Reload the page to try again.</div>
      </section>
    )
  }

  return <DashboardKpiCards summary={kpis} pendingReviewCount={pendingReviewCount} />
}
