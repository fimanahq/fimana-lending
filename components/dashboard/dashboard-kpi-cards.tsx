'use client'

import type { ReactNode } from 'react'
import { formatCurrency, formatDate } from '@/lib/format'
import type { DashboardKpis } from '@/lib/types/lending'
import { ProtectedLink as Link } from '@/components/shared'
import { classNames } from '@/utils/class-names'
import { StatInfoDisclosure } from './dashboard-stat-info'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
}

function formatBasisPointsPercentage(valueBps: number) {
  return `${(valueBps / 100).toFixed(2)}%`
}

function StatBreakdown({
  items,
  wide = false,
}: {
  items: Array<{ label: string; value: ReactNode }>
  wide?: boolean
}) {
  return (
    <dl className={dashboardClass('dashboard-overview__statBreakdown', wide && 'dashboard-overview__statBreakdown--wide')}>
      {items.map(({ label, value }) => (
        <div className={dashboardClass('dashboard-overview__statBreakdownRow')} key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DashboardKpiCards({ summary, pendingReviewCount }: { summary: DashboardKpis; pendingReviewCount: ReactNode }) {
  const dashboardCurrency = summary.currency
  const capitalLossesMinor = summary.writtenOffPrincipalMinor + summary.principalWriteOffLossMinor

  return (
    <section className={dashboardClass('dashboard-overview__executive')}>
      {summary.cashReconciliationStatus === 'variance' && summary.cashReconciliationDifferenceMinor !== null ? (
        <div className={classNames('notice', dashboardClass('dashboard-overview__notice'))}>
          Treasury differs from calculated lending cash by {formatMinorCurrency(Math.abs(summary.cashReconciliationDifferenceMinor), dashboardCurrency)}
          {' '}({summary.cashReconciliationDifferenceMinor < 0 ? 'Treasury is lower' : 'Treasury is higher'}).{' '}
          <Link href="/treasury">Review Treasury reconciliation</Link>.
        </div>
      ) : null}
      {summary.cashReconciliationStatus === 'treasury_unconfigured' ? (
        <div className={classNames('notice', dashboardClass('dashboard-overview__notice'))}>
          Treasury is not configured. Cash on hand is using the calculated lending balance. <Link href="/treasury">Set up Treasury</Link>.
        </div>
      ) : null}
      {summary.historicalUnallocatedPaymentCount > 0 ? (
        <div className={classNames('notice', dashboardClass('dashboard-overview__notice'))}>
          {summary.historicalUnallocatedPaymentCount.toLocaleString('en-PH')} historical payment{summary.historicalUnallocatedPaymentCount === 1 ? '' : 's'} contain{' '}
          {formatMinorCurrency(summary.historicalUnallocatedAmountMinor, dashboardCurrency)} awaiting excess-profit review. <Link href="/treasury/historical-excess">Review payments</Link>.
        </div>
      ) : null}

      <section className={dashboardClass('dashboard-overview__kpiGrid')}>
        <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--warm', 'dashboard-overview__statCard--hasInfo', 'dashboard-overview__statCard--capitalBasis')}>
          <span className={dashboardClass('dashboard-overview__statLabel')}>Current capital basis</span>
          <strong className={dashboardClass('dashboard-overview__statValue')}>
            {formatMinorCurrency(summary.currentCapitalBasisMinor, dashboardCurrency)}
          </strong>
          <StatBreakdown wide items={[
            { label: 'Starting capital', value: formatMinorCurrency(summary.startingCapitalMinor, dashboardCurrency) },
            { label: 'Net capital movement', value: formatMinorCurrency(summary.netCapitalMovementMinor, dashboardCurrency) },
            { label: 'Net realized profit', value: formatMinorCurrency(summary.netCollectedProfitMinor, dashboardCurrency) },
            { label: 'Less: capital losses', value: formatMinorCurrency(capitalLossesMinor, dashboardCurrency) },
          ]} />
          <StatInfoDisclosure id="current-capital-basis-info" label="Show current capital basis details">
            <span>Formula: starting capital + net capital movement + net realized profit - capital losses.</span>
            <br />
            <br />
            <span>Starting capital: {formatMinorCurrency(summary.startingCapitalMinor, dashboardCurrency)}</span>
            <br />
            <span>Capital deposits: {formatMinorCurrency(summary.capitalDepositsMinor, dashboardCurrency)}</span>
            <br />
            <span>Capital withdrawals: {formatMinorCurrency(summary.capitalWithdrawalsMinor, dashboardCurrency)}</span>
            <br />
            <span>Net capital movement: {formatMinorCurrency(summary.netCapitalMovementMinor, dashboardCurrency)}</span>
            <br />
            <span>Realized profit: {formatMinorCurrency(summary.collectedProfitMinor, dashboardCurrency)} from collected interest, penalties, excess-payment profit, and Treasury interest.</span>
            <br />
            <span>Reward expenses: {formatMinorCurrency(summary.rewardExpenseMinor, dashboardCurrency)}</span>
            <br />
            <span>Business expenses: {formatMinorCurrency(summary.businessExpenseMinor, dashboardCurrency)}</span>
            <br />
            <span>Net realized profit: {formatMinorCurrency(summary.netCollectedProfitMinor, dashboardCurrency)}</span>
            <br />
            <span>Capital losses: {formatMinorCurrency(capitalLossesMinor, dashboardCurrency)} total.</span>
            <br />
            <span>Defaulted principal: {formatMinorCurrency(summary.writtenOffPrincipalMinor, dashboardCurrency)}</span>
            <br />
            <span>Principal capital losses: {formatMinorCurrency(summary.principalWriteOffLossMinor, dashboardCurrency)}</span>
          </StatInfoDisclosure>
        </article>

        <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--tinted', 'dashboard-overview__statCard--hasInfo')}>
          <span className={dashboardClass('dashboard-overview__statLabel')}>Current contributed capital</span>
          <strong className={dashboardClass('dashboard-overview__statValue')}>
            {formatMinorCurrency(summary.currentContributedCapitalMinor, dashboardCurrency)}
          </strong>
          <StatBreakdown items={[
            { label: 'Original capital', value: formatMinorCurrency(summary.startingCapitalMinor, dashboardCurrency) },
            { label: 'Capital deposits', value: formatMinorCurrency(summary.capitalDepositsMinor, dashboardCurrency) },
            { label: 'Less: withdrawals', value: formatMinorCurrency(summary.capitalWithdrawalsMinor, dashboardCurrency) },
          ]} />
          <StatInfoDisclosure id="current-contributed-capital-info" label="Show current contributed capital details">
            <span>Formula: original capital + capital deposits - capital withdrawals.</span>
            <br />
            <br />
            <span>Original capital: {formatMinorCurrency(summary.startingCapitalMinor, dashboardCurrency)}</span>
            <br />
            <span>Capital deposits: {formatMinorCurrency(summary.capitalDepositsMinor, dashboardCurrency)}</span>
            <br />
            <span>Capital withdrawals: {formatMinorCurrency(summary.capitalWithdrawalsMinor, dashboardCurrency)}</span>
            <br />
            <span>Current contributed capital: {formatMinorCurrency(summary.currentContributedCapitalMinor, dashboardCurrency)}</span>
          </StatInfoDisclosure>
        </article>

        <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--sage', 'dashboard-overview__statCard--hasInfo')}>
          <span className={dashboardClass('dashboard-overview__statLabel')}>Cash on hand</span>
          <strong className={dashboardClass('dashboard-overview__statValue')}>
            {formatMinorCurrency(summary.cashOnHandMinor, dashboardCurrency)}
          </strong>
          {summary.treasuryCashOnHandMinor !== null ? (
            <StatBreakdown items={[
              { label: 'Calculated lending cash', value: formatMinorCurrency(summary.calculatedCashOnHandMinor, dashboardCurrency) },
            ]} />
          ) : (
            <span className={dashboardClass('dashboard-overview__statSubvalue')}>Current capital basis less active principal</span>
          )}
          <StatInfoDisclosure id="cash-on-hand-info" label="Show cash on hand details">
            {summary.treasuryCashOnHandMinor !== null ? 'Available balance from Treasury.' : 'Calculated amount available to lend.'}
          </StatInfoDisclosure>
        </article>

        <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--ink', 'dashboard-overview__statCard--hasInfo')}>
          <span className={dashboardClass('dashboard-overview__statLabel')}>Money with borrowers</span>
          <strong className={dashboardClass('dashboard-overview__statValue')}>
            {formatMinorCurrency(summary.moneyWithBorrowersMinor, dashboardCurrency)}
          </strong>
          <StatBreakdown items={[
            {
              label: 'Pending reviews',
              value: (
                <span aria-live="polite">
                  {pendingReviewCount}
                </span>
              ),
            },
          ]} />
          <StatInfoDisclosure id="money-with-borrowers-info" label="Show money with borrowers details" contrast>
            Principal still deployed across {summary.activeLoanCount.toLocaleString('en-PH')} active loan{summary.activeLoanCount === 1 ? '' : 's'}.
          </StatInfoDisclosure>
        </article>

        <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--tinted', 'dashboard-overview__statCard--hasInfo')}>
          <span className={dashboardClass('dashboard-overview__statLabel')}>Next cutoff receivable</span>
          <strong className={dashboardClass('dashboard-overview__statValue')}>
            {formatMinorCurrency(summary.nextCutoffReceivableMinor, dashboardCurrency)}
          </strong>
          {summary.currentCutoffDate ? (
            <StatBreakdown items={[
              { label: 'Cutoff date', value: formatDate(summary.currentCutoffDate) },
            ]} />
          ) : (
            <span className={dashboardClass('dashboard-overview__statSubvalue')}>No upcoming cutoff</span>
          )}
          <StatInfoDisclosure id="next-cutoff-receivable-info" label="Show next cutoff receivable details">
            Expected collection on the nearest cutoff date.
          </StatInfoDisclosure>
        </article>

        <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--warningSoft', 'dashboard-overview__statCard--hasInfo')}>
          <span className={dashboardClass('dashboard-overview__statLabel')}>Overdue receivable</span>
          <strong className={dashboardClass('dashboard-overview__statValue')}>
            {formatMinorCurrency(summary.overdueReceivableMinor, dashboardCurrency)}
          </strong>
          {summary.oldestUnpaidDueDate ? (
            <StatBreakdown items={[
              { label: 'Oldest unpaid due', value: formatDate(summary.oldestUnpaidDueDate) },
            ]} />
          ) : (
            <span className={dashboardClass('dashboard-overview__statSubvalue')}>No overdue schedules right now</span>
          )}
          <StatInfoDisclosure id="overdue-receivable-info" label="Show overdue receivable details">
            Past due unpaid schedules.
          </StatInfoDisclosure>
        </article>

        <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--tinted', 'dashboard-overview__statCard--hasInfo')}>
          <span className={dashboardClass('dashboard-overview__statLabel')}>Projected total net worth</span>
          <strong className={dashboardClass('dashboard-overview__statValue')}>
            {formatMinorCurrency(summary.projectedNetWorthMinor, dashboardCurrency)}
          </strong>
          <StatBreakdown items={[
            { label: 'Net profit vs starting capital', value: formatBasisPointsPercentage(summary.netProjectedProfitVsCapitalBps) },
          ]} />
          <StatInfoDisclosure id="projected-net-worth-info" label="Show projected total net worth details">
            <span>Formula: cash on hand - unallocated payments + active principal + remaining projected profit.</span>
            <br />
            <br />
            <span>Cash on hand: {formatMinorCurrency(summary.cashOnHandMinor, dashboardCurrency)}</span>
            <br />
            <span>Unallocated payments: {formatMinorCurrency(summary.historicalUnallocatedAmountMinor, dashboardCurrency)}</span>
            <br />
            <span>Active principal: {formatMinorCurrency(summary.outstandingPrincipalMinor, dashboardCurrency)}</span>
            <br />
            <span>Remaining projected profit: {formatMinorCurrency(summary.remainingProjectedProfitMinor, dashboardCurrency)}</span>
            <br />
            <br />
            <span>Projected total net worth: {formatMinorCurrency(summary.projectedNetWorthMinor, dashboardCurrency)}</span>
            <br />
            <br />
            <span>Booked expenses are already reflected in cash.</span>
          </StatInfoDisclosure>
        </article>
      </section>
    </section>
  )
}
