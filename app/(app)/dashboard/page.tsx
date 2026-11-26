import { DashboardOverview, buildDashboardOverviewData, type DashboardDataSource } from '@/modules/dashboard'
import { authorizedBackendRequestWithCurrentAccess } from '@/lib/server/backend'
import type { DashboardApplicationOverview, LoanDashboardSummary } from '@/lib/types/lending'

export default async function DashboardPage() {
  const applicationOverview = authorizedBackendRequestWithCurrentAccess<DashboardApplicationOverview>(
    '/loan-applications/dashboard-overview',
  ).catch(() => null)
  const summary = await authorizedBackendRequestWithCurrentAccess<LoanDashboardSummary>(
    '/loans/dashboard-summary',
  ).catch(() => null)
  const failedSources: DashboardDataSource[] = summary ? [] : ['summary']

  const data = buildDashboardOverviewData({
    summary,
    failedSources,
  })

  return <DashboardOverview data={data} applicationOverview={applicationOverview} />
}
