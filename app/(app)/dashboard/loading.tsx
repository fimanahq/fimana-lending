'use client'

import { useSyncExternalStore } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardKpiCards } from '@/components/dashboard/dashboard-kpi-cards'
import { DashboardLoadingSpinner } from '@/components/dashboard/dashboard-loading-spinner'
import { getCachedDashboardKpis, subscribeDashboardKpis } from '@/lib/dashboard-kpi-cache'
import { classNames } from '@/utils/class-names'
import dashboardStyles from '@/components/dashboard/dashboard.module.css'
import { getDashboardClass } from '@/components/dashboard/dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="ui-skeleton" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className="ui-skeleton__line" />
      ))}
    </div>
  )
}

export default function DashboardLoading() {
  const { user } = useAuth()
  const cached = useSyncExternalStore(
    subscribeDashboardKpis,
    () => getCachedDashboardKpis(user?.id ?? null),
    () => null,
  )

  if (cached) {
    return (
      <div className={classNames('stack', dashboardClass('dashboard-overview'))}>
        <DashboardKpiCards summary={cached} pendingReviewCount={<DashboardLoadingSpinner label="Loading pending reviews" />} />
        <div className={dashboardClass('dashboard-overview__deferredBlock', 'dashboard-overview__loadingPlaceholder')}><DashboardLoadingSpinner label="Loading lending details" /></div>
      </div>
    )
  }

  return (
    <div className={classNames('stack', dashboardClass('dashboard-overview', 'dashboard-overview--loading'))} aria-busy="true" aria-live="polite">
      <section className={dashboardClass('dashboard-overview__executive')}>
        <section className={dashboardClass('dashboard-overview__kpiGrid')}>
          {Array.from({ length: 7 }).map((_, index) => (
            <article
              key={index}
              className={dashboardClass(
                'dashboard-overview__statCard',
                index === 2
                  ? 'dashboard-overview__statCard--sage'
                  : index === 3
                    ? 'dashboard-overview__statCard--ink'
                    : 'dashboard-overview__statCard--plain',
              )}
            >
              <SkeletonLines />
            </article>
          ))}
        </section>

        <section className={dashboardClass('dashboard-overview__contentGrid')}>
          <div className={dashboardClass('dashboard-overview__mainColumn')}>
            <article className={dashboardClass('dashboard-overview__progressCard')}>
              <SkeletonLines count={5} />
            </article>
            <article className={dashboardClass('dashboard-overview__progressCard')}>
              <SkeletonLines count={5} />
            </article>
            <article className={dashboardClass('dashboard-overview__tableCard')}>
              <SkeletonLines count={6} />
            </article>
          </div>
        </section>
      </section>
    </div>
  )
}
