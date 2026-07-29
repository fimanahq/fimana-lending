import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { formatLoanApplicationStatus, getStatusClassName } from '@/lib/status'
import type { LoanApplication } from '@/lib/types/lending'
import type { DashboardOverviewData, DashboardProgressSegment } from '@/components/dashboard/dashboard-overview-data'
import { Badge, ProtectedLink as Link } from '@/components/shared'
import { classNames } from '@/utils/class-names'
import { DashboardPortfolioChartLoader } from './dashboard-portfolio-chart-loader'
import { DashboardProfitGrowth } from './dashboard-profit-growth'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
}

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`
}

function formatBasisPointsPercentage(valueBps: number) {
  return `${(valueBps / 100).toFixed(2)}%`
}

function getNameInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || 'FM'
}

function getApplicationPlan(application: LoanApplication) {
  const frequency = application.paymentType || application.paymentFrequency
  const frequencyLabel = frequency === 'monthly' ? 'Monthly' : 'Semi-monthly'
  const days = application.paymentDays.map(formatPaymentDay).join(' and ')
  return `${frequencyLabel} · ${days}`
}

function getApplicationHref(application: LoanApplication) {
  return `/loan-applications/${application.id}`
}

function getApplicationName(application: LoanApplication) {
  return application.borrower?.displayName
    || `${application.firstName || ''} ${application.lastName || ''}`.trim()
    || 'Borrower'
}

function StatInfoDisclosure({
  children,
  contrast = false,
  id,
  label,
}: {
  children: ReactNode
  contrast?: boolean
  id: string
  label: string
}) {
  return (
    <details className={dashboardClass('dashboard-overview__statInfo', contrast && 'dashboard-overview__statInfo--contrast')}>
      <summary aria-describedby={id} aria-label={label} className={dashboardClass('dashboard-overview__statInfoButton')}>
        <Info className={dashboardClass('dashboard-overview__statMetaIcon')} aria-hidden="true" strokeWidth={2} />
        <span className={dashboardClass('dashboard-overview__statInfoBubble')} id={id} role="tooltip">
          {children}
        </span>
      </summary>
    </details>
  )
}

function formatApplicationAmount(application: LoanApplication) {
  return formatCurrency(
    (application.loanAmountMinor ?? application.principal ?? 0) / (application.loanAmountMinor ? 100 : 1),
    application.loanProduct?.currency,
  ).replace('.00', '')
}

function ProgressSegmentLedger({
  ariaLabel,
  currency,
  segments,
}: {
  ariaLabel: string
  currency: string
  segments: DashboardProgressSegment[]
}) {
  return (
    <div className={dashboardClass('dashboard-overview__mixLedger')} aria-label={ariaLabel}>
      {segments.map((segment) => (
        <article
          key={segment.key}
          className={dashboardClass('dashboard-overview__mixLedgerItem', `dashboard-overview__mixLedgerItem--${segment.tone}`)}
        >
          <span className={dashboardClass('dashboard-overview__mixLedgerLabel')}>
            <span className={dashboardClass('dashboard-overview__mixLedgerSwatch')} />
            {segment.label}
          </span>
          <strong>{formatMinorCurrency(segment.valueMinor, currency)}</strong>
          <span>{formatPercentage(segment.percentage)} of mix</span>
        </article>
      ))}
    </div>
  )
}

function MixContext({
  label,
  meta,
  value,
}: {
  label: string
  meta: string
  value: string
}) {
  return (
    <div className={dashboardClass('dashboard-overview__mixContext')}>
      <span>{label}</span>
      <strong>{value}</strong>
      <span>{meta}</span>
    </div>
  )
}

function ProfitOutlookPanel({
  currency,
  segments,
  summary,
}: {
  currency: string
  segments: DashboardProgressSegment[]
  summary: DashboardOverviewData['summary']
}) {
  const collectedProfitMinor = summary.profitOutlookNetCollectedProfitMinor ?? summary.profitOutlookCollectedProfitMinor ?? summary.collectedProfitMinor
  const totalProjectedProfitMinor = summary.profitOutlookNetTotalProjectedProfitMinor ?? summary.profitOutlookTotalProjectedProfitMinor ?? summary.totalProjectedProfitMinor
  const grossTotalProjectedProfitMinor = summary.profitOutlookTotalProjectedProfitMinor ?? summary.totalProjectedProfitMinor
  const collectedProfitVsCapitalBps = summary.profitOutlookNetCollectedProfitVsCapitalBps ?? summary.profitOutlookCollectedProfitVsCapitalBps ?? summary.collectedProfitVsCapitalBps
  const projectedProfitVsCapitalBps = summary.profitOutlookNetProjectedProfitVsCapitalBps ?? summary.profitOutlookProjectedProfitVsCapitalBps ?? summary.projectedProfitVsCapitalBps
  const rewardExpenseMinor = summary.profitOutlookRewardExpenseMinor ?? summary.rewardExpenseMinor ?? 0
  const hasProfitOutlook = grossTotalProjectedProfitMinor > 0 || rewardExpenseMinor > 0
  const hasPositiveNetProfit = totalProjectedProfitMinor > 0

  return (
    <article className={dashboardClass('dashboard-overview__progressCard', 'dashboard-overview__mixCard')}>
      <div className={dashboardClass('dashboard-overview__progressHeader')}>
        <div>
          <span className={dashboardClass('dashboard-overview__statLabel')}>Profit Outlook</span>
          <h2>Collected versus projected profit</h2>
          <p>Realized profit already booked and expected profit still tied to active schedules.</p>
          {summary.ownerLoanInterestExcluded ? (
            <Badge tone="warning">Owner loan interest excluded from profit</Badge>
          ) : null}
        </div>
      </div>

      {hasProfitOutlook ? (
        <div className={dashboardClass('dashboard-overview__mixCardBody')}>
          {hasPositiveNetProfit ? (
            <>
              <DashboardPortfolioChartLoader
                caption="Collected net profit and remaining net projected profit. Projected amounts are expected future profit, not current cash."
                centerKicker="Profit outlook"
                centerSubvalue={`${formatBasisPointsPercentage(projectedProfitVsCapitalBps)} vs capital`}
                centerValueMinor={totalProjectedProfitMinor}
                currency={currency}
                segments={segments}
              />

              <ProgressSegmentLedger ariaLabel="Profit outlook ledger" currency={currency} segments={segments} />
            </>
          ) : (
            <div className={dashboardClass('dashboard-overview__emptyState', 'dashboard-overview__emptyState--compact')}>
              <span className={dashboardClass('dashboard-overview__emptyIcon')}>
                <OverviewGlyph name="alert" />
              </span>
              <div>
                <strong>Net projected profit is below zero</strong>
                <p>Reward expenses are higher than projected profit.</p>
              </div>
            </div>
          )}

          <MixContext
            label="Collected so far"
            meta={`${formatBasisPointsPercentage(collectedProfitVsCapitalBps)} collected vs capital`}
            value={formatMinorCurrency(collectedProfitMinor, currency)}
          />
          {summary.collectedExcessProfitMinor > 0 ? (
            <MixContext
              label="Excess-payment profit"
              meta="Realized profit included in collected profit above"
              value={formatMinorCurrency(summary.collectedExcessProfitMinor, currency)}
            />
          ) : null}
          {rewardExpenseMinor > 0 ? (
            <MixContext
              label="Gross projected profit"
              meta="Profit before referral and bonus rewards"
              value={formatMinorCurrency(grossTotalProjectedProfitMinor, currency)}
            />
          ) : null}
          {rewardExpenseMinor > 0 ? (
            <MixContext
              label="Reward expenses"
              meta="Referral and bonus rewards paid from Treasury"
              value={formatMinorCurrency(rewardExpenseMinor, currency)}
            />
          ) : null}
          {!hasPositiveNetProfit ? (
            <MixContext
              label="Net projected profit"
              meta={`${formatBasisPointsPercentage(projectedProfitVsCapitalBps)} vs capital`}
              value={formatMinorCurrency(totalProjectedProfitMinor, currency)}
            />
          ) : null}
        </div>
      ) : (
        <div className={dashboardClass('dashboard-overview__emptyState', 'dashboard-overview__emptyState--compact')}>
          <span className={dashboardClass('dashboard-overview__emptyIcon')}>
            <OverviewGlyph name="note" />
          </span>
          <div>
            <strong>No profit outlook yet</strong>
            <p>Projected and collected profit will appear here once active schedules begin generating interest or penalties.</p>
          </div>
        </div>
      )}
    </article>
  )
}

function OverviewGlyph({
  name,
}: {
  name: 'plus' | 'applications' | 'calculator' | 'rules' | 'trend' | 'money' | 'shield' | 'note' | 'alert'
}) {
  switch (name) {
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
    case 'applications':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 6h10M7 12h10M7 18h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 6h.01M4 12h.01M4 18h.01" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'calculator':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="3.8" width="14" height="16.4" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 7.8h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      )
    case 'rules':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m5 18 4-4m0 0 2-2 7 7M9 14 4 9l2.5-2.5L12 12m1-7 5 5-2 2-5-5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'trend':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m5 15 4-4 3 3 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 8h4v4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'money':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 9h.01M17 15h.01" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 4 6.5 6.5v5.5c0 3.4 2.3 6.5 5.5 7.5 3.2-1 5.5-4.1 5.5-7.5V6.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="m9.7 11.9 1.7 1.7 3.2-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'note':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 4.5h8l3 3V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M15 4.5v3h3M9 12h6M9 16h4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'alert':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4 4.5 18h15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12 9v4.5M12 16.8h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    default:
      return null
  }
}

function MiniMetric({
  label,
  value,
  meta,
}: {
  label: string
  value: string
  meta: string
}) {
  return (
    <article className={dashboardClass('dashboard-overview__miniCard')}>
      <span className={dashboardClass('dashboard-overview__statLabel')}>{label}</span>
      <strong className={dashboardClass('dashboard-overview__miniValue')}>{value}</strong>
      <span className={dashboardClass('dashboard-overview__miniMeta')}>{meta}</span>
    </article>
  )
}

function ActiveLoansPanel({
  currency,
  segments,
  summary,
}: {
  currency: string
  segments: DashboardProgressSegment[]
  summary: DashboardOverviewData['summary']
}) {
  const hasActiveLoanMix = summary.moneyWithBorrowersMinor > 0
    || summary.remainingProjectedProfitMinor > 0
  const totalActiveReceivableMinor = summary.moneyWithBorrowersMinor + summary.remainingProjectedProfitMinor
  const overdueMeta = summary.overdueLoanCount > 0
    ? `${summary.overdueLoanCount.toLocaleString('en-PH')} overdue loan${summary.overdueLoanCount === 1 ? '' : 's'}`
    : 'No overdue loans right now'
  const oldestDueMeta = summary.oldestUnpaidDueDate
    ? `Oldest unpaid due ${formatDate(summary.oldestUnpaidDueDate)}`
    : `${summary.overdueBorrowerCount.toLocaleString('en-PH')} borrower${summary.overdueBorrowerCount === 1 ? '' : 's'} with missed payments`

  return (
    <article className={dashboardClass('dashboard-overview__activeLoansPanel')}>
      <div className={dashboardClass('dashboard-overview__activeLoansHeader')}>
        <div className={dashboardClass('dashboard-overview__activeLoansTitleGroup')}>
          <span className={dashboardClass('dashboard-overview__statLabel')}>Active Loans</span>
          <h2>Active loan position</h2>
          <p>See deployed principal, expected profit, and profit already collected from active schedules in one operating view.</p>
        </div>
        <div className={dashboardClass('dashboard-overview__activeLoansSummary')}>
          <span className={dashboardClass('dashboard-overview__progressSummaryLabel')}>Total active receivable</span>
          <strong>{formatMinorCurrency(totalActiveReceivableMinor, currency)}</strong>
          <span>{summary.activeLoanCount === 1 ? '1 active loan' : `${summary.activeLoanCount.toLocaleString('en-PH')} active loans`}</span>
        </div>
      </div>

      {hasActiveLoanMix ? (
        <div className={dashboardClass('dashboard-overview__activeLoansBody')}>
          <section className={dashboardClass('dashboard-overview__activeLoansMain')} aria-label="Active loan balance mix">
            <div className={dashboardClass('dashboard-overview__activeLoansMix')}>
              <DashboardPortfolioChartLoader
                caption="Principal and expected profit still receivable from active loans."
                centerKicker="Active loan mix"
                centerSubvalue={`${summary.activeLoanCount.toLocaleString('en-PH')} active loan${summary.activeLoanCount === 1 ? '' : 's'}`}
                centerValueMinor={totalActiveReceivableMinor}
                currency={currency}
                segments={segments}
              />

              <ProgressSegmentLedger ariaLabel="Active loan balance ledger" currency={currency} segments={segments} />

              <MixContext
                label="Collected profit from active loans"
                meta="Interest and penalties already collected; excluded from the current receivable total"
                value={formatMinorCurrency(summary.activeCollectedProfitMinor, currency)}
              />
            </div>
          </section>

          <aside className={dashboardClass('dashboard-overview__activeLoansAside')} aria-label="Active loan collection attention">
            <section className={dashboardClass('dashboard-overview__activeLoansAttention')}>
              <span className={dashboardClass('dashboard-overview__statLabel')}>Collection attention</span>
              <strong>{formatMinorCurrency(summary.overdueReceivableMinor, currency)}</strong>
              <span>{overdueMeta}</span>
              <p>{oldestDueMeta}</p>
            </section>
            <section className={dashboardClass('dashboard-overview__activeLoansNote')}>
              <span className={dashboardClass('dashboard-overview__statLabel')}>Portfolio note</span>
              <p>Active balance includes deployed principal and expected profit still receivable. Collected profit is shown separately.</p>
            </section>
          </aside>
        </div>
      ) : (
        <div className={dashboardClass('dashboard-overview__emptyState', 'dashboard-overview__emptyState--compact')}>
          <span className={dashboardClass('dashboard-overview__emptyIcon')}>
            <OverviewGlyph name="applications" />
          </span>
          <div>
            <strong>No active loans yet</strong>
            <p>Disburse a loan to start tracking deployed principal and expected profit.</p>
          </div>
        </div>
      )}
    </article>
  )
}

function CurrentCapitalPositionPanel({
  currency,
  liveCapitalPositionMinor,
  segments,
  summary,
}: {
  currency: string
  liveCapitalPositionMinor: number
  segments: DashboardProgressSegment[]
  summary: DashboardOverviewData['summary']
}) {
  const availableCapitalSegment = segments.find((segment) => segment.key === 'cash_on_hand')
  const availableCapitalMinor = availableCapitalSegment?.valueMinor ?? Math.max(0, summary.cashOnHandMinor)
  const availableCapitalPercentage = availableCapitalSegment?.percentage ?? 0

  return (
    <article className={dashboardClass('dashboard-overview__progressCard', 'dashboard-overview__mixCard')}>
      <div className={dashboardClass('dashboard-overview__progressHeader')}>
        <div>
          <span className={dashboardClass('dashboard-overview__statLabel')}>Current Capital Position</span>
          <h2>Where current capital sits</h2>
          <p>Cash available now and principal still deployed across active loans.</p>
        </div>
      </div>

      {liveCapitalPositionMinor > 0 ? (
        <div className={dashboardClass('dashboard-overview__mixCardBody')}>
          <DashboardPortfolioChartLoader
            caption="Cash and deployed principal within live capital. Defaulted principal is excluded."
            centerKicker="Live capital"
            centerSubvalue="Excludes write-offs"
            centerValueMinor={liveCapitalPositionMinor}
            currency={currency}
            segments={segments}
          />

          <ProgressSegmentLedger ariaLabel="Current capital position ledger" currency={currency} segments={segments} />

          <MixContext
            label="Available to lend"
            meta={`${formatPercentage(availableCapitalPercentage)} available within live capital`}
            value={formatMinorCurrency(availableCapitalMinor, currency)}
          />
        </div>
      ) : (
        <div className={dashboardClass('dashboard-overview__emptyState', 'dashboard-overview__emptyState--compact')}>
          <span className={dashboardClass('dashboard-overview__emptyIcon')}>
            <OverviewGlyph name="trend" />
          </span>
          <div>
            <strong>No capital position yet</strong>
            <p>Set a starting capital amount or disburse a loan to start tracking where current capital sits.</p>
          </div>
        </div>
      )}

      {summary.cashOnHandMinor < 0 ? (
        <div className="notice">
          Cash on hand is negative by {formatMinorCurrency(Math.abs(summary.cashOnHandMinor), currency)}. Principal deployed is currently higher than current capital basis.
        </div>
      ) : null}
    </article>
  )
}

export function DashboardOverview({ data }: { data: DashboardOverviewData }) {
  const {
    summary,
    activeLoanBalanceSegments,
    capitalPositionSegments,
    interestOutlookSegments,
    profitGrowth,
    profitGrowthYearOptions,
    currentYear,
    recentApplications,
    partialFailureNotice,
  } = data
  const dashboardCurrency = summary.currency
  const hasPrincipalWriteOff = summary.writtenOffPrincipalMinor > 0
  const defaultedLoanLabel = `${summary.defaultedLoanCount.toLocaleString('en-PH')} defaulted loan${summary.defaultedLoanCount === 1 ? '' : 's'}`
  const liveCapitalPositionMinor = Math.max(0, summary.cashOnHandMinor) + summary.moneyWithBorrowersMinor
  const projectedNetWorthAfterWriteOffMinor = summary.projectedNetWorthMinor
  const projectedNetWorthMeta = summary.ownerLoanInterestExcluded
    ? 'Cash on hand less unallocated payment liabilities, plus outstanding principal and raw projected unpaid profit. Booked rewards are reflected in cash; owner loan interest is excluded only from Profit Outlook.'
    : 'Cash on hand less unallocated payment liabilities, plus outstanding principal and projected unpaid profit. Booked rewards are reflected in cash.'

  return (
    <div className={classNames('stack', dashboardClass('dashboard-overview'))}>
      <section className={dashboardClass('dashboard-overview__executive')}>
        {partialFailureNotice ? <div className={classNames('notice', dashboardClass('dashboard-overview__notice'))}>{partialFailureNotice}</div> : null}
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

        <section className={dashboardClass('dashboard-overview__kpiGrid', 'dashboard-overview__kpiGrid--six')}>
          <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--warm', 'dashboard-overview__statCard--hasInfo')}>
            <span className={dashboardClass('dashboard-overview__statLabel')}>Current capital basis</span>
            <strong className={dashboardClass('dashboard-overview__statValue')}>
              {formatMinorCurrency(summary.currentCapitalBasisMinor, dashboardCurrency)}
            </strong>
            <span className={dashboardClass('dashboard-overview__statSubvalue')}>
              {formatMinorCurrency(summary.startingCapitalMinor, dashboardCurrency)} starting · {formatMinorCurrency(summary.netCapitalMovementMinor, dashboardCurrency)} net movements · {formatBasisPointsPercentage(summary.netCollectedProfitVsCapitalBps)} net profit vs capital
            </span>
            <StatInfoDisclosure id="current-capital-basis-info" label="Show current capital basis details">
              Formula: starting capital + net capital movements + net realized profit - capital losses.
            </StatInfoDisclosure>
            <div className={dashboardClass('dashboard-overview__statArtwork')} aria-hidden="true">
              <OverviewGlyph name="money" />
            </div>
          </article>

          <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--sage', 'dashboard-overview__statCard--hasInfo')}>
            <span className={dashboardClass('dashboard-overview__statLabel')}>Cash on hand</span>
            <strong className={dashboardClass('dashboard-overview__statValue')}>
              {formatMinorCurrency(summary.cashOnHandMinor, dashboardCurrency)}
            </strong>
            <span className={dashboardClass('dashboard-overview__statSubvalue')}>
              {summary.treasuryCashOnHandMinor !== null
                ? `Calculated lending cash: ${formatMinorCurrency(summary.calculatedCashOnHandMinor, dashboardCurrency)}`
                : 'Current capital basis less active principal and write-offs, net of booked rewards'}
            </span>
            <StatInfoDisclosure id="cash-on-hand-info" label="Show cash on hand details">
              {summary.treasuryCashOnHandMinor !== null ? 'Available balance from Treasury.' : 'Calculated amount available to lend.'}
            </StatInfoDisclosure>
            <div className={dashboardClass('dashboard-overview__statArtwork')} aria-hidden="true">
              <OverviewGlyph name="shield" />
            </div>
          </article>

          <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--ink', 'dashboard-overview__statCard--hasInfo')}>
            <span className={dashboardClass('dashboard-overview__statLabel')}>Money with borrowers</span>
            <strong className={dashboardClass('dashboard-overview__statValue')}>
              {formatMinorCurrency(summary.moneyWithBorrowersMinor, dashboardCurrency)}
            </strong>
            <span className={dashboardClass('dashboard-overview__statSubvalue', 'dashboard-overview__statSubvalue--contrast')}>
              {summary.pendingReviewCount > 0
                ? `${summary.pendingReviewCount} pending review${summary.pendingReviewCount === 1 ? '' : 's'} still in the queue`
                : 'No pending reviews in the intake queue'}
            </span>
            <StatInfoDisclosure id="money-with-borrowers-info" label="Show money with borrowers details" contrast>
              Principal still deployed across {summary.activeLoanCount.toLocaleString('en-PH')} active loan{summary.activeLoanCount === 1 ? '' : 's'}.
            </StatInfoDisclosure>
            <div className={dashboardClass('dashboard-overview__statArtwork')} aria-hidden="true">
              <OverviewGlyph name="applications" />
            </div>
          </article>

          <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--tinted', 'dashboard-overview__statCard--hasInfo')}>
            <span className={dashboardClass('dashboard-overview__statLabel')}>Next cutoff receivable</span>
            <strong className={dashboardClass('dashboard-overview__statValue')}>
              {formatMinorCurrency(summary.nextCutoffReceivableMinor, dashboardCurrency)}
            </strong>
            <span className={dashboardClass('dashboard-overview__statSubvalue')}>
              {summary.currentCutoffReceivable ? formatDate(summary.currentCutoffReceivable.cutoffDate) : 'No upcoming cutoff'}
            </span>
            <StatInfoDisclosure id="next-cutoff-receivable-info" label="Show next cutoff receivable details">
              Expected collection on the nearest cutoff date.
            </StatInfoDisclosure>
            <div className={dashboardClass('dashboard-overview__statArtwork')} aria-hidden="true">
              <OverviewGlyph name="trend" />
            </div>
          </article>

          <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--warningSoft', 'dashboard-overview__statCard--hasInfo')}>
            <span className={dashboardClass('dashboard-overview__statLabel')}>Overdue receivable</span>
            <strong className={dashboardClass('dashboard-overview__statValue')}>
              {formatMinorCurrency(summary.overdueReceivableMinor, dashboardCurrency)}
            </strong>
            <span className={dashboardClass('dashboard-overview__statSubvalue')}>
              {summary.oldestUnpaidDueDate ? `Oldest unpaid due ${formatDate(summary.oldestUnpaidDueDate)}` : 'No overdue schedules right now'}
            </span>
            <StatInfoDisclosure id="overdue-receivable-info" label="Show overdue receivable details">
              Past due unpaid schedules.
            </StatInfoDisclosure>
            <div className={dashboardClass('dashboard-overview__statArtwork')} aria-hidden="true">
              <OverviewGlyph name="alert" />
            </div>
          </article>

          <article className={dashboardClass('dashboard-overview__statCard', 'dashboard-overview__statCard--tinted', 'dashboard-overview__statCard--hasInfo')}>
            <span className={dashboardClass('dashboard-overview__statLabel')}>Projected total net worth</span>
            <strong className={dashboardClass('dashboard-overview__statValue')}>
              {formatMinorCurrency(projectedNetWorthAfterWriteOffMinor, dashboardCurrency)}
            </strong>
            <span className={dashboardClass('dashboard-overview__statSubvalue')}>
              {formatBasisPointsPercentage(summary.netProjectedProfitVsCapitalBps)} net projected profit vs starting capital
            </span>
            <StatInfoDisclosure id="projected-net-worth-info" label="Show projected total net worth details">
              {projectedNetWorthMeta}
            </StatInfoDisclosure>
            <div className={dashboardClass('dashboard-overview__statArtwork')} aria-hidden="true">
              <OverviewGlyph name="note" />
            </div>
          </article>
        </section>

        <ActiveLoansPanel
          currency={dashboardCurrency}
          segments={activeLoanBalanceSegments}
          summary={summary}
        />

        <div className="grid two">
          <CurrentCapitalPositionPanel
            currency={dashboardCurrency}
            liveCapitalPositionMinor={liveCapitalPositionMinor}
            segments={capitalPositionSegments}
            summary={summary}
          />

          <ProfitOutlookPanel
            currency={dashboardCurrency}
            segments={interestOutlookSegments}
            summary={summary}
          />
        </div>

        <DashboardProfitGrowth
          currentYear={currentYear}
          data={profitGrowth}
          fallbackCurrency={dashboardCurrency}
          yearOptions={profitGrowthYearOptions}
        />

        <section className="grid two">
          {hasPrincipalWriteOff ? (
            <article className={dashboardClass('dashboard-overview__progressCard')}>
              <div className={dashboardClass('dashboard-overview__progressHeader')}>
                <div>
                  <span className={dashboardClass('dashboard-overview__statLabel')}>Defaulted / Losses</span>
                  <h2>Defaulted principal and net loss</h2>
                  <p>
                    Defaulted loans are excluded from active receivables. This section keeps the written-off principal and recovered profit visible separately from live capital.
                  </p>
                </div>
              </div>
              <div className={dashboardClass('dashboard-overview__miniGrid')}>
                <MiniMetric
                  label="Defaulted principal"
                  value={formatMinorCurrency(summary.writtenOffPrincipalMinor, dashboardCurrency)}
                  meta={`Across ${defaultedLoanLabel}`}
                />
                <MiniMetric
                  label="Collected profit"
                  value={formatMinorCurrency(summary.defaultedCollectedProfitMinor, dashboardCurrency)}
                  meta="Interest and penalties collected before default"
                />
                <MiniMetric
                  label="Net default loss"
                  value={formatMinorCurrency(summary.netDefaultLossMinor, dashboardCurrency)}
                  meta="Defaulted principal less collected profit"
                />
              </div>
            </article>
          ) : null}

          <article className={dashboardClass('dashboard-overview__progressCard')}>
            <div className={dashboardClass('dashboard-overview__progressHeader')}>
              <div>
                <span className={dashboardClass('dashboard-overview__statLabel')}>Collection Risk</span>
                <h2>What needs collection attention</h2>
                <p>
                  Track the overdue receivable, split between overdue principal, interest, and penalty, then watch how many borrowers and loans are already late.
                </p>
              </div>
            </div>
            <div className={dashboardClass('dashboard-overview__miniGrid')}>
              <MiniMetric
                label="Overdue receivable"
                value={formatMinorCurrency(summary.overdueReceivableMinor, dashboardCurrency)}
                meta="Past due unpaid schedules only"
              />
              <MiniMetric
                label="Overdue principal"
                value={formatMinorCurrency(summary.overduePrincipalMinor, dashboardCurrency)}
                meta="Principal already past due"
              />
              <MiniMetric
                label="Overdue interest"
                value={formatMinorCurrency(summary.overdueInterestMinor, dashboardCurrency)}
                meta="Interest already past due"
              />
              <MiniMetric
                label="Overdue penalty"
                value={formatMinorCurrency(summary.overduePenaltyMinor, dashboardCurrency)}
                meta="Manual penalties already past due"
              />
              <MiniMetric
                label="Overdue loans"
                value={summary.overdueLoanCount.toLocaleString('en-PH')}
                meta="Loans with missed schedule rows"
              />
              <MiniMetric
                label="Borrowers with missed payments"
                value={summary.overdueBorrowerCount.toLocaleString('en-PH')}
                meta={summary.oldestUnpaidDueDate ? `Oldest unpaid due ${formatDate(summary.oldestUnpaidDueDate)}` : 'No missed payments right now'}
              />
            </div>
          </article>

        </section>
      </section>

      <section className={dashboardClass('dashboard-overview__operator')}>
        <section className={dashboardClass('dashboard-overview__contentGrid')}>
          <div className={dashboardClass('dashboard-overview__mainColumn')}>
            <div className={dashboardClass('dashboard-overview__sectionHead')}>
              <h2>Recent Applications</h2>
              <Link href="/loan-applications">View all history</Link>
            </div>

            <div className={dashboardClass('dashboard-overview__tableCard')}>
              {recentApplications.length > 0 ? (
                <>
                  <div className={dashboardClass('dashboard-overview__recentApplicationsTableDesktop')}>
                    <table className={dashboardClass('dashboard-overview__table')}>
                      <thead>
                        <tr>
                          <th>Client Name</th>
                          <th>Schedule</th>
                          <th className={dashboardClass('dashboard-overview__tableAmount')}>Amount</th>
                          <th className={dashboardClass('dashboard-overview__tableStatus')}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentApplications.map((application) => (
                          <tr key={application.id}>
                            <td>
                              <Link href={getApplicationHref(application)} className={dashboardClass('dashboard-overview__clientCell')}>
                                <span className={dashboardClass('dashboard-overview__avatar')}>
                                  {getNameInitials(getApplicationName(application))}
                                </span>
                                <span className={dashboardClass('dashboard-overview__clientName')}>
                                  {getApplicationName(application)}
                                </span>
                              </Link>
                            </td>
                            <td>{getApplicationPlan(application)}</td>
                            <td className={dashboardClass('dashboard-overview__tableAmount')}>
                              {formatApplicationAmount(application)}
                            </td>
                            <td className={dashboardClass('dashboard-overview__tableStatus')}>
                              <span className={getStatusClassName(application.status)}>
                                {formatLoanApplicationStatus(application.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={dashboardClass('dashboard-overview__recentApplicationTileList')} aria-label="Recent applications">
                    {recentApplications.map((application) => (
                      <article key={application.id} className={dashboardClass('dashboard-overview__recentApplicationTile')}>
                        <Link href={getApplicationHref(application)} className={dashboardClass('dashboard-overview__recentApplicationTileHeader')}>
                          <span className={dashboardClass('dashboard-overview__avatar')}>
                            {getNameInitials(getApplicationName(application))}
                          </span>
                          <span className={dashboardClass('dashboard-overview__clientName')}>
                            {getApplicationName(application)}
                          </span>
                        </Link>

                        <dl className={dashboardClass('dashboard-overview__recentApplicationTileMetrics')}>
                          <div>
                            <dt>Schedule</dt>
                            <dd>{getApplicationPlan(application)}</dd>
                          </div>
                          <div>
                            <dt>Amount</dt>
                            <dd>{formatApplicationAmount(application)}</dd>
                          </div>
                          <div>
                            <dt>Status</dt>
                            <dd>
                              <span className={getStatusClassName(application.status)}>
                                {formatLoanApplicationStatus(application.status)}
                              </span>
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className={dashboardClass('dashboard-overview__emptyState')}>
                  <span className={dashboardClass('dashboard-overview__emptyIcon')}>
                    <OverviewGlyph name="note" />
                  </span>
                  <div>
                    <strong>No applications yet</strong>
                    <p>New borrower applications will appear here once the intake flow is used.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  )
}
