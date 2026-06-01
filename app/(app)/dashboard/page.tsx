import { DashboardOverview, buildDashboardOverviewData, type DashboardDataSource } from '@/modules/dashboard'
import { authorizedBackendRequest } from '@/lib/server/backend'
import type { LoanApplication, LoanDashboardSummary } from '@/lib/types/lending'

export default async function DashboardPage() {
  const [summaryResult, applicationResult] = await Promise.allSettled([
    authorizedBackendRequest<LoanDashboardSummary>('/loans/dashboard-summary'),
    authorizedBackendRequest<LoanApplication[]>('/loan-applications/applications'),
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
    applications: applicationResult.status === 'fulfilled' ? applicationResult.value : [],
    failedSources,
  })

  return <DashboardOverview data={data} />
}
