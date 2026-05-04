import Link from 'next/link'
import { DashboardPortfolioChart } from '@/components/dashboard-portfolio-chart'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { formatLoanApplicationStatus, getStatusClassName } from '@/lib/status'
import type { DashboardCutoffReceivable, LoanApplication } from '@/lib/types'
import type { DashboardOverviewData, DashboardProgressSegment } from '@/components/dashboard-overview-data'

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
}

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`
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

function getReminderTone(index: number) {
  return ['amber', 'green', 'olive'][index % 3]
}

function getReceivableStatusLabel(status: DashboardCutoffReceivable['status']) {
  if (status === 'overdue') {
    return 'Overdue'
  }

  if (status === 'current') {
    return 'Current'
  }

  return 'Upcoming'
}

function ProgressLegend({
  currency,
  segments,
}: {
  currency: string
  segments: DashboardProgressSegment[]
}) {
  return (
    <div className="dashboard-overview__progressLegend">
      {segments.map((segment) => (
        <article
          key={segment.key}
          className={`dashboard-overview__progressLegendItem dashboard-overview__progressLegendItem--${segment.tone}`}
        >
          <div className="dashboard-overview__progressLegendTop">
            <span className="dashboard-overview__progressLegendLabel">
              <span className="dashboard-overview__progressLegendSwatch" />
              {segment.label}
            </span>
            <strong>{formatPercentage(segment.percentage)}</strong>
          </div>
          <div className="dashboard-overview__progressLegendValue">{formatMinorCurrency(segment.valueMinor, currency)}</div>
          <p>{segment.description}</p>
        </article>
      ))}
    </div>
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
    <article className="dashboard-overview__miniCard">
      <span className="dashboard-overview__statLabel">{label}</span>
      <strong className="dashboard-overview__miniValue">{value}</strong>
      <span className="dashboard-overview__miniMeta">{meta}</span>
    </article>
  )
}

export function DashboardOverview({ data }: { data: DashboardOverviewData }) {
  const {
    summary,
    capitalPositionSegments,
    interestOutlookSegments,
    recentApplications,
    dueSoon,
    receivablePreview,
    partialFailureNotice,
  } = data
  const dashboardCurrency = summary.currency

  return (
    <div className="dashboard-overview stack">
      <section className="dashboard-overview__executive">
        {partialFailureNotice ? <div className="notice dashboard-overview__notice">{partialFailureNotice}</div> : null}

        <section className="dashboard-overview__kpiGrid dashboard-overview__kpiGrid--six">
          <article className="dashboard-overview__statCard dashboard-overview__statCard--plain">
            <span className="dashboard-overview__statLabel">Current capital basis</span>
            <strong className="dashboard-overview__statValue">
              {formatMinorCurrency(summary.currentCapitalBasisMinor, dashboardCurrency)}
            </strong>
            <span className="dashboard-overview__statMeta">Starting capital + collected interest</span>
            <span className="dashboard-overview__statSubvalue">
              {formatMinorCurrency(summary.startingCapitalMinor, dashboardCurrency)} starting capital basis
            </span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="money" />
            </div>
          </article>

          <article className="dashboard-overview__statCard dashboard-overview__statCard--sage">
            <span className="dashboard-overview__statLabel">Cash on hand</span>
            <strong className="dashboard-overview__statValue">
              {formatMinorCurrency(summary.cashOnHandMinor, dashboardCurrency)}
            </strong>
            <span className="dashboard-overview__statMeta">Available to lend again</span>
            <span className="dashboard-overview__statSubvalue">
              Current capital basis less principal still deployed
            </span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="shield" />
            </div>
          </article>

          <article className="dashboard-overview__statCard dashboard-overview__statCard--ink">
            <span className="dashboard-overview__statLabel">Money with borrowers</span>
            <strong className="dashboard-overview__statValue">
              {formatMinorCurrency(summary.moneyWithBorrowersMinor, dashboardCurrency)}
            </strong>
            <span className="dashboard-overview__statMeta dashboard-overview__statMeta--contrast">
              Principal still deployed across {summary.activeLoanCount.toLocaleString('en-PH')} active loan{summary.activeLoanCount === 1 ? '' : 's'}
            </span>
            <span className="dashboard-overview__statSubvalue dashboard-overview__statSubvalue--contrast">
              {summary.pendingReviewCount > 0
                ? `${summary.pendingReviewCount} pending review${summary.pendingReviewCount === 1 ? '' : 's'} still in the queue`
                : 'No pending reviews in the intake queue'}
            </span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="applications" />
            </div>
          </article>

          <article className="dashboard-overview__statCard dashboard-overview__statCard--tinted">
            <span className="dashboard-overview__statLabel">Next cutoff receivable</span>
            <strong className="dashboard-overview__statValue">
              {formatMinorCurrency(summary.nextCutoffReceivableMinor, dashboardCurrency)}
            </strong>
            <span className="dashboard-overview__statMeta">Expected collection on the nearest cutoff date</span>
            <span className="dashboard-overview__statSubvalue">
              {summary.currentCutoffReceivable ? formatDate(summary.currentCutoffReceivable.cutoffDate) : 'No upcoming cutoff'}
            </span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="trend" />
            </div>
          </article>

          <article className="dashboard-overview__statCard dashboard-overview__statCard--plain">
            <span className="dashboard-overview__statLabel">Overdue receivable</span>
            <strong className="dashboard-overview__statValue">
              {formatMinorCurrency(summary.overdueReceivableMinor, dashboardCurrency)}
            </strong>
            <span className="dashboard-overview__statMeta">Past due unpaid schedules</span>
            <span className="dashboard-overview__statSubvalue">
              {summary.oldestUnpaidDueDate ? `Oldest unpaid due ${formatDate(summary.oldestUnpaidDueDate)}` : 'No overdue schedules right now'}
            </span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="alert" />
            </div>
          </article>

          <article className="dashboard-overview__statCard dashboard-overview__statCard--tinted">
            <span className="dashboard-overview__statLabel">Remaining projected interest</span>
            <strong className="dashboard-overview__statValue">
              {formatMinorCurrency(summary.remainingProjectedInterestMinor, dashboardCurrency)}
            </strong>
            <span className="dashboard-overview__statMeta">Expected future interest from active loans</span>
            <span className="dashboard-overview__statSubvalue">
              Shown in profit outlook only, not part of current capital yet
            </span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="note" />
            </div>
          </article>
        </section>

        <div className="grid two">
          <article className="dashboard-overview__progressCard">
            <div className="dashboard-overview__progressHeader">
              <div>
                <span className="dashboard-overview__statLabel">Current Capital Position</span>
                <h2>Where the current capital sits now</h2>
                <p>
                  The capital basis uses starting capital plus collected interest, then splits that basis into cash on hand and money still out with borrowers.
                </p>
              </div>
              <div className="dashboard-overview__progressSummary">
                <span className="dashboard-overview__progressSummaryLabel">Current capital basis</span>
                <strong>{formatMinorCurrency(summary.currentCapitalBasisMinor, dashboardCurrency)}</strong>
                <span>{formatMinorCurrency(summary.collectedInterestMinor, dashboardCurrency)} collected interest already added back</span>
              </div>
            </div>

            <div className="dashboard-overview__progressBody">
              {summary.currentCapitalBasisMinor > 0 || summary.moneyWithBorrowersMinor > 0 ? (
                <DashboardPortfolioChart
                  caption="This view only uses cash on hand and money with borrowers. Remaining projected interest stays in profit outlook until it is actually collected."
                  centerKicker="Current capital basis"
                  centerSubvalue={`${formatMinorCurrency(summary.cashOnHandMinor, dashboardCurrency)} cash available right now`}
                  centerValueMinor={summary.currentCapitalBasisMinor}
                  currency={dashboardCurrency}
                  segments={capitalPositionSegments}
                />
              ) : (
                <div className="dashboard-overview__emptyState dashboard-overview__emptyState--compact">
                  <span className="dashboard-overview__emptyIcon">
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
                  Cash on hand is negative by {formatMinorCurrency(Math.abs(summary.cashOnHandMinor), dashboardCurrency)}. Principal deployed is currently higher than current capital basis.
                </div>
              ) : null}

              <ProgressLegend currency={dashboardCurrency} segments={capitalPositionSegments} />
            </div>
          </article>

          <article className="dashboard-overview__progressCard">
            <div className="dashboard-overview__progressHeader">
              <div>
                <span className="dashboard-overview__statLabel">Interest Outlook</span>
                <h2>Collected versus projected interest</h2>
                <p>
                  Realized interest is already in the business. Remaining projected interest is expected future profit from active schedules and is not current cash.
                </p>
              </div>
              <div className="dashboard-overview__progressSummary">
                <span className="dashboard-overview__progressSummaryLabel">Total projected interest</span>
                <strong>{formatMinorCurrency(summary.totalProjectedInterestMinor, dashboardCurrency)}</strong>
                <span>{formatMinorCurrency(summary.collectedInterestMinor, dashboardCurrency)} collected so far</span>
              </div>
            </div>

            <div className="dashboard-overview__progressBody">
              {summary.totalProjectedInterestMinor > 0 ? (
                <DashboardPortfolioChart
                  caption="This chart is interest-only. It compares collected interest with remaining projected interest and does not treat projected interest as cash on hand."
                  centerKicker="Total projected interest"
                  centerSubvalue={`${formatMinorCurrency(summary.collectedInterestMinor, dashboardCurrency)} collected so far`}
                  centerValueMinor={summary.totalProjectedInterestMinor}
                  currency={dashboardCurrency}
                  segments={interestOutlookSegments}
                />
              ) : (
                <div className="dashboard-overview__emptyState dashboard-overview__emptyState--compact">
                  <span className="dashboard-overview__emptyIcon">
                    <OverviewGlyph name="note" />
                  </span>
                  <div>
                    <strong>No interest outlook yet</strong>
                    <p>Projected and collected interest will appear here once active schedules begin generating interest.</p>
                  </div>
                </div>
              )}

              <ProgressLegend currency={dashboardCurrency} segments={interestOutlookSegments} />
            </div>
          </article>
        </div>

        <section className="dashboard-overview__operator">
          <div className="dashboard-overview__operatorHeader">
            <div>
              <h2 className="section-title title-offset">Per Cutoff Receivable</h2>
              <p className="muted">
                Group unpaid or partially paid schedules by cutoff date so the nearest collection target and the next receivable dates are visible at a glance.
              </p>
            </div>
          </div>

          {summary.currentCutoffReceivable ? (
            <section className="dashboard-overview__miniGrid dashboard-overview__miniGrid--five">
              <MiniMetric
                label="Due this cutoff"
                value={formatMinorCurrency(summary.currentCutoffReceivable.totalReceivableMinor, dashboardCurrency)}
                meta={formatDate(summary.currentCutoffReceivable.cutoffDate)}
              />
              <MiniMetric
                label="Principal due"
                value={formatMinorCurrency(summary.currentCutoffReceivable.principalDueMinor, dashboardCurrency)}
                meta="Scheduled principal on this cutoff"
              />
              <MiniMetric
                label="Interest due"
                value={formatMinorCurrency(summary.currentCutoffReceivable.interestDueMinor, dashboardCurrency)}
                meta="Scheduled interest on this cutoff"
              />
              <MiniMetric
                label="Remaining to collect"
                value={formatMinorCurrency(summary.currentCutoffReceivable.remainingMinor, dashboardCurrency)}
                meta={formatMinorCurrency(summary.currentCutoffReceivable.totalCollectedMinor, dashboardCurrency) + ' already collected'}
              />
              <MiniMetric
                label="Borrowers due"
                value={summary.currentCutoffReceivable.borrowerCount.toLocaleString('en-PH')}
                meta={`${summary.currentCutoffReceivable.loanCount.toLocaleString('en-PH')} loan${summary.currentCutoffReceivable.loanCount === 1 ? '' : 's'} due`}
              />
            </section>
          ) : (
            <div className="dashboard-overview__emptyState dashboard-overview__emptyState--compact">
              <span className="dashboard-overview__emptyIcon">
                <OverviewGlyph name="note" />
              </span>
              <div>
                <strong>No upcoming receivables</strong>
                <p>No unpaid or partially paid cutoff rows are scheduled right now.</p>
              </div>
            </div>
          )}

          <div className="dashboard-overview__tableCard">
            {receivablePreview.length > 0 ? (
              <table className="dashboard-overview__table">
                <thead>
                  <tr>
                    <th>Cutoff date</th>
                    <th className="dashboard-overview__tableAmount">Principal due</th>
                    <th className="dashboard-overview__tableAmount">Interest due</th>
                    <th className="dashboard-overview__tableAmount">Total receivable</th>
                    <th className="dashboard-overview__tableAmount">Collected</th>
                    <th className="dashboard-overview__tableAmount">Remaining</th>
                    <th>Borrowers due</th>
                    <th>Loans due</th>
                    <th className="dashboard-overview__tableStatus">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {receivablePreview.map((entry) => (
                    <tr key={entry.cutoffDate}>
                      <td>{formatDate(entry.cutoffDate)}</td>
                      <td className="dashboard-overview__tableAmount">{formatMinorCurrency(entry.principalDueMinor, dashboardCurrency)}</td>
                      <td className="dashboard-overview__tableAmount">{formatMinorCurrency(entry.interestDueMinor, dashboardCurrency)}</td>
                      <td className="dashboard-overview__tableAmount">{formatMinorCurrency(entry.totalReceivableMinor, dashboardCurrency)}</td>
                      <td className="dashboard-overview__tableAmount">{formatMinorCurrency(entry.totalCollectedMinor, dashboardCurrency)}</td>
                      <td className="dashboard-overview__tableAmount">{formatMinorCurrency(entry.remainingMinor, dashboardCurrency)}</td>
                      <td>{entry.borrowerCount.toLocaleString('en-PH')}</td>
                      <td>{entry.loanCount.toLocaleString('en-PH')}</td>
                      <td className="dashboard-overview__tableStatus">
                        <span className={`dashboard-overview__statusBadge dashboard-overview__statusBadge--${entry.status}`}>
                          {getReceivableStatusLabel(entry.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="dashboard-overview__emptyState">
                <span className="dashboard-overview__emptyIcon">
                  <OverviewGlyph name="money" />
                </span>
                <div>
                  <strong>No receivable cutoffs yet</strong>
                  <p>Open receivable cutoff groups will appear here once active schedules are generated.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="grid two">
          <article className="dashboard-overview__progressCard">
            <div className="dashboard-overview__progressHeader">
              <div>
                <span className="dashboard-overview__statLabel">Collection Risk</span>
                <h2>What needs collection attention</h2>
                <p>
                  Track the overdue receivable, split between overdue principal and overdue interest, then watch how many borrowers and loans are already late.
                </p>
              </div>
            </div>
            <div className="dashboard-overview__miniGrid">
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

          <article className="dashboard-overview__progressCard">
            <div className="dashboard-overview__progressHeader">
              <div>
                <span className="dashboard-overview__statLabel">Day-to-day actions</span>
                <h2>Origination and workspace shortcuts</h2>
                <p>Keep loan intake moving and jump straight into the core lending workflows.</p>
              </div>
            </div>
            <section className="dashboard-overview__actionsRow">
              <Link href="/loan-applications/new" className="dashboard-overview__actionCard">
                <span className="dashboard-overview__actionIcon dashboard-overview__actionIcon--amber">
                  <OverviewGlyph name="plus" />
                </span>
                <h2>Create a new application</h2>
                <p>Start the origination flow from application intake through approval and disbursement.</p>
              </Link>

              <Link href="/loan-applications" className="dashboard-overview__actionCard">
                <span className="dashboard-overview__actionIcon dashboard-overview__actionIcon--green">
                  <OverviewGlyph name="applications" />
                </span>
                <h2>Review applications</h2>
                <p>
                  {summary.pendingReviewCount > 0
                    ? `${summary.pendingReviewCount} pending application${summary.pendingReviewCount === 1 ? '' : 's'} need a review decision.`
                    : 'The intake queue is clear and ready for the next borrower submission.'}
                </p>
              </Link>

              <Link href="/rules" className="dashboard-overview__actionCard">
                <span className="dashboard-overview__actionIcon dashboard-overview__actionIcon--olive">
                  <OverviewGlyph name="rules" />
                </span>
                <h2>Adjust rules</h2>
                <p>Refine underwriting parameters and lending guardrails without leaving the operating workspace.</p>
              </Link>

              <Link href="/calculator" className="dashboard-overview__actionCard">
                <span className="dashboard-overview__actionIcon dashboard-overview__actionIcon--green">
                  <OverviewGlyph name="calculator" />
                </span>
                <h2>Open lending calculator</h2>
                <p>Preview cutoff dates, interest, and repayment tables before creating or approving a loan.</p>
              </Link>
            </section>
          </article>
        </section>
      </section>

      <section className="dashboard-overview__operator">
        <div className="dashboard-overview__operatorHeader">
          <div>
            <h2 className="section-title title-offset">Recent applications and due-soon work</h2>
            <p className="muted">
              Keep the operating queue visible without mixing it into the capital and receivable summaries.
            </p>
          </div>
        </div>

        <section className="dashboard-overview__contentGrid">
          <div className="dashboard-overview__mainColumn">
            <div className="dashboard-overview__sectionHead">
              <h2>Recent Applications</h2>
              <Link href="/loan-applications">View all history</Link>
            </div>

            <div className="dashboard-overview__tableCard">
              {recentApplications.length > 0 ? (
                <table className="dashboard-overview__table">
                  <thead>
                    <tr>
                      <th>Client Name</th>
                      <th>Schedule</th>
                      <th className="dashboard-overview__tableAmount">Amount</th>
                      <th className="dashboard-overview__tableStatus">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApplications.map((application) => (
                      <tr key={application.id}>
                        <td>
                          <Link href={getApplicationHref(application)} className="dashboard-overview__clientCell">
                            <span className="dashboard-overview__avatar">
                              {getNameInitials(getApplicationName(application))}
                            </span>
                            <span className="dashboard-overview__clientName">
                              {getApplicationName(application)}
                            </span>
                          </Link>
                        </td>
                        <td>{getApplicationPlan(application)}</td>
                        <td className="dashboard-overview__tableAmount">
                          {formatCurrency(
                            (application.loanAmountMinor ?? application.principal ?? 0) / (application.loanAmountMinor ? 100 : 1),
                            application.loanProduct?.currency,
                          ).replace('.00', '')}
                        </td>
                        <td className="dashboard-overview__tableStatus">
                          <span className={getStatusClassName(application.status)}>
                            {formatLoanApplicationStatus(application.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="dashboard-overview__emptyState">
                  <span className="dashboard-overview__emptyIcon">
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

          <aside className="dashboard-overview__sideColumn">
            <div className="dashboard-overview__sectionHead">
              <h2>Tasks Due Soon</h2>
            </div>

            <div className="dashboard-overview__taskStack">
              {dueSoon.length > 0 ? (
                dueSoon.map((reminder, index) => (
                  <Link
                    key={`${reminder.loanId}-${reminder.installmentSequence}`}
                    href={`/loans/${reminder.loanId}`}
                    className={`dashboard-overview__taskCard dashboard-overview__taskCard--${getReminderTone(index)}`}
                  >
                    <span className="dashboard-overview__taskIcon">
                      <OverviewGlyph name={index === 0 ? 'shield' : index === 1 ? 'note' : 'alert'} />
                    </span>
                    <div className="dashboard-overview__taskBody">
                      <h3>
                        {reminder.borrower?.fullName || 'Borrower'} installment #{reminder.installmentSequence}
                      </h3>
                      <p>Due {formatDate(reminder.scheduledAt)} on the active collection schedule.</p>
                      <span className={`dashboard-overview__taskPill dashboard-overview__taskPill--${getReminderTone(index)}`}>
                        {index === 0 ? 'High priority' : index === 1 ? 'Recurring' : 'Follow up'}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="dashboard-overview__emptyState dashboard-overview__emptyState--compact">
                  <span className="dashboard-overview__emptyIcon">
                    <OverviewGlyph name="shield" />
                  </span>
                  <div>
                    <strong>No reminder tasks yet</strong>
                    <p>Upcoming collections will surface here when reminders are scheduled.</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </section>
      </section>
    </div>
  )
}
