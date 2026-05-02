import type { Loan, LoanApplication, SettingsCurrency, UpcomingLoanReminder } from '@/lib/types'

export type DashboardDataSource = 'loans' | 'applications' | 'reminders' | 'settings'

export interface DashboardSummaryMetrics {
  currency: SettingsCurrency
  startingCapital: number
  profitCollected: number
  capitalBasis: number
  availableCash: number
  capitalOutstanding: number
  totalProfitBooked: number
  remainingProjectedInterest: number
  totalIssuedPrincipal: number
  activeLoans: number
  pendingReviews: number
}

export interface DashboardProgressSegment {
  key: 'available_cash' | 'principal_on_borrowers'
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
  settings?: {
    defaultCurrency?: SettingsCurrency
    startingCapital?: number
  } | null
  failedSources?: DashboardDataSource[]
}

const FAILED_SOURCE_LABELS: Record<DashboardDataSource, string> = {
  loans: 'loans',
  applications: 'loan applications',
  reminders: 'upcoming reminders',
  settings: 'workspace settings',
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
  settings,
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
  const currency = settings?.defaultCurrency || 'PHP'
  const startingCapital = Math.max(0, settings?.startingCapital || 0)
  const remainingProjectedInterest = Math.max(0, totalProfitBooked - profitCollected)
  const capitalBasis = startingCapital + profitCollected
  const availableCash = capitalBasis - capitalOutstanding
  const capitalPositionTotal = capitalOutstanding + Math.max(0, availableCash)
  const pendingReviews = applications.filter((application) =>
    application.status === 'pending' || application.status === 'submitted' || application.status === 'under_review',
  ).length

  const progressSegments: DashboardProgressSegment[] = [
    {
      key: 'available_cash',
      label: 'Cash on Hand',
      description: 'Starting capital plus collected interest, less principal currently out with borrowers.',
      value: Math.max(0, availableCash),
      percentage: capitalPositionTotal > 0 ? (Math.max(0, availableCash) / capitalPositionTotal) * 100 : 0,
      tone: 'green',
    },
    {
      key: 'principal_on_borrowers',
      label: 'Money with Borrowers',
      description: 'Principal still outstanding across active loans, excluding projected and uncollected interest.',
      value: capitalOutstanding,
      percentage: capitalPositionTotal > 0 ? (capitalOutstanding / capitalPositionTotal) * 100 : 0,
      tone: 'amber',
    },
  ]

  return {
    summary: {
      currency,
      startingCapital,
      profitCollected,
      capitalBasis,
      availableCash,
      capitalOutstanding,
      totalProfitBooked,
      remainingProjectedInterest,
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
