import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

export function DashboardLoadingSpinner({ label }: { label: string }) {
  return (
    <span className={getDashboardClass(dashboardStyles, 'dashboard-overview__loadingSpinner')} role="status" aria-label={label}>
      <span className="state-card__spinner" aria-hidden="true" />
    </span>
  )
}
