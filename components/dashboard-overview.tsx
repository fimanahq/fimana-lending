import Link from 'next/link'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { LoanRequest } from '@/lib/types'
import type { DashboardOverviewData, DashboardProgressSegment } from '@/components/dashboard-overview-data'

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`
}

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'FM'
}

function getRequestPlan(request: LoanRequest) {
  const frequency = request.paymentFrequency === 'monthly' ? 'Monthly' : 'Twice monthly'
  const days = request.paymentDays.map(formatPaymentDay).join(' and ')
  return `${frequency} · ${days}`
}

function getRequestHref(request: LoanRequest) {
  return request.loanId ? `/loans/${request.loanId}` : '/loan-applications'
}

function getReminderTone(index: number) {
  return ['amber', 'green', 'olive'][index % 3]
}

function getProgressToneColor(tone: DashboardProgressSegment['tone']) {
  switch (tone) {
    case 'green':
      return '#2d6b59'
    case 'amber':
      return '#b96d2a'
    case 'olive':
      return '#5f7153'
    default:
      return '#b96d2a'
  }
}

function OverviewGlyph({
  name,
}: {
  name: 'plus' | 'requests' | 'rules' | 'trend' | 'money' | 'shield' | 'note' | 'alert'
}) {
  switch (name) {
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
    case 'requests':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 6h10M7 12h10M7 18h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 6h.01M4 12h.01M4 18h.01" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
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

function DashboardProgressGraphic({
  segments,
  totalProjectedValue,
}: {
  segments: DashboardProgressSegment[]
  totalProjectedValue: number
}) {
  if (totalProjectedValue <= 0) {
    return (
      <div className="dashboard-overview__emptyState dashboard-overview__emptyState--compact">
        <span className="dashboard-overview__emptyIcon">
          <OverviewGlyph name="trend" />
        </span>
        <div>
          <strong>No portfolio progress yet</strong>
          <p>Issue a loan to start tracking recovered principal, open capital, and remaining projected interest.</p>
        </div>
      </div>
    )
  }

  const geometry = segments.reduce<Array<DashboardProgressSegment & { x: number; width: number }>>((all, segment) => {
    const previous = all[all.length - 1]
    const x = previous ? previous.x + previous.width : 0
    all.push({
      ...segment,
      x,
      width: segment.percentage,
    })
    return all
  }, [])

  const ariaLabel = segments
    .map((segment) => `${segment.label}: ${formatPercentage(segment.percentage)}, ${formatCurrency(segment.value)}`)
    .join('. ')

  return (
    <div className="dashboard-overview__progressBody">
      <div className="dashboard-overview__progressBarShell">
        <svg
          className="dashboard-overview__progressBar"
          viewBox="0 0 100 14"
          preserveAspectRatio="none"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <clipPath id="dashboard-overview-progress-clip">
              <rect x="0" y="0" width="100" height="14" rx="7" ry="7" />
            </clipPath>
          </defs>
          <rect x="0" y="0" width="100" height="14" rx="7" ry="7" fill="rgba(111, 93, 61, 0.12)" />
          <g clipPath="url(#dashboard-overview-progress-clip)">
            {geometry.map((segment) => (
              <rect
                key={segment.key}
                x={segment.x}
                y="0"
                width={segment.width}
                height="14"
                fill={getProgressToneColor(segment.tone)}
              />
            ))}
          </g>
          {geometry.map((segment) => (
            segment.width >= 12 ? (
              <text
                key={`${segment.key}-label`}
                x={segment.x + (segment.width / 2)}
                y="8.9"
                textAnchor="middle"
                fill="#fffaf4"
                fontSize="3.1"
                fontWeight="700"
              >
                {formatPercentage(segment.percentage)}
              </text>
            ) : null
          ))}
        </svg>
      </div>

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
            <div className="dashboard-overview__progressLegendValue">{formatCurrency(segment.value)}</div>
            <p>{segment.description}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

export function DashboardOverview({ data }: { data: DashboardOverviewData }) {
  const { summary, progressSegments, recentRequests, dueSoon, partialFailureNotice } = data

  return (
    <div className="dashboard-overview stack">
      <section className="dashboard-overview__executive">
        <div className="dashboard-overview__executiveHeader">
          <div>
            <div className="eyebrow">Executive summary</div>
            <h1 className="section-title title-offset">Business health and portfolio progress</h1>
            <p className="muted">
              Track realized returns, expected yield, capital still on the street, and the current portfolio load at a glance.
            </p>
          </div>
        </div>

        {partialFailureNotice ? <div className="notice dashboard-overview__notice">{partialFailureNotice}</div> : null}

        <section className="dashboard-overview__kpiGrid">
          <article className="dashboard-overview__statCard dashboard-overview__statCard--plain">
            <span className="dashboard-overview__statLabel">Profit Collected</span>
            <strong className="dashboard-overview__statValue">
              {formatCurrency(summary.profitCollected)}
            </strong>
            <span className="dashboard-overview__statMeta dashboard-overview__statMeta--positive">
              Realized interest from fully paid installments
            </span>
            <span className="dashboard-overview__statSubvalue">Exact realized interest</span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="trend" />
            </div>
          </article>

          <article className="dashboard-overview__statCard dashboard-overview__statCard--tinted">
            <span className="dashboard-overview__statLabel">Total Profit Booked</span>
            <strong className="dashboard-overview__statValue">
              {formatCurrency(summary.totalProfitBooked)}
            </strong>
            <span className="dashboard-overview__statMeta">
              Expected interest across issued non-cancelled loans
            </span>
            <span className="dashboard-overview__statSubvalue">Exact booked interest</span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="money" />
            </div>
          </article>

          <article className="dashboard-overview__statCard dashboard-overview__statCard--sage">
            <span className="dashboard-overview__statLabel">Capital Outstanding</span>
            <strong className="dashboard-overview__statValue">
              {formatCurrency(summary.capitalOutstanding)}
            </strong>
            <span className="dashboard-overview__statMeta">
              Unpaid principal only across active schedules
            </span>
            <span className="dashboard-overview__statSubvalue">Exact unpaid principal</span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="shield" />
            </div>
          </article>

          <article className="dashboard-overview__statCard dashboard-overview__statCard--ink">
            <span className="dashboard-overview__statLabel">Portfolio Load</span>
            <strong className="dashboard-overview__statValue">
              {summary.activeLoans.toLocaleString('en-PH')}
            </strong>
            <span className="dashboard-overview__statMeta dashboard-overview__statMeta--contrast">
              {summary.pendingReviews > 0
                ? `${summary.pendingReviews} pending review${summary.pendingReviews === 1 ? '' : 's'} in the intake queue`
                : 'No pending reviews waiting in the intake queue'}
            </span>
            <span className="dashboard-overview__statSubvalue dashboard-overview__statSubvalue--contrast">
              Active loans currently under management
            </span>
            <div className="dashboard-overview__statArtwork" aria-hidden="true">
              <OverviewGlyph name="requests" />
            </div>
          </article>
        </section>

        <article className="dashboard-overview__progressCard">
          <div className="dashboard-overview__progressHeader">
            <div>
              <span className="dashboard-overview__statLabel">Repayment Progress</span>
              <h2>Capital recovered vs open exposure</h2>
              <p>
                Portfolio-state view of capital already recovered, principal still outstanding, and remaining projected interest.
              </p>
            </div>
            <div className="dashboard-overview__progressSummary">
              <span className="dashboard-overview__progressSummaryLabel">Projected portfolio value</span>
              <strong>{formatCurrency(summary.totalProjectedValue)}</strong>
              <span>{formatCurrency(summary.totalIssuedPrincipal)} principal issued</span>
            </div>
          </div>

          <DashboardProgressGraphic
            segments={progressSegments}
            totalProjectedValue={summary.totalProjectedValue}
          />
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
          <Link href="/loans/new" className="dashboard-overview__actionCard">
            <span className="dashboard-overview__actionIcon dashboard-overview__actionIcon--amber">
              <OverviewGlyph name="plus" />
            </span>
            <h2>Create a new loan</h2>
            <p>Start a fresh origination flow for a borrower ready to move into underwriting and issuance.</p>
          </Link>

          <Link href="/loan-applications" className="dashboard-overview__actionCard">
            <span className="dashboard-overview__actionIcon dashboard-overview__actionIcon--green">
              <OverviewGlyph name="requests" />
            </span>
            <h2>Review requests</h2>
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
        </section>

        <section className="dashboard-overview__contentGrid">
          <div className="dashboard-overview__mainColumn">
            <div className="dashboard-overview__sectionHead">
              <h2>Recent Applications</h2>
              <Link href="/loan-applications">View all history</Link>
            </div>

            <div className="dashboard-overview__tableCard">
              {recentRequests.length > 0 ? (
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
                    {recentRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <Link href={getRequestHref(request)} className="dashboard-overview__clientCell">
                            <span className="dashboard-overview__avatar">
                              {getInitials(request.firstName, request.lastName)}
                            </span>
                            <span className="dashboard-overview__clientName">
                              {request.firstName} {request.lastName}
                            </span>
                          </Link>
                        </td>
                        <td>{getRequestPlan(request)}</td>
                        <td className="dashboard-overview__tableAmount">
                          {formatCurrency(request.principal).replace('.00', '')}
                        </td>
                        <td className="dashboard-overview__tableStatus">
                          <span className={getStatusClassName(request.status)}>{request.status}</span>
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
                    <p>New borrower requests will appear here once the public intake form is used.</p>
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
