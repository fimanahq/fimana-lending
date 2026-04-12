'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/client-api'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { Loan, LoanRequest, UpcomingLoanReminder } from '@/lib/types'

function formatCompactCurrency(value: number, currency = 'PHP') {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: value >= 1_000_000 ? 1 : 0,
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value)
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
  return request.loanId ? `/loans/${request.loanId}` : '/requests'
}

function getReminderTone(index: number) {
  return ['amber', 'green', 'olive'][index % 3]
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

export function DashboardOverview() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [requests, setRequests] = useState<LoanRequest[]>([])
  const [reminders, setReminders] = useState<UpcomingLoanReminder[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [loanResult, requestResult, reminderResult] = await Promise.allSettled([
        apiRequest<Loan[]>('/api/lendings'),
        apiRequest<LoanRequest[]>('/api/loan-requests'),
        apiRequest<UpcomingLoanReminder[]>('/api/lendings/reminders/upcoming'),
      ])

      if (loanResult.status === 'fulfilled') {
        setLoans(loanResult.value)
      }

      if (requestResult.status === 'fulfilled') {
        setRequests(requestResult.value)
      }

      if (reminderResult.status === 'fulfilled') {
        setReminders(reminderResult.value)
      }

      const failures = [loanResult, requestResult, reminderResult].filter((result) => result.status === 'rejected')
      if (failures.length > 0) {
        const firstFailure = failures[0]
        setError(
          firstFailure.status === 'rejected' && firstFailure.reason instanceof Error
            ? firstFailure.reason.message
            : 'Unable to load dashboard',
        )
      } else {
        setError('')
      }

      setLoading(false)
    }

    void load()
  }, [])

  const sortedRequests = [...requests].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const sortedReminders = [...reminders].sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0)
  const activeLoans = loans.filter((loan) => loan.status === 'active').length
  const pendingRequests = requests.filter((request) => request.status === 'pending').length
  const recentRequests = sortedRequests.slice(0, 4)
  const dueSoon = sortedReminders.slice(0, 3)

  return (
    <div className="dashboard-overview stack">
      <section className="dashboard-overview__stats">
        <article className="dashboard-overview__statCard dashboard-overview__statCard--plain">
          <span className="dashboard-overview__statLabel">Active loans</span>
          <strong className="dashboard-overview__statValue">{loading ? '...' : activeLoans.toLocaleString('en-PH')}</strong>
          <span className="dashboard-overview__statMeta dashboard-overview__statMeta--positive">
            <span className="dashboard-overview__statMetaIcon">
              <OverviewGlyph name="trend" />
            </span>
            {pendingRequests > 0 ? `${pendingRequests} pending applications need review` : 'Collections are current today'}
          </span>
        </article>

        <article className="dashboard-overview__statCard dashboard-overview__statCard--tinted">
          <span className="dashboard-overview__statLabel">Principal deployed</span>
          <strong className="dashboard-overview__statValue">{loading ? '...' : formatCompactCurrency(totalPrincipal)}</strong>
          <span className="dashboard-overview__statMeta">
            {reminders.length > 0
              ? `${reminders.length} reminder${reminders.length === 1 ? '' : 's'} queued across active loans`
              : 'No collection reminders queued'}
          </span>
          <div className="dashboard-overview__statArtwork" aria-hidden="true">
            <OverviewGlyph name="money" />
          </div>
        </article>
      </section>

      <section className="dashboard-overview__actionsRow">
        <Link href="/loans/new" className="dashboard-overview__actionCard">
          <span className="dashboard-overview__actionIcon dashboard-overview__actionIcon--amber">
            <OverviewGlyph name="plus" />
          </span>
          <h2>Create a new loan</h2>
          <p>Initiate the onboarding process for a new vetted client.</p>
        </Link>

        <Link href="/requests" className="dashboard-overview__actionCard">
          <span className="dashboard-overview__actionIcon dashboard-overview__actionIcon--green">
            <OverviewGlyph name="requests" />
          </span>
          <h2>Review requests</h2>
          <p>
            {pendingRequests > 0
              ? `Access ${pendingRequests} pending application${pendingRequests === 1 ? '' : 's'} requiring your signature.`
              : 'The public intake queue is clear and ready for the next submission.'}
          </p>
        </Link>

        <Link href="/rules" className="dashboard-overview__actionCard">
          <span className="dashboard-overview__actionIcon dashboard-overview__actionIcon--olive">
            <OverviewGlyph name="rules" />
          </span>
          <h2>Open the rules page</h2>
          <p>Modify underwriting parameters and risk thresholds.</p>
        </Link>
      </section>

      {error ? <div className="notice danger">{error}</div> : null}

      <section className="dashboard-overview__contentGrid">
        <div className="dashboard-overview__mainColumn">
          <div className="dashboard-overview__sectionHead">
            <h2>Recent Applications</h2>
            <Link href="/requests">View all history</Link>
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
          <h2>Tasks Due Soon</h2>

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

          <article className="dashboard-overview__featureCard">
            <div className="dashboard-overview__featureOverlay" aria-hidden="true" />
            <div className="dashboard-overview__featureContent">
              <h3>Lending Compliance Update</h3>
              <p>Review your internal disclosure language and repayment controls before the next approval cycle.</p>
              <Link href="/rules">Read more</Link>
            </div>
          </article>
        </aside>
      </section>
    </div>
  )
}
