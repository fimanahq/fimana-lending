import { Suspense } from 'react'
import { DashboardOverview, buildDashboardOverviewData } from '@/modules/dashboard'
import { DashboardKpiFallback, DashboardKpiPanel } from '@/components/dashboard/dashboard-kpi-panel'
import { DashboardLoadingSpinner } from '@/components/dashboard/dashboard-loading-spinner'
import {
  DashboardPendingReviewCount,
  DashboardRecentApplicationsPanel,
} from '@/components/dashboard/dashboard-overview'
import dashboardStyles from '@/components/dashboard/dashboard.module.css'
import { authorizedBackendRequestWithCurrentAccess } from '@/lib/server/backend'
import type { DashboardApplicationOverview, DashboardKpiResponse, DashboardKpis, LoanDashboardSummary } from '@/lib/types/lending'
import { classNames } from '@/utils/class-names'

function kpisFromSummary(summary: LoanDashboardSummary): DashboardKpis {
  return {
    currency: summary.currency,
    startingCapitalMinor: summary.startingCapitalMinor,
    currentCapitalBasisMinor: summary.currentCapitalBasisMinor,
    currentContributedCapitalMinor: summary.currentContributedCapitalMinor,
    capitalDepositsMinor: summary.capitalDepositsMinor,
    capitalWithdrawalsMinor: summary.capitalWithdrawalsMinor,
    netCapitalMovementMinor: summary.netCapitalMovementMinor,
    collectedProfitMinor: summary.collectedProfitMinor,
    netCollectedProfitMinor: summary.netCollectedProfitMinor,
    rewardExpenseMinor: summary.rewardExpenseMinor,
    businessExpenseMinor: summary.businessExpenseMinor,
    writtenOffPrincipalMinor: summary.writtenOffPrincipalMinor,
    principalWriteOffLossMinor: summary.principalWriteOffLossMinor,
    cashOnHandMinor: summary.cashOnHandMinor,
    calculatedCashOnHandMinor: summary.calculatedCashOnHandMinor,
    treasuryCashOnHandMinor: summary.treasuryCashOnHandMinor,
    cashReconciliationDifferenceMinor: summary.cashReconciliationDifferenceMinor,
    cashReconciliationStatus: summary.cashReconciliationStatus,
    moneyWithBorrowersMinor: summary.moneyWithBorrowersMinor,
    activeLoanCount: summary.activeLoanCount,
    nextCutoffReceivableMinor: summary.nextCutoffReceivableMinor,
    currentCutoffDate: summary.currentCutoffReceivable?.cutoffDate ?? null,
    overdueReceivableMinor: summary.overdueReceivableMinor,
    oldestUnpaidDueDate: summary.oldestUnpaidDueDate,
    projectedNetWorthMinor: summary.projectedNetWorthMinor,
    netProjectedProfitVsCapitalBps: summary.netProjectedProfitVsCapitalBps,
    historicalUnallocatedAmountMinor: summary.historicalUnallocatedAmountMinor,
    historicalUnallocatedPaymentCount: summary.historicalUnallocatedPaymentCount,
    outstandingPrincipalMinor: summary.outstandingPrincipalMinor,
    remainingProjectedProfitMinor: summary.remainingProjectedProfitMinor,
  }
}

async function DashboardDetails({ summaryPromise }: { summaryPromise: Promise<LoanDashboardSummary | null> }) {
  const summary = await summaryPromise
  if (!summary) {
    return <div className="notice" role="alert">Unable to load detailed dashboard figures. Reload the page to try again.</div>
  }

  return <DashboardOverview data={buildDashboardOverviewData({ summary })} />
}

async function DashboardCards({
  applicationOverview,
  kpiPromise,
  summaryPromise,
}: {
  applicationOverview: Promise<DashboardApplicationOverview | null>
  kpiPromise: Promise<DashboardKpiResponse | null>
  summaryPromise: Promise<LoanDashboardSummary | null>
}) {
  const response = await kpiPromise
  let kpis: DashboardKpis | null = response
  if (!kpis) {
    const summary = await summaryPromise
    kpis = summary ? kpisFromSummary(summary) : null
  }
  return (
    <DashboardKpiPanel
      kpis={kpis}
      cacheUserId={response?.viewerUserId ?? null}
      pendingReviewCount={
        <Suspense fallback={<DashboardLoadingSpinner label="Loading pending reviews" />}>
          <DashboardPendingReviewCount applicationOverview={applicationOverview} />
        </Suspense>
      }
    />
  )
}

export default function DashboardPage() {
  const kpiPromise = authorizedBackendRequestWithCurrentAccess<DashboardKpiResponse>(
    '/loans/dashboard-kpis',
  ).catch(() => null)
  const summaryPromise = authorizedBackendRequestWithCurrentAccess<LoanDashboardSummary>(
    '/loans/dashboard-summary',
  ).catch(() => null)
  const applicationOverview = authorizedBackendRequestWithCurrentAccess<DashboardApplicationOverview>(
    '/loan-applications/dashboard-overview',
  ).catch(() => null)

  return (
    <div className={classNames('stack', dashboardStyles['dashboard-overview'])}>
      <Suspense fallback={<DashboardKpiFallback />}>
        <DashboardCards kpiPromise={kpiPromise} summaryPromise={summaryPromise} applicationOverview={applicationOverview} />
      </Suspense>
      <Suspense fallback={<div className={classNames(dashboardStyles['dashboard-overview__deferredBlock'], dashboardStyles['dashboard-overview__loadingPlaceholder'])}><DashboardLoadingSpinner label="Loading lending details" /></div>}>
        <DashboardDetails summaryPromise={summaryPromise} />
      </Suspense>
      <DashboardRecentApplicationsPanel applicationOverview={applicationOverview} />
    </div>
  )
}
