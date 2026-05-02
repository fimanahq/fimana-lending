import Link from 'next/link'
import { DashboardPortfolioChart } from '@/components/dashboard-portfolio-chart'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { formatLoanApplicationStatus, getStatusClassName } from '@/lib/status'
import type { LoanApplication } from '@/lib/types'
import type { DashboardOverviewData } from '@/components/dashboard-overview-data'

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

export function DashboardOverview({ data }: { data: DashboardOverviewData }) {
  const { summary, progressSegments, recentApplications, dueSoon, partialFailureNotice } = data
  const dashboardCurrency = summary.currency

  return (
    <div className="dashboard-overview stack">
      <section className="dashboard-overview__executive">
        <div className="dashboard-overview__executiveHeader">
          <div>
            <div className="eyebrow">Executive summary</div>
            <h1 className="section-title title-offset">Capital position and lending exposure</h1>
            <p className="muted">
              Track starting capital, collected interest, cash on hand, and principal currently deployed to borrowers.
            </p>
          </div>
        </div>

        {partialFailureNotice ? <div className="notice dashboard-overview__notice">{partialFailureNotice}</div> : null}

        <section className="dashboard-overview__kpiGrid">
          <article className="dashboard-overview__statCard dashboard-overview__statCard--plain">
            <span className="dashboard-overview__statLabel">Starting Capital</span>
            <strong className="dashboard-overview__statValue">
              {formatCurrency(summary.startingCapital, dashboardCurrency)}
            </strong>
            <span className="dashboard-overview__statMeta">
              Baseline capital configured in workspace settings
            </span>
            <span className="dashboard-overview__statSubvalue">Used as the base for current cash and exposure</span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="money" />
            </div>
          </article>

          <article className="dashboard-overview__statCard dashboard-overview__statCard--tinted">
            <span className="dashboard-overview__statLabel">Collected Interest</span>
            <strong className="dashboard-overview__statValue">
              {formatCurrency(summary.profitCollected, dashboardCurrency)}
            </strong>
            <span className="dashboard-overview__statMeta">
              Realized interest from fully paid installments only
            </span>
            <span className="dashboard-overview__statSubvalue">
              {formatCurrency(summary.remainingProjectedInterest, dashboardCurrency)} still projected but not yet collected
            </span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="trend" />
            </div>
          </article>

          <article className="dashboard-overview__statCard dashboard-overview__statCard--sage">
            <span className="dashboard-overview__statLabel">Cash on Hand</span>
            <strong className="dashboard-overview__statValue">
              {formatCurrency(summary.availableCash, dashboardCurrency)}
            </strong>
            <span className="dashboard-overview__statMeta">
              Current capital minus principal still out with borrowers
            </span>
            <span className="dashboard-overview__statSubvalue">
              {formatCurrency(summary.capitalBasis, dashboardCurrency)} capital basis from starting capital + collected interest
            </span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="shield" />
            </div>
          </article>

          <article className="dashboard-overview__statCard dashboard-overview__statCard--ink">
            <span className="dashboard-overview__statLabel">Money with Borrowers</span>
            <strong className="dashboard-overview__statValue">
              {formatCurrency(summary.capitalOutstanding, dashboardCurrency)}
            </strong>
            <span className="dashboard-overview__statMeta dashboard-overview__statMeta--contrast">
              Principal outstanding only across {summary.activeLoans.toLocaleString('en-PH')} active loan{summary.activeLoans === 1 ? '' : 's'}
            </span>
            <span className="dashboard-overview__statSubvalue dashboard-overview__statSubvalue--contrast">
              {summary.pendingReviews > 0
                ? `${summary.pendingReviews} pending review${summary.pendingReviews === 1 ? '' : 's'} still in the intake queue`
                : 'No pending reviews waiting in the intake queue'}
            </span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="applications" />
            </div>
          </article>
        </section>

        <article className="dashboard-overview__progressCard">
          <div className="dashboard-overview__progressHeader">
            <div>
              <span className="dashboard-overview__statLabel">Capital Position</span>
              <h2>Cash on hand vs money with borrowers</h2>
              <p>
                The chart uses your starting capital plus collected interest as the capital basis, then separates available cash from principal still deployed.
              </p>
            </div>
            <div className="dashboard-overview__progressSummary">
              <span className="dashboard-overview__progressSummaryLabel">Current capital basis</span>
              <strong>{formatCurrency(summary.capitalBasis, dashboardCurrency)}</strong>
              <span>{formatCurrency(summary.profitCollected, dashboardCurrency)} collected interest added back</span>
            </div>
          </div>

          <div className="dashboard-overview__progressBody">
            {summary.capitalBasis > 0 || summary.capitalOutstanding > 0 ? (
              <DashboardPortfolioChart
                currency={dashboardCurrency}
                capitalBasis={summary.capitalBasis}
                segments={progressSegments}
                totalProfitBooked={summary.totalProfitBooked}
                remainingProjectedInterest={summary.remainingProjectedInterest}
              />
            ) : (
              <div className="dashboard-overview__emptyState dashboard-overview__emptyState--compact">
                <span className="dashboard-overview__emptyIcon">
                  <OverviewGlyph name="trend" />
                </span>
                <div>
                  <strong>No capital baseline yet</strong>
                  <p>Set a starting capital amount or release a loan to begin tracking cash on hand and principal with borrowers.</p>
                </div>
              </div>
            )}

            {summary.availableCash < 0 ? (
              <div className="notice">
                Cash on hand is negative by {formatCurrency(Math.abs(summary.availableCash), dashboardCurrency)}. Principal deployed is currently higher than starting capital plus collected interest.
              </div>
            ) : null}

            <div className="dashboard-overview__progressLegend">
              {progressSegments.map((segment) => (
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
                  <div className="dashboard-overview__progressLegendValue">{formatCurrency(segment.value, dashboardCurrency)}</div>
                  <p>{segment.description}</p>
                </article>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-overview__operator">
        <div className="dashboard-overview__operatorHeader">
          <div>
            <div className="eyebrow">Operator cockpit</div>
            <h2 className="section-title title-offset">Day-to-day actions and due-soon work</h2>
            <p className="muted">
              Keep origination moving, review recent intake, and stay ahead of reminders that need attention.
            </p>
          </div>
        </div>

        <section className="dashboard-overview__actionsRow">
          <Link href="/loan-applications/new" className="dashboard-overview__actionCard">
            <span className="dashboard-overview__actionIcon dashboard-overview__actionIcon--amber">
              <OverviewGlyph name="plus" />
            </span>
            <h2>Create a new application</h2>
            <p>Start the official origination flow from application intake through approval, conversion, and disbursement.</p>
          </Link>

          <Link href="/loan-applications" className="dashboard-overview__actionCard">
            <span className="dashboard-overview__actionIcon dashboard-overview__actionIcon--green">
              <OverviewGlyph name="applications" />
            </span>
            <h2>Review applications</h2>
            <p>
              {summary.pendingReviews > 0
                ? `${summary.pendingReviews} pending application${summary.pendingReviews === 1 ? '' : 's'} need a review decision.`
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
            <p>Preview cutoff dates, per-give interest, and the full repayment table before you create or approve a loan.</p>
          </Link>
        </section>

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
                    <p>New borrower applications will appear here once the public intake form is used.</p>
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
