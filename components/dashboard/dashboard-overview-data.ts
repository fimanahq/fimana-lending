import type {
  LoanApplication,
  LoanDashboardSummary,
} from '@/lib/types/lending'
import type { SettingsCurrency } from '@/lib/types/shared'

export type DashboardDataSource = 'summary' | 'applications'

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
  partialFailureNotice: string | null
}

interface BuildDashboardOverviewDataInput {
  summary?: LoanDashboardSummary | null
  applications: LoanApplication[]
  failedSources?: DashboardDataSource[]
}

const FAILED_SOURCE_LABELS: Record<DashboardDataSource, string> = {
  summary: 'dashboard summary',
  applications: 'loan applications',
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
    collectedPenaltyMinor: 0,
    collectedProfitMinor: 0,
    activeCollectedInterestMinor: 0,
    activeCollectedPenaltyMinor: 0,
    activeCollectedProfitMinor: 0,
    collectedProfitVsCapitalBps: 0,
    projectedProfitVsCapitalBps: 0,
    currentCapitalBasisMinor: 0,
    cashOnHandMinor: 0,
    outstandingPrincipalMinor: 0,
    moneyWithBorrowersMinor: 0,
    defaultedLoanCount: 0,
    writtenOffPrincipalMinor: 0,
    nextCutoffReceivableMinor: 0,
    overdueReceivableMinor: 0,
    overduePrincipalMinor: 0,
    overdueInterestMinor: 0,
    overduePenaltyMinor: 0,
    overdueLoanCount: 0,
    overdueBorrowerCount: 0,
    oldestUnpaidDueDate: null,
    remainingProjectedInterestMinor: 0,
    outstandingPenaltyMinor: 0,
    remainingProjectedProfitMinor: 0,
    totalProjectedInterestMinor: 0,
    totalPenaltyMinor: 0,
    totalProjectedProfitMinor: 0,
    ownerLoanInterestExcluded: false,
    ownerLoanInterestExcludedAmountMinor: 0,
    profitOutlookCollectedInterestMinor: 0,
    profitOutlookCollectedPenaltyMinor: 0,
    profitOutlookCollectedProfitMinor: 0,
    profitOutlookRemainingProjectedInterestMinor: 0,
    profitOutlookOutstandingPenaltyMinor: 0,
    profitOutlookRemainingProjectedProfitMinor: 0,
    profitOutlookTotalProjectedInterestMinor: 0,
    profitOutlookTotalPenaltyMinor: 0,
    profitOutlookTotalProjectedProfitMinor: 0,
    profitOutlookCollectedProfitVsCapitalBps: 0,
    profitOutlookProjectedProfitVsCapitalBps: 0,
    activeLoanCount: 0,
    currentCutoffReceivable: null,
    receivableByCutoff: [],
    pendingReviewCount: 0,
  }
}

export function buildDashboardOverviewData({
  summary,
  applications,
  failedSources = [],
}: BuildDashboardOverviewDataInput): DashboardOverviewData {
  const mergedSummary: DashboardSummaryMetrics = {
    ...getDefaultSummary(),
    ...(summary ?? {}),
    pendingReviewCount: getPendingReviewCount(applications),
  }
  mergedSummary.ownerLoanInterestExcluded = mergedSummary.ownerLoanInterestExcluded ?? false
  mergedSummary.ownerLoanInterestExcludedAmountMinor = mergedSummary.ownerLoanInterestExcludedAmountMinor ?? 0
  mergedSummary.profitOutlookCollectedInterestMinor = mergedSummary.profitOutlookCollectedInterestMinor ?? mergedSummary.collectedInterestMinor
  mergedSummary.profitOutlookCollectedPenaltyMinor = mergedSummary.profitOutlookCollectedPenaltyMinor ?? mergedSummary.collectedPenaltyMinor
  mergedSummary.profitOutlookCollectedProfitMinor = mergedSummary.profitOutlookCollectedProfitMinor ?? mergedSummary.collectedProfitMinor
  mergedSummary.profitOutlookRemainingProjectedInterestMinor = mergedSummary.profitOutlookRemainingProjectedInterestMinor ?? mergedSummary.remainingProjectedInterestMinor
  mergedSummary.profitOutlookOutstandingPenaltyMinor = mergedSummary.profitOutlookOutstandingPenaltyMinor ?? mergedSummary.outstandingPenaltyMinor
  mergedSummary.profitOutlookRemainingProjectedProfitMinor = mergedSummary.profitOutlookRemainingProjectedProfitMinor ?? mergedSummary.remainingProjectedProfitMinor
  mergedSummary.profitOutlookTotalProjectedInterestMinor = mergedSummary.profitOutlookTotalProjectedInterestMinor ?? mergedSummary.totalProjectedInterestMinor
  mergedSummary.profitOutlookTotalPenaltyMinor = mergedSummary.profitOutlookTotalPenaltyMinor ?? mergedSummary.totalPenaltyMinor
  mergedSummary.profitOutlookTotalProjectedProfitMinor = mergedSummary.profitOutlookTotalProjectedProfitMinor ?? mergedSummary.totalProjectedProfitMinor
  mergedSummary.profitOutlookCollectedProfitVsCapitalBps = mergedSummary.profitOutlookCollectedProfitVsCapitalBps ?? mergedSummary.collectedProfitVsCapitalBps
  mergedSummary.profitOutlookProjectedProfitVsCapitalBps = mergedSummary.profitOutlookProjectedProfitVsCapitalBps ?? mergedSummary.projectedProfitVsCapitalBps

  const capitalPositionBaseMinor = Math.max(0, mergedSummary.currentCapitalBasisMinor)
  const activeLoanBalanceBaseMinor = Math.max(
    0,
    mergedSummary.moneyWithBorrowersMinor + mergedSummary.activeCollectedProfitMinor + mergedSummary.remainingProjectedProfitMinor,
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
      label: 'Collected profit',
      description: 'Interest and penalties already collected and realized.',
      valueMinor: mergedSummary.activeCollectedProfitMinor,
      percentage: activeLoanBalanceBaseMinor > 0 ? (mergedSummary.activeCollectedProfitMinor / activeLoanBalanceBaseMinor) * 100 : 0,
      tone: 'green',
    },
    {
      key: 'incoming_interest',
      label: 'Incoming profit',
      description: 'Projected interest and penalties remaining from active schedules.',
      valueMinor: mergedSummary.remainingProjectedProfitMinor,
      percentage: activeLoanBalanceBaseMinor > 0 ? (mergedSummary.remainingProjectedProfitMinor / activeLoanBalanceBaseMinor) * 100 : 0,
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

  const interestOutlookBaseMinor = Math.max(
    0,
    mergedSummary.profitOutlookTotalProjectedProfitMinor || mergedSummary.profitOutlookTotalProjectedInterestMinor,
  )
  const interestOutlookSegments: DashboardProgressSegment[] = [
    {
      key: 'collected_interest',
      label: 'Collected profit',
      description: 'Interest and penalties already collected and realized.',
      valueMinor: mergedSummary.profitOutlookCollectedProfitMinor,
      percentage: interestOutlookBaseMinor > 0 ? (mergedSummary.profitOutlookCollectedProfitMinor / interestOutlookBaseMinor) * 100 : 0,
      tone: 'green',
    },
    {
      key: 'remaining_projected_interest',
      label: 'Remaining projected profit',
      description: 'Expected future interest and penalties from active schedules that are still unpaid.',
      valueMinor: mergedSummary.profitOutlookRemainingProjectedProfitMinor,
      percentage: interestOutlookBaseMinor > 0 ? (mergedSummary.profitOutlookRemainingProjectedProfitMinor / interestOutlookBaseMinor) * 100 : 0,
      tone: 'olive',
    },
  ]

  return {
    summary: mergedSummary,
    activeLoanBalanceSegments,
    capitalPositionSegments,
    interestOutlookSegments,
    recentApplications: [...applications].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 4),
    partialFailureNotice: buildPartialFailureNotice(failedSources),
  }
}
