import type {
  LoanApplication,
  LoanDashboardSummary,
  SettingsCurrency,
  UpcomingLoanReminder,
} from '@/lib/types'

export type DashboardDataSource = 'summary' | 'applications' | 'reminders'

export interface DashboardSummaryMetrics extends LoanDashboardSummary {
  pendingReviewCount: number
}

export interface DashboardProgressSegment {
  key: string
  label: string
  description: string
  valueMinor: number
  percentage: number
  tone: 'green' | 'amber' | 'olive'
}

export interface DashboardOverviewData {
  summary: DashboardSummaryMetrics
  activeLoanBalanceSegments: DashboardProgressSegment[]
  capitalPositionSegments: DashboardProgressSegment[]
  interestOutlookSegments: DashboardProgressSegment[]
  recentApplications: LoanApplication[]
  dueSoon: UpcomingLoanReminder[]
  partialFailureNotice: string | null
}

interface BuildDashboardOverviewDataInput {
  summary?: LoanDashboardSummary | null
  applications: LoanApplication[]
  reminders: UpcomingLoanReminder[]
  failedSources?: DashboardDataSource[]
}

const FAILED_SOURCE_LABELS: Record<DashboardDataSource, string> = {
  summary: 'dashboard summary',
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

function getPendingReviewCount(applications: LoanApplication[]) {
  return applications.filter((application) =>
    application.status === 'pending' || application.status === 'submitted' || application.status === 'under_review',
  ).length
}

function getDefaultSummary(): DashboardSummaryMetrics {
  return {
    currency: 'PHP' as SettingsCurrency,
    startingCapitalMinor: 0,
    collectedInterestMinor: 0,
    currentCapitalBasisMinor: 0,
    cashOnHandMinor: 0,
    outstandingPrincipalMinor: 0,
    moneyWithBorrowersMinor: 0,
    nextCutoffReceivableMinor: 0,
    overdueReceivableMinor: 0,
    overduePrincipalMinor: 0,
    overdueInterestMinor: 0,
    overdueLoanCount: 0,
    overdueBorrowerCount: 0,
    oldestUnpaidDueDate: null,
    remainingProjectedInterestMinor: 0,
    totalProjectedInterestMinor: 0,
    activeLoanCount: 0,
    currentCutoffReceivable: null,
    receivableByCutoff: [],
    pendingReviewCount: 0,
  }
}

export function buildDashboardOverviewData({
  summary,
  applications,
  reminders,
  failedSources = [],
}: BuildDashboardOverviewDataInput): DashboardOverviewData {
  const mergedSummary: DashboardSummaryMetrics = {
    ...(summary ?? getDefaultSummary()),
    pendingReviewCount: getPendingReviewCount(applications),
  }

  const capitalPositionBaseMinor = Math.max(0, mergedSummary.currentCapitalBasisMinor)
  const activeLoanBalanceBaseMinor = Math.max(
    0,
    mergedSummary.moneyWithBorrowersMinor + mergedSummary.collectedInterestMinor + mergedSummary.remainingProjectedInterestMinor,
  )
  const activeLoanBalanceSegments: DashboardProgressSegment[] = [
    {
      key: 'capital_in_active_loans',
      label: 'Capital in active loans',
      description: 'Principal currently deployed across active loans.',
      valueMinor: mergedSummary.moneyWithBorrowersMinor,
      percentage: activeLoanBalanceBaseMinor > 0 ? (mergedSummary.moneyWithBorrowersMinor / activeLoanBalanceBaseMinor) * 100 : 0,
      tone: 'amber',
    },
    {
      key: 'collected_interest',
      label: 'Collected interest',
      description: 'Interest already collected and realized.',
      valueMinor: mergedSummary.collectedInterestMinor,
      percentage: activeLoanBalanceBaseMinor > 0 ? (mergedSummary.collectedInterestMinor / activeLoanBalanceBaseMinor) * 100 : 0,
      tone: 'green',
    },
    {
      key: 'incoming_interest',
      label: 'Incoming interest',
      description: 'Projected interest remaining from active schedules.',
      valueMinor: mergedSummary.remainingProjectedInterestMinor,
      percentage: activeLoanBalanceBaseMinor > 0 ? (mergedSummary.remainingProjectedInterestMinor / activeLoanBalanceBaseMinor) * 100 : 0,
      tone: 'olive',
    },
  ]

  const capitalPositionSegments: DashboardProgressSegment[] = [
    {
      key: 'cash_on_hand',
      label: 'Cash on hand',
      description: 'Available to lend again from your current capital basis.',
      valueMinor: Math.max(0, mergedSummary.cashOnHandMinor),
      percentage: capitalPositionBaseMinor > 0 ? (Math.max(0, mergedSummary.cashOnHandMinor) / capitalPositionBaseMinor) * 100 : 0,
      tone: 'green',
    },
    {
      key: 'money_with_borrowers',
      label: 'Money with borrowers',
      description: 'Principal still deployed across active loans.',
      valueMinor: mergedSummary.moneyWithBorrowersMinor,
      percentage: capitalPositionBaseMinor > 0 ? (mergedSummary.moneyWithBorrowersMinor / capitalPositionBaseMinor) * 100 : 0,
      tone: 'amber',
    },
  ]

  const interestOutlookBaseMinor = Math.max(0, mergedSummary.totalProjectedInterestMinor)
  const interestOutlookSegments: DashboardProgressSegment[] = [
    {
      key: 'collected_interest',
      label: 'Collected interest',
      description: 'Interest already collected and realized.',
      valueMinor: mergedSummary.collectedInterestMinor,
      percentage: interestOutlookBaseMinor > 0 ? (mergedSummary.collectedInterestMinor / interestOutlookBaseMinor) * 100 : 0,
      tone: 'green',
    },
    {
      key: 'remaining_projected_interest',
      label: 'Remaining projected interest',
      description: 'Expected future interest from active schedules that is still unpaid.',
      valueMinor: mergedSummary.remainingProjectedInterestMinor,
      percentage: interestOutlookBaseMinor > 0 ? (mergedSummary.remainingProjectedInterestMinor / interestOutlookBaseMinor) * 100 : 0,
      tone: 'olive',
    },
  ]

  return {
    summary: mergedSummary,
    activeLoanBalanceSegments,
    capitalPositionSegments,
    interestOutlookSegments,
    recentApplications: [...applications].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 4),
    dueSoon: [...reminders].sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt)).slice(0, 3),
    partialFailureNotice: buildPartialFailureNotice(failedSources),
  }
}
