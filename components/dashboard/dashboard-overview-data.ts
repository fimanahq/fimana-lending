import type {
  DashboardMonthlyProfitResponse,
  DashboardMonthlyProfitRow,
  LoanApplication,
  LoanDashboardSummary,
} from '@/lib/types/lending'
import type { SettingsCurrency } from '@/lib/types/shared'

export type DashboardDataSource = 'summary' | 'applications' | 'monthlyProfit'

export interface DashboardSummaryMetrics extends LoanDashboardSummary {
  pendingReviewCount: number
}

export interface DashboardProgressSegment {
  key: string
  label: string
  description: string
  valueMinor: number
  percentage: number
  tone: 'green' | 'amber' | 'olive' | 'red'
}

export interface DashboardProfitGrowthData {
  year: number
  currency: SettingsCurrency
  timezone: string
  rows: DashboardMonthlyProfitRow[]
  hasCollectedProfit: boolean
  hasInterestDue: boolean
  elapsedMonthCount: number
  scheduledInterestDueMinor: number
  averageMonthlyInterestDueMinor: number
  ytdCollectedProfitMinor: number
  averageMonthlyProfitMinor: number
  bestMonth: DashboardMonthlyProfitRow | null
  monthOverMonth: {
    currentMonthProfitMinor: number
    previousMonthProfitMinor: number
    percentageChange: number | null
    trend: 'percentage' | 'new_growth' | 'no_change'
  }
}

export interface DashboardOverviewData {
  summary: DashboardSummaryMetrics
  activeLoanBalanceSegments: DashboardProgressSegment[]
  capitalPositionSegments: DashboardProgressSegment[]
  interestOutlookSegments: DashboardProgressSegment[]
  profitGrowth: DashboardProfitGrowthData | null
  profitGrowthYearOptions: number[]
  recentApplications: LoanApplication[]
  partialFailureNotice: string | null
}

interface BuildDashboardOverviewDataInput {
  summary?: LoanDashboardSummary | null
  applications: LoanApplication[]
  monthlyProfit?: DashboardMonthlyProfitResponse | null
  failedSources?: DashboardDataSource[]
  now?: Date
}

const FAILED_SOURCE_LABELS: Record<DashboardDataSource, string> = {
  summary: 'dashboard summary',
  applications: 'loan applications',
  monthlyProfit: 'monthly profit',
}

export function getManilaCalendarPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    timeZone: 'Asia/Manila',
    year: 'numeric',
  }).formatToParts(now)

  return {
    month: Number(parts.find((part) => part.type === 'month')?.value ?? 1),
    year: Number(parts.find((part) => part.type === 'year')?.value ?? now.getUTCFullYear()),
  }
}

function formatMonthShortLabel(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(Date.UTC(year, monthIndex, 1, 12)))
}

export function buildDashboardProfitGrowthData(
  monthlyProfit: DashboardMonthlyProfitResponse,
  now = new Date(),
): DashboardProfitGrowthData {
  const rowsByMonth = new Map(monthlyProfit.rows.map((row) => [row.monthKey, row]))
  const rows = Array.from({ length: 12 }, (_, monthIndex): DashboardMonthlyProfitRow => {
    const monthKey = `${monthlyProfit.year}-${String(monthIndex + 1).padStart(2, '0')}`
    const source = rowsByMonth.get(monthKey)

    return {
      monthKey,
      monthLabel: formatMonthShortLabel(monthlyProfit.year, monthIndex),
      interestDueMinor: source?.interestDueMinor ?? 0,
      interestCollectedMinor: source?.interestCollectedMinor ?? 0,
      penaltyCollectedMinor: source?.penaltyCollectedMinor ?? 0,
      excessProfitMinor: source?.excessProfitMinor ?? 0,
      treasuryInterestEarnedMinor: source?.treasuryInterestEarnedMinor ?? 0,
      totalProfitMinor: source?.totalProfitMinor ?? 0,
      paymentCount: source?.paymentCount ?? 0,
    }
  })
  const currentPeriod = getManilaCalendarPeriod(now)
  const elapsedMonthCount = monthlyProfit.year < currentPeriod.year
    ? 12
    : monthlyProfit.year === currentPeriod.year
      ? currentPeriod.month
      : 0
  const elapsedRows = rows.slice(0, elapsedMonthCount)
  const scheduledInterestDueMinor = rows.reduce((sum, row) => sum + row.interestDueMinor, 0)
  const averageMonthlyInterestDueMinor = scheduledInterestDueMinor / 12
  const ytdCollectedProfitMinor = elapsedRows.reduce((sum, row) => sum + row.totalProfitMinor, 0)
  const averageMonthlyProfitMinor = elapsedMonthCount > 0
    ? ytdCollectedProfitMinor / elapsedMonthCount
    : 0
  const bestMonth = elapsedRows.reduce<DashboardMonthlyProfitRow | null>((best, row) => {
    if (row.totalProfitMinor <= 0 || (best && row.totalProfitMinor <= best.totalProfitMinor)) {
      return best
    }

    return row
  }, null)
  const currentMonthProfitMinor = elapsedRows.at(-1)?.totalProfitMinor ?? 0
  const previousMonthProfitMinor = elapsedRows.at(-2)?.totalProfitMinor ?? 0
  const percentageChange = previousMonthProfitMinor > 0
    ? ((currentMonthProfitMinor - previousMonthProfitMinor) / previousMonthProfitMinor) * 100
    : null
  const trend = percentageChange !== null
    ? 'percentage' as const
    : currentMonthProfitMinor > 0
      ? 'new_growth' as const
      : 'no_change' as const

  return {
    year: monthlyProfit.year,
    currency: monthlyProfit.currency,
    timezone: monthlyProfit.timezone,
    rows,
    hasCollectedProfit: rows.some((row) => (
      row.interestCollectedMinor !== 0
      || row.penaltyCollectedMinor !== 0
      || row.excessProfitMinor !== 0
      || row.treasuryInterestEarnedMinor !== 0
      || row.totalProfitMinor !== 0
    )),
    hasInterestDue: rows.some((row) => row.interestDueMinor !== 0),
    elapsedMonthCount,
    scheduledInterestDueMinor,
    averageMonthlyInterestDueMinor,
    ytdCollectedProfitMinor,
    averageMonthlyProfitMinor,
    bestMonth,
    monthOverMonth: {
      currentMonthProfitMinor,
      previousMonthProfitMinor,
      percentageChange,
      trend,
    },
  }
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
    collectedExcessProfitMinor: 0,
    treasuryInterestEarnedMinor: 0,
    capitalDepositsMinor: 0,
    capitalWithdrawalsMinor: 0,
    netCapitalMovementMinor: 0,
    activeCollectedInterestMinor: 0,
    activeCollectedPenaltyMinor: 0,
    activeCollectedProfitMinor: 0,
    collectedProfitVsCapitalBps: 0,
    projectedProfitVsCapitalBps: 0,
    currentCapitalBasisMinor: 0,
    principalWriteOffLossMinor: 0,
    cashOnHandMinor: 0,
    calculatedCashOnHandMinor: 0,
    treasuryCashOnHandMinor: null,
    cashReconciliationDifferenceMinor: null,
    cashReconciliationStatus: 'treasury_unconfigured',
    projectedNetWorthMinor: 0,
    historicalUnallocatedAmountMinor: 0,
    historicalUnallocatedPaymentCount: 0,
    outstandingPrincipalMinor: 0,
    moneyWithBorrowersMinor: 0,
    defaultedLoanCount: 0,
    writtenOffPrincipalMinor: 0,
    defaultedCollectedProfitMinor: 0,
    netDefaultLossMinor: 0,
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
    interestByCutoff: [],
    pendingReviewCount: 0,
  }
}

export function buildDashboardOverviewData({
  summary,
  applications,
  monthlyProfit,
  failedSources = [],
  now = new Date(),
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
  const currentYear = getManilaCalendarPeriod(now).year
  const profitGrowthYearOptions = Array.from(new Set([
    currentYear,
    monthlyProfit?.year,
    ...mergedSummary.interestByCutoff.map((entry) => Number(entry.cutoffDate.slice(0, 4))),
  ]))
    .filter((year): year is number => typeof year === 'number' && Number.isInteger(year))
    .sort((left, right) => right - left)

  const capitalPositionBaseMinor = Math.max(0, mergedSummary.cashOnHandMinor) + mergedSummary.moneyWithBorrowersMinor
  const activeLoanBalanceBaseMinor = Math.max(
    0,
    mergedSummary.moneyWithBorrowersMinor + mergedSummary.remainingProjectedProfitMinor,
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
    profitGrowth: monthlyProfit ? buildDashboardProfitGrowthData(monthlyProfit, now) : null,
    profitGrowthYearOptions,
    recentApplications: [...applications].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 4),
    partialFailureNotice: buildPartialFailureNotice(failedSources),
  }
}
