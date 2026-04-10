'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/client-api'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { Loan, UpcomingLoanReminder } from '@/lib/types'

export function DashboardOverview() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [reminders, setReminders] = useState<UpcomingLoanReminder[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [loanRows, reminderRows] = await Promise.all([
          apiRequest<Loan[]>('/api/lendings'),
          apiRequest<UpcomingLoanReminder[]>('/api/lendings/reminders/upcoming'),
        ])

        setLoans(loanRows)
        setReminders(reminderRows)
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load dashboard')
      }
    }

    void load()
  }, [])

  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0)
  const activeLoans = loans.filter((loan) => loan.status === 'active').length
  const dueSoon = reminders.slice(0, 4)

  return (
    <div className="stack">
      <section className="card panel">
        <div className="eyebrow">Overview</div>
        <h1 className="display-title title-offset">
          Originate faster. Collect on time. Keep every cutoff visible.
        </h1>
        <p className="muted lead-copy">
          FiMana Lending keeps your borrower roster, payment frequency, equal amortization schedule,
          and reminders in one protected workspace.
        </p>
        <div className="inline-actions actions-offset">
          <Link href="/loans/new" className="button">Create a new loan</Link>
          <Link href="/requests" className="button-secondary">Review requests</Link>
          <Link href="/rules" className="button-ghost">Open the rules page</Link>
        </div>
      </section>

      <section className="summary-grid">
        <div className="card summary-stat">
          <span className="muted">Active loans</span>
          <strong>{activeLoans}</strong>
        </div>
        <div className="card summary-stat">
          <span className="muted">Principal deployed</span>
          <strong>{formatCurrency(totalPrincipal)}</strong>
        </div>
        <div className="card summary-stat">
          <span className="muted">Upcoming reminders</span>
          <strong>{reminders.length}</strong>
        </div>
      </section>

      {error ? <div className="notice danger">{error}</div> : null}

      <section className="grid two">
        <div className="card panel">
          <div className="section-title">Recent loans</div>
          <div className="stack">
            {loans.slice(0, 5).map((loan) => (
              <Link key={loan._id} href={`/loans/${loan._id}`} className="data-card">
                <div className="row-between-start">
                  <div>
                    <div className="data-card__title">
                      {loan.borrower?.fullName || 'Borrower'}
                    </div>
                    <div className="muted">
                      {loan.paymentFrequency === 'monthly'
                        ? `Monthly on ${loan.paymentDays.map(formatPaymentDay).join(', ')}`
                        : `Twice monthly on ${loan.paymentDays.map(formatPaymentDay).join(' and ')}`}
                    </div>
                  </div>
                  <div className="data-card__aside">
                    <div>{formatCurrency(loan.totalPayment, loan.currency)}</div>
                    <div className={getStatusClassName(loan.status)}>{loan.status}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card panel">
          <div className="section-title">Next reminders</div>
          <div className="stack">
            {dueSoon.map((reminder) => (
              <div key={`${reminder.loanId}-${reminder.installmentSequence}`} className="data-card">
                <div className="row-between-start">
                  <div>
                    <div className="data-card__title">
                      {reminder.borrower?.fullName || 'Borrower'}
                    </div>
                    <div className="muted">
                      Installment #{reminder.installmentSequence} due {formatDate(reminder.scheduledAt)}
                    </div>
                  </div>
                  <Link href={`/loans/${reminder.loanId}`} className="button-ghost">
                    Open loan
                  </Link>
                </div>
              </div>
            ))}

            {dueSoon.length === 0 ? <div className="muted">No upcoming reminders yet.</div> : null}
          </div>
        </div>
      </section>
    </div>
  )
}
