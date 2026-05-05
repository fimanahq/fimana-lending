import { DashboardOverview, buildDashboardOverviewData, type DashboardDataSource } from '@/modules/dashboard'
import { authorizedBackendRequest } from '@/lib/server/backend'
import type { LoanApplication, LoanDashboardSummary, UpcomingLoanReminder } from '@/lib/types'

export default async function DashboardPage() {
  const [summaryResult, applicationResult, reminderResult] = await Promise.allSettled([
    authorizedBackendRequest<LoanDashboardSummary>('/loans/dashboard-summary'),
    authorizedBackendRequest<LoanApplication[]>('/loan-applications/applications'),
    authorizedBackendRequest<UpcomingLoanReminder[]>('/loans/reminders/upcoming'),
  ])

  const failedSources: DashboardDataSource[] = []

  if (summaryResult.status === 'rejected') {
    failedSources.push('summary')
  }

  if (applicationResult.status === 'rejected') {
    failedSources.push('applications')
  }

  if (reminderResult.status === 'rejected') {
    failedSources.push('reminders')
  }

  const data = buildDashboardOverviewData({
    summary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
    applications: applicationResult.status === 'fulfilled' ? applicationResult.value : [],
    reminders: reminderResult.status === 'fulfilled' ? reminderResult.value : [],
    failedSources,
  })

  return <DashboardOverview data={data} />
}
