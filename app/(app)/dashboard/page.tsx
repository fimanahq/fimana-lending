import { DashboardOverview, buildDashboardOverviewData, type DashboardDataSource } from '@/modules/dashboard'
import { authorizedBackendRequestWithCurrentAccess } from '@/lib/server/backend'
import type { DashboardApplicationOverview, LoanDashboardSummary } from '@/lib/types/lending'

export default async function DashboardPage() {
  const [summaryResult, applicationResult] = await Promise.allSettled([
    authorizedBackendRequestWithCurrentAccess<LoanDashboardSummary>('/loans/dashboard-summary'),
    authorizedBackendRequestWithCurrentAccess<DashboardApplicationOverview>('/loan-applications/dashboard-overview'),
  ])

  const failedSources: DashboardDataSource[] = []

  if (summaryResult.status === 'rejected') {
    failedSources.push('summary')
  }

  if (applicationResult.status === 'rejected') {
    failedSources.push('applications')
  }

  const data = buildDashboardOverviewData({
    summary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
    applicationOverview: applicationResult.status === 'fulfilled' ? applicationResult.value : null,
    failedSources,
  })

  return <DashboardOverview data={data} />
}
