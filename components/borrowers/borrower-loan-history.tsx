'use client'

import Link from 'next/link'
import { Card, EmptyState, TableShell } from '@/components/shared'
import { formatCurrency, formatDate } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { Loan } from '@/lib/types'

interface BorrowerLoanHistoryProps {
  borrowerName: string
  loans: Loan[]
}

function getNextDueDate(loan: Loan) {
  return loan.installments.find((installment) => installment.status !== 'paid')?.dueDate
}

export function BorrowerLoanHistory({ borrowerName, loans }: BorrowerLoanHistoryProps) {
  const activeLoans = loans.filter((loan) => loan.status === 'active')
  const completedLoans = loans.filter((loan) => loan.status === 'completed')
  const totals = loans.reduce(
    (summary, loan) => ({
      principal: summary.principal + loan.principal,
      totalInterest: summary.totalInterest + loan.totalInterest,
      totalPayment: summary.totalPayment + loan.totalPayment,
    }),
    { principal: 0, totalInterest: 0, totalPayment: 0 },
  )
  const currency = loans[0]?.currency || 'PHP'

  return (
    <div className="stack">
      <section className="borrower-summary-grid" aria-label={`${borrowerName} loan history summary`}>
        <Card className="borrower-summary-card" title="Loans">
          <strong>{loans.length}</strong>
          <span className="muted">{activeLoans.length} active</span>
        </Card>
        <Card className="borrower-summary-card" title="Principal">
          <strong>{formatCurrency(totals.principal, currency)}</strong>
          <span className="muted">Across issued loans</span>
        </Card>
        <Card className="borrower-summary-card" title="Interest">
          <strong>{formatCurrency(totals.totalInterest, currency)}</strong>
          <span className="muted">Backend-provided total</span>
        </Card>
        <Card className="borrower-summary-card" title="Repayment">
          <strong>{formatCurrency(totals.totalPayment, currency)}</strong>
          <span className="muted">{completedLoans.length} completed</span>
        </Card>
      </section>

      {loans.length === 0 ? (
        <EmptyState
          title="No loan history yet"
          description="This borrower does not have an issued loan in the lending service."
          action={<Link href="/loans/new" className="button-secondary">Create loan</Link>}
        />
      ) : (
        <TableShell label={`${borrowerName} loan history`}>
          <table>
            <thead>
              <tr>
                <th>Loan</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Total repayment</th>
                <th>Next due</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => {
                const nextDueDate = getNextDueDate(loan)

                return (
                  <tr key={loan._id}>
                    <td>
                      <div className="data-card__titleLink">Loan #{loan._id.slice(-6)}</div>
                      <div className="muted micro-copy">Issued {formatDate(loan.createdAt)}</div>
                    </td>
                    <td>{formatCurrency(loan.principal, loan.currency)}</td>
                    <td>{formatCurrency(loan.totalInterest, loan.currency)}</td>
                    <td>{formatCurrency(loan.totalPayment, loan.currency)}</td>
                    <td>{nextDueDate ? formatDate(nextDueDate) : 'Complete'}</td>
                    <td><span className={getStatusClassName(loan.status)}>{loan.status}</span></td>
                    <td>
                      <Link href={`/loans/${loan._id}`} className="button-ghost">Open loan</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableShell>
      )}
    </div>
  )
}
