import { DashboardOverview, buildDashboardOverviewData, type DashboardDataSource } from '@/modules/dashboard'
import { authorizedBackendRequest } from '@/lib/server/backend'
import type { Loan, LoanRequest, UpcomingLoanReminder } from '@/lib/types'

export default async function DashboardPage() {
  const [loanResult, requestResult, reminderResult] = await Promise.allSettled([
    authorizedBackendRequest<Loan[]>('/lendings'),
    authorizedBackendRequest<LoanRequest[]>('/loan-requests'),
    authorizedBackendRequest<UpcomingLoanReminder[]>('/lendings/reminders/upcoming'),
  ])

  const failedSources: DashboardDataSource[] = []

  if (loanResult.status === 'rejected') {
    failedSources.push('loans')
  }

  if (requestResult.status === 'rejected') {
    failedSources.push('requests')
  }

  if (reminderResult.status === 'rejected') {
    failedSources.push('reminders')
  }

  const data = buildDashboardOverviewData({
    loans: loanResult.status === 'fulfilled' ? loanResult.value : [],
    requests: requestResult.status === 'fulfilled' ? requestResult.value : [],
    reminders: reminderResult.status === 'fulfilled' ? reminderResult.value : [],
    failedSources,
  })

  return <DashboardOverview data={data} />
}
