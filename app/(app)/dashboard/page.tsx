import { DashboardOverview, buildDashboardOverviewData, type DashboardDataSource } from '@/modules/dashboard'
import { authorizedBackendRequest } from '@/lib/server/backend'
import type { Loan, LoanApplication, UpcomingLoanReminder } from '@/lib/types'

export default async function DashboardPage() {
  const [loanResult, applicationResult, reminderResult] = await Promise.allSettled([
    authorizedBackendRequest<Loan[]>('/lendings'),
    authorizedBackendRequest<LoanApplication[]>('/loan-applications'),
    authorizedBackendRequest<UpcomingLoanReminder[]>('/lendings/reminders/upcoming'),
  ])

  const failedSources: DashboardDataSource[] = []

  if (loanResult.status === 'rejected') {
    failedSources.push('loans')
  }

  if (applicationResult.status === 'rejected') {
    failedSources.push('applications')
  }

  if (reminderResult.status === 'rejected') {
    failedSources.push('reminders')
  }

  const data = buildDashboardOverviewData({
    loans: loanResult.status === 'fulfilled' ? loanResult.value : [],
    applications: applicationResult.status === 'fulfilled' ? applicationResult.value : [],
    reminders: reminderResult.status === 'fulfilled' ? reminderResult.value : [],
    failedSources,
  })

  return <DashboardOverview data={data} />
}
