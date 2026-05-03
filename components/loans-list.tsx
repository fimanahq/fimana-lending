'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button, DataTable, EmptyState, ErrorState, LoadingState, TableShell } from '@/components/shared'
import { PaymentIcon, ViewIcon } from '@/components/shared/table-icons'
import { LoanPaymentDialog } from '@/components/payments'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { LoanRecord, LoanStatus } from '@/lib/types'
import { listLoanRecords } from '@/services'

type LoanListFilter = 'all' | 'active' | 'completed' | 'pending_disbursement'

const STATUS_FILTERS: Array<{ label: string; value: LoanListFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending Disbursement', value: 'pending_disbursement' },
]

function formatMinorCurrency(value: number, currency: string) {
  return formatCurrency(value / 100, currency)
}

function formatLoanStatus(status: LoanStatus) {
  return status.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}

function formatLoanSchedule(loan: LoanRecord) {
  const frequencyLabel = loan.paymentFrequency === 'monthly' ? 'Monthly' : 'Semi-monthly'
  return `${frequencyLabel} on ${loan.paymentDays.map(formatPaymentDay).join(' and ')}`
}

export function LoansList() {
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [activeFilter, setActiveFilter] = useState<LoanListFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentLoanId, setPaymentLoanId] = useState('')

  const loadLoans = async () => {
    setLoading(true)
    setError('')

    try {
      setLoans(await listLoanRecords())
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load loans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLoans()
  }, [])

  const visibleLoans = useMemo(() => {
    const sorted = [...loans].sort((left, right) => right.createdAt.localeCompare(left.createdAt))

    if (activeFilter === 'all') {
      return sorted
    }

    return sorted.filter((loan) => loan.status === activeFilter)
  }, [activeFilter, loans])

  const selectedPaymentLoan = loans.find((loan) => loan.id === paymentLoanId) || null

  return (
    <div className="stack">
      <div className="inline-actions">
        <Link href="/loan-applications" className="button-secondary">View applications</Link>
      </div>

      <div className="application-status-tabs" aria-label="Loan status filters">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status.value}
            type="button"
            className={activeFilter === status.value ? 'is-active' : ''}
            onClick={() => setActiveFilter(status.value)}
          >
            {status.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState
          title="Unable to load loans"
          description={error}
          action={<Button variant="secondary" onClick={() => void loadLoans()}>Retry</Button>}
        />
      ) : null}

      {loading ? (
        <LoadingState title="Loading loans" description="Fetching the official loan records." />
      ) : null}

      {!loading && !error && loans.length === 0 ? (
        <EmptyState
          title="No loans yet"
          description="Approved applications appear here after they are converted and auto-disbursed."
          action={<Link href="/loan-applications" className="button-secondary">Go to applications</Link>}
        />
      ) : null}

      {!loading && !error && loans.length > 0 ? (
        <TableShell label="Loans">
          <DataTable>
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Loan</th>
                <th>Principal</th>
                <th>Outstanding</th>
                <th>Next due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLoans.length > 0 ? (
                visibleLoans.map((loan) => (
                  <tr key={loan.id}>
                    <td>
                      <Link className="data-card__titleLink" href={`/loans/${loan.id}`}>
                        {loan.borrower.displayName}
                      </Link>
                      <div className="muted micro-copy">{loan.borrower.borrowerNumber}</div>
                    </td>
                    <td>
                      <strong>{loan.loanNumber}</strong>
                      <div className="muted micro-copy">{formatLoanSchedule(loan)}</div>
                    </td>
                    <td>{formatMinorCurrency(loan.principalAmountMinor, loan.loanProduct.currency)}</td>
                    <td>{formatMinorCurrency(loan.balances.totalOutstandingAmountMinor, loan.loanProduct.currency)}</td>
                    <td>{loan.nextDueDate ? formatDate(loan.nextDueDate) : 'Completed'}</td>
                    <td>
                      <span className={getStatusClassName(loan.status)}>
                        {formatLoanStatus(loan.status)}
                      </span>
                    </td>
                    <td>
                      <div className="loan-schedule__actions">
                        <Link
                          href={`/loans/${loan.id}`}
                          className="button-ghost table-action-icon loans-list__iconAction"
                          aria-label={`View details for ${loan.loanNumber}`}
                          title="View details"
                        >
                          <ViewIcon />
                        </Link>
                        <button
                          type="button"
                          className="button-ghost table-action-icon loans-list__iconAction"
                          aria-label={`Post payment for ${loan.loanNumber}`}
                          title="Post payment"
                          onClick={() => setPaymentLoanId(loan.id)}
                        >
                          <PaymentIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="muted">No loans match this status.</td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </TableShell>
      ) : null}

      <LoanPaymentDialog
        open={Boolean(paymentLoanId)}
        loanId={paymentLoanId}
        loanLabel={selectedPaymentLoan ? `${selectedPaymentLoan.borrower.displayName} · ${selectedPaymentLoan.loanNumber}` : undefined}
        onClose={() => setPaymentLoanId('')}
        onPaymentPosted={loadLoans}
      />
    </div>
  )
}
