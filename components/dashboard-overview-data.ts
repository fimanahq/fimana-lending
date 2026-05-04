import type { LoanApplication, LoanRecord, SettingsCurrency, UpcomingLoanReminder } from '@/lib/types'

export type DashboardDataSource = 'loans' | 'applications' | 'reminders' | 'settings'

export interface DashboardSummaryMetrics {
  currency: SettingsCurrency
  startingCapital: number
  profitCollected: number
  capitalBasis: number
  availableCash: number
  capitalOutstanding: number
  recoveredPrincipal: number
  totalProfitBooked: number
  remainingProjectedInterest: number
  totalProjectedValue: number
  totalIssuedPrincipal: number
  activeLoans: number
  pendingReviews: number
}

export interface DashboardProgressSegment {
  key: 'available_cash' | 'principal_on_borrowers' | 'recovered_principal' | 'remaining_projected_interest'
  label: string
  description: string
  value: number
  percentage: number
  tone: 'green' | 'amber' | 'olive'
}

export interface DashboardOverviewData {
  summary: DashboardSummaryMetrics
  capitalPositionSegments: DashboardProgressSegment[]
  repaymentProgressSegments: DashboardProgressSegment[]
  recentApplications: LoanApplication[]
  dueSoon: UpcomingLoanReminder[]
  partialFailureNotice: string | null
}

interface BuildDashboardOverviewDataInput {
  loans: LoanRecord[]
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

function getProfitCollected(loan: LoanRecord) {
  return loan.balances.interestPaidAmountMinor / 100
}

function getTotalProfitBooked(loan: LoanRecord) {
  return (loan.balances.interestPaidAmountMinor + loan.balances.interestOutstandingAmountMinor) / 100
}

function getCapitalOutstanding(loan: LoanRecord) {
  return loan.balances.principalOutstandingAmountMinor / 100
}

function getTotalIssuedPrincipal(loan: LoanRecord) {
  return loan.principalAmountMinor / 100
}

function getRecoveredPrincipal(loan: LoanRecord) {
  return loan.balances.principalPaidAmountMinor / 100
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

  const profitCollected = loans.reduce((sum, loan) => sum + getProfitCollected(loan), 0)

  const totalProfitBooked = nonCancelledLoans.reduce((sum, loan) => sum + getTotalProfitBooked(loan), 0)

  const capitalOutstanding = activeLoans.reduce((sum, loan) => sum + getCapitalOutstanding(loan), 0)

  const totalIssuedPrincipal = nonCancelledLoans.reduce((sum, loan) => sum + getTotalIssuedPrincipal(loan), 0)
  const currency = settings?.defaultCurrency || 'PHP'
  const startingCapital = Math.max(0, settings?.startingCapital || 0)
  const recoveredPrincipal = nonCancelledLoans.reduce((sum, loan) => sum + getRecoveredPrincipal(loan), 0)
  const remainingProjectedInterest = Math.max(0, totalProfitBooked - profitCollected)
  const totalProjectedValue = recoveredPrincipal + capitalOutstanding + remainingProjectedInterest
  const capitalBasis = startingCapital + profitCollected
  const availableCash = capitalBasis - capitalOutstanding
  const capitalPositionTotal = capitalOutstanding + Math.max(0, availableCash)
  const pendingReviews = applications.filter((application) =>
    application.status === 'pending' || application.status === 'submitted' || application.status === 'under_review',
  ).length

  const capitalPositionSegments: DashboardProgressSegment[] = [
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

  const repaymentProgressSegments: DashboardProgressSegment[] = [
    {
      key: 'recovered_principal',
      label: 'Recovered Principal',
      description: 'Principal already returned through paid installments and available for redeployment.',
      value: recoveredPrincipal,
      percentage: totalProjectedValue > 0 ? (recoveredPrincipal / totalProjectedValue) * 100 : 0,
      tone: 'green',
    },
    {
      key: 'principal_on_borrowers',
      label: 'Outstanding Principal',
      description: 'Unpaid principal still scheduled across active loan installments.',
      value: capitalOutstanding,
      percentage: totalProjectedValue > 0 ? (capitalOutstanding / totalProjectedValue) * 100 : 0,
      tone: 'amber',
    },
    {
      key: 'remaining_projected_interest',
      label: 'Remaining Projected Interest',
      description: 'Booked interest that has not yet been collected from issued loans.',
      value: remainingProjectedInterest,
      percentage: totalProjectedValue > 0 ? (remainingProjectedInterest / totalProjectedValue) * 100 : 0,
      tone: 'olive',
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
      recoveredPrincipal,
      totalProfitBooked,
      remainingProjectedInterest,
      totalProjectedValue,
      totalIssuedPrincipal,
      activeLoans: activeLoans.length,
      pendingReviews,
    },
    capitalPositionSegments,
    repaymentProgressSegments,
    recentApplications: [...applications].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 4),
    dueSoon: [...reminders].sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt)).slice(0, 3),
    partialFailureNotice: buildPartialFailureNotice(failedSources),
  }
}
