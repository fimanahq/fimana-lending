'use client'

import { Card, EmptyState, ProtectedLink as Link, TableShell } from '@/components/shared'
import { OpenLoanIcon } from '@/components/shared/table-icons'
import { formatCurrency, formatDate } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { Loan, LoanStatus } from '@/lib/types/lending'
import borrowerStyles from './borrowers.module.css'

interface BorrowerLoanHistoryProps {
  borrowerName: string
  loans: Loan[]
}

function getNextDueDate(loan: Loan) {
  return loan.installments.find((installment) => installment.status !== 'paid')?.dueDate
}

function formatLoanStatus(status: LoanStatus) {
  return status.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}

function formatLoanNextDue(loan: Loan) {
  if (loan.status === 'completed') {
    return 'Completed'
  }

  if (loan.status === 'defaulted') {
    return 'Defaulted'
  }

  const nextDueDate = getNextDueDate(loan)
  if (nextDueDate) {
    return formatDate(nextDueDate)
  }

  return 'Not scheduled'
}

export function BorrowerLoanHistory({ borrowerName, loans }: BorrowerLoanHistoryProps) {
  const activeLoans = loans.filter((loan) => loan.status === 'active')
  const defaultedLoans = loans.filter((loan) => loan.status === 'defaulted')
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
      <section className={borrowerStyles.summaryGrid} aria-label={`${borrowerName} loan history summary`}>
        <Card className={borrowerStyles.summaryCard} title="Loans">
          <strong>{loans.length}</strong>
          <span className="muted">
            {activeLoans.length} active{defaultedLoans.length > 0 ? ` · ${defaultedLoans.length} defaulted` : ''}
          </span>
        </Card>
        <Card className={borrowerStyles.summaryCard} title="Principal">
          <strong>{formatCurrency(totals.principal, currency)}</strong>
          <span className="muted">Across issued loans</span>
        </Card>
        <Card className={borrowerStyles.summaryCard} title="Interest">
          <strong>{formatCurrency(totals.totalInterest, currency)}</strong>
          <span className="muted">Backend-provided total</span>
        </Card>
        <Card className={borrowerStyles.summaryCard} title="Repayment">
          <strong>{formatCurrency(totals.totalPayment, currency)}</strong>
          <span className="muted">{completedLoans.length} completed</span>
        </Card>
      </section>

      {loans.length === 0 ? (
        <EmptyState
          title="No loan history yet"
          description="This borrower does not have an issued loan in the lending service."
          action={<Link href="/loan-applications/new" className="button-secondary">New application</Link>}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => {
                return (
                  <tr key={loan._id}>
                    <td>
                      <div className="data-card__titleLink">Loan #{loan._id.slice(-6)}</div>
                      <div className="muted micro-copy">Issued {formatDate(loan.createdAt)}</div>
                    </td>
                    <td>{formatCurrency(loan.principal, loan.currency)}</td>
                    <td>{formatCurrency(loan.totalInterest, loan.currency)}</td>
                    <td>{formatCurrency(loan.totalPayment, loan.currency)}</td>
                    <td>{formatLoanNextDue(loan)}</td>
                    <td><span className={getStatusClassName(loan.status)}>{formatLoanStatus(loan.status)}</span></td>
                    <td>
                      <Link
                        href={`/loans/${loan._id}`}
                        className="button-ghost table-action-icon"
                        aria-label={`Open loan ${loan._id.slice(-6)}`}
                        title="Open loan"
                      >
                        <OpenLoanIcon />
                      </Link>
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
