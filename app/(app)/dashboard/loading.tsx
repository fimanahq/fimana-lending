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
  return (
    <div className={classNames('stack', dashboardClass('dashboard-overview', 'dashboard-overview--loading'))} aria-busy="true" aria-live="polite">
      <section className={dashboardClass('dashboard-overview__executive')}>
        <section className={dashboardClass('dashboard-overview__kpiGrid', 'dashboard-overview__kpiGrid--six')}>
          {Array.from({ length: 6 }).map((_, index) => (
            <article
              key={index}
              className={dashboardClass(
                'dashboard-overview__statCard',
                index === 1
                  ? 'dashboard-overview__statCard--sage'
                  : index === 2
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
