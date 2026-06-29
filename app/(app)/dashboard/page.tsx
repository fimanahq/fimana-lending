import { DashboardOverview, buildDashboardOverviewData, getManilaCalendarPeriod, type DashboardDataSource } from '@/modules/dashboard'
import { authorizedBackendRequestWithCurrentAccess } from '@/lib/server/backend'
import type { DashboardMonthlyProfitResponse, LoanApplication, LoanDashboardSummary } from '@/lib/types/lending'

export default async function DashboardPage() {
  const { year } = getManilaCalendarPeriod()
  const [summaryResult, applicationResult, monthlyProfitResult] = await Promise.allSettled([
    authorizedBackendRequestWithCurrentAccess<LoanDashboardSummary>('/loans/dashboard-summary'),
    authorizedBackendRequestWithCurrentAccess<LoanApplication[]>('/loan-applications/applications'),
    authorizedBackendRequestWithCurrentAccess<DashboardMonthlyProfitResponse>(
      `/loans/dashboard/profit-by-month?year=${year}`,
    ),
  ])

  const failedSources: DashboardDataSource[] = []

  if (summaryResult.status === 'rejected') {
    failedSources.push('summary')
  }

  if (applicationResult.status === 'rejected') {
    failedSources.push('applications')
  }

  if (monthlyProfitResult.status === 'rejected') {
    failedSources.push('monthlyProfit')
  }

  const data = buildDashboardOverviewData({
    summary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
    applications: applicationResult.status === 'fulfilled' ? applicationResult.value : [],
    monthlyProfit: monthlyProfitResult.status === 'fulfilled' ? monthlyProfitResult.value : null,
    failedSources,
  })

  return <DashboardOverview data={data} />
}
