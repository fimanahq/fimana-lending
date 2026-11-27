import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

export function DashboardKpiSkeleton() {
  return (
    <section className={dashboardClass('dashboard-overview__executive')} aria-busy="true" aria-label="Loading dashboard figures">
      <div className={dashboardClass('dashboard-overview__kpiGrid')}>
        {Array.from({ length: 7 }, (_, index) => (
          <article
            key={index}
            className={dashboardClass(
              'dashboard-overview__statCard',
              index === 3 ? 'dashboard-overview__statCard--ink' : 'dashboard-overview__statCard--tinted',
            )}
          >
            <div className="ui-skeleton" aria-hidden="true">
              <span className="ui-skeleton__line" />
              <span className="ui-skeleton__line" />
              <span className="ui-skeleton__line" />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
