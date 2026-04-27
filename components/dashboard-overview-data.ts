import type { Loan, LoanApplication, UpcomingLoanReminder } from '@/lib/types'

export type DashboardDataSource = 'loans' | 'applications' | 'reminders'

export interface DashboardSummaryMetrics {
  profitCollected: number
  totalProfitBooked: number
  capitalOutstanding: number
  recoveredPrincipal: number
  remainingProjectedInterest: number
  totalProjectedValue: number
  totalIssuedPrincipal: number
  activeLoans: number
  pendingReviews: number
}

export interface DashboardProgressSegment {
  key: 'recovered_principal' | 'capital_outstanding' | 'remaining_projected_interest'
  label: string
  description: string
  value: number
  percentage: number
  tone: 'green' | 'amber' | 'olive'
}

export interface DashboardOverviewData {
  summary: DashboardSummaryMetrics
  progressSegments: DashboardProgressSegment[]
  recentApplications: LoanApplication[]
  dueSoon: UpcomingLoanReminder[]
  partialFailureNotice: string | null
}

interface BuildDashboardOverviewDataInput {
  loans: Loan[]
  applications: LoanApplication[]
  reminders: UpcomingLoanReminder[]
  failedSources?: DashboardDataSource[]
}

const FAILED_SOURCE_LABELS: Record<DashboardDataSource, string> = {
  loans: 'loans',
  applications: 'loan applications',
  reminders: 'upcoming reminders',
}

function formatFailedSources(failedSources: DashboardDataSource[]) {
  const labels = failedSources.map((source) => FAILED_SOURCE_LABELS[source])
  return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(labels)
}

function buildPartialFailureNotice(failedSources: DashboardDataSource[]) {
  if (failedSources.length === 0) {
    return null
  }

  return `Showing available dashboard data. Unable to load ${formatFailedSources(failedSources)}.`
}

export function buildDashboardOverviewData({
  loans,
  applications,
  reminders,
  failedSources = [],
}: BuildDashboardOverviewDataInput): DashboardOverviewData {
  const nonCancelledLoans = loans.filter((loan) => loan.status !== 'cancelled')
  const activeLoans = nonCancelledLoans.filter((loan) => loan.status === 'active')

  const profitCollected = loans.reduce((sum, loan) => {
    return sum + loan.installments.reduce((installmentSum, installment) => {
      return installment.status === 'paid' ? installmentSum + installment.interest : installmentSum
    }, 0)
  }, 0)

  const totalProfitBooked = nonCancelledLoans.reduce((sum, loan) => sum + loan.totalInterest, 0)

  const capitalOutstanding = activeLoans.reduce((sum, loan) => {
    return sum + loan.installments.reduce((installmentSum, installment) => {
      return installment.status !== 'paid' ? installmentSum + installment.principalPaid : installmentSum
    }, 0)
  }, 0)

  const totalIssuedPrincipal = nonCancelledLoans.reduce((sum, loan) => sum + loan.principal, 0)
  const recoveredPrincipal = Math.max(0, totalIssuedPrincipal - capitalOutstanding)
  const remainingProjectedInterest = Math.max(0, totalProfitBooked - profitCollected)
  const totalProjectedValue = recoveredPrincipal + capitalOutstanding + remainingProjectedInterest
  const pendingReviews = applications.filter((application) =>
    application.status === 'pending' || application.status === 'submitted' || application.status === 'under_review',
  ).length

  const progressSegments: DashboardProgressSegment[] = [
    {
      key: 'recovered_principal',
      label: 'Recovered Principal',
      description: 'Capital already returned through fully paid installments.',
      value: recoveredPrincipal,
      percentage: totalProjectedValue > 0 ? (recoveredPrincipal / totalProjectedValue) * 100 : 0,
      tone: 'green',
    },
    {
      key: 'capital_outstanding',
      label: 'Outstanding Principal',
      description: 'Unpaid capital still scheduled across active loan installments.',
      value: capitalOutstanding,
      percentage: totalProjectedValue > 0 ? (capitalOutstanding / totalProjectedValue) * 100 : 0,
      tone: 'amber',
    },
    {
      key: 'remaining_projected_interest',
      label: 'Remaining Projected Interest',
      description: 'Expected interest not yet realized from issued non-cancelled loans.',
      value: remainingProjectedInterest,
      percentage: totalProjectedValue > 0 ? (remainingProjectedInterest / totalProjectedValue) * 100 : 0,
      tone: 'olive',
    },
  ]

  return {
    summary: {
      profitCollected,
      totalProfitBooked,
      capitalOutstanding,
      recoveredPrincipal,
      remainingProjectedInterest,
      totalProjectedValue,
      totalIssuedPrincipal,
      activeLoans: activeLoans.length,
      pendingReviews,
    },
    progressSegments,
    recentApplications: [...applications].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 4),
    dueSoon: [...reminders].sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt)).slice(0, 3),
    partialFailureNotice: buildPartialFailureNotice(failedSources),
  }
}
