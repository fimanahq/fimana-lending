'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import { Button, ConfirmationDialog, DataTable, EmptyState, ErrorState, Input, LoadingState, Pagination, TableShell } from '@/components/shared'
import { DeleteIcon, PaymentIcon, ViewIcon } from '@/components/shared/table-icons'
import { LoanPaymentDialog } from '@/components/payments'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { LoanRecord, LoanStatus } from '@/lib/types'
import { deleteLoan, listLoanRecords } from '@/services'
import { classNames } from '@/utils/class-names'
import toolbarStyles from '@/components/shared/list-toolbar.module.css'
import styles from './loan-list.module.css'

type LoanListFilter = 'all' | 'active' | 'completed' | 'pending_disbursement'

const PAGE_SIZE = 20

const STATUS_FILTERS: Array<{ label: string; value: LoanListFilter }> = [
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending_disbursement' },
  { label: 'Completed', value: 'completed' },
  { label: 'All', value: 'all' },
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
  const router = useRouter()
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [activeFilter, setActiveFilter] = useState<LoanListFilter>('active')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLoans, setTotalLoans] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentLoanId, setPaymentLoanId] = useState('')
  const [deleteLoanId, setDeleteLoanId] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  const loadLoans = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await listLoanRecords({
        status: activeFilter === 'all' ? undefined : activeFilter,
        search: debouncedQuery,
        page,
        itemsPerPage: PAGE_SIZE,
      })

      setLoans(response.items)
      setTotalLoans(response.total)
      setTotalPages(Math.max(response.totalPages, 1))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load loans')
    } finally {
      setLoading(false)
    }
  }, [activeFilter, debouncedQuery, page])

  const handleDeleteLoan = async () => {
    if (!deleteLoanId) return

    setDeleting(true)

    try {
      await deleteLoan(deleteLoanId)
      setDeleteLoanId('')

      if (loans.length === 1 && page > 1) {
        setPage((current) => Math.max(current - 1, 1))
      } else {
        await loadLoans()
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to delete loan')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    void loadLoans()
  }, [loadLoans])

  const selectedPaymentLoan = loans.find((loan) => loan.id === paymentLoanId) || null

  const openLoan = (loanId: string) => {
    router.push(`/loans/${loanId}`)
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, loanId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openLoan(loanId)
    }
  }

  return (
    <div className="stack">
      <div className={classNames('card panel', toolbarStyles.toolbar)}>
        <Input
          id="loan-borrower-search"
          label="Search borrowers"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, borrower number, mobile, or email"
        />
      </div>

      <div className="application-status-tabs" aria-label="Loan status filters">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status.value}
            type="button"
            className={activeFilter === status.value ? 'is-active' : ''}
            onClick={() => {
              setActiveFilter(status.value)
              setPage(1)
            }}
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
          title={activeFilter === 'all' ? 'No loans yet' : 'No loans match this status'}
          description={
            activeFilter === 'all'
              ? 'Approved applications appear here after they are converted and auto-disbursed.'
              : 'Try another status filter or check loan applications.'
          }
          action={<Link href="/loan-applications" className="button-secondary">Go to applications</Link>}
        />
      ) : null}

      {!loading && !error && loans.length > 0 ? (
        <>
          <TableShell label="Loans">
            <DataTable>
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Loan</th>
                  <th>Principal</th>
                  <th>Total interest</th>
                  <th>Outstanding</th>
                  <th>Next due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr
                    key={loan.id}
                    className="table-row-link"
                    tabIndex={0}
                    role="link"
                    aria-label={`Open loan ${loan.loanNumber} for ${loan.borrower.displayName}`}
                    onClick={() => openLoan(loan.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, loan.id)}
                  >
                    <td>
                      <Link
                        className="data-card__titleLink"
                        href={`/borrowers/${loan.borrower.id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {loan.borrower.displayName}
                      </Link>
                      <div className="muted micro-copy">{loan.borrower.borrowerNumber}</div>
                    </td>
                    <td>
                      <strong>{loan.loanNumber}</strong>
                      <div className="muted micro-copy">{formatLoanSchedule(loan)}</div>
                    </td>
                    <td>{formatMinorCurrency(loan.principalAmountMinor, loan.loanProduct.currency)}</td>
                    <td>{formatMinorCurrency(loan.totalInterestAmountMinor, loan.loanProduct.currency)}</td>
                    <td>{formatMinorCurrency(loan.balances.totalOutstandingAmountMinor, loan.loanProduct.currency)}</td>
                    <td>{loan.nextDueDate ? formatDate(loan.nextDueDate) : 'Completed'}</td>
                    <td>
                      <span className={getStatusClassName(loan.status)}>
                        {formatLoanStatus(loan.status)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link
                          href={`/loans/${loan.id}`}
                          className={classNames('button-ghost table-action-icon', styles.iconAction)}
                          aria-label={`View details for ${loan.loanNumber}`}
                          title="View details"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ViewIcon />
                        </Link>

                        <button
                          type="button"
                          className={classNames('button-ghost table-action-icon', styles.iconAction)}
                          aria-label={`Post payment for ${loan.loanNumber}`}
                          title="Post payment"
                          onClick={(event) => {
                            event.stopPropagation()
                            setPaymentLoanId(loan.id)
                          }}
                        >
                          <PaymentIcon />
                        </button>

                        <button
                          type="button"
                          className={classNames('button-ghost table-action-icon', styles.iconAction, styles.deleteButton)}
                          aria-label={`Delete ${loan.loanNumber}`}
                          title="Delete loan"
                          onClick={(event) => {
                            event.stopPropagation()
                            setDeleteLoanId(loan.id)
                          }}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </TableShell>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalLoans}
            itemLabel="loans"
            loading={loading}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <LoanPaymentDialog
        open={Boolean(paymentLoanId)}
        loanId={paymentLoanId}
        loanLabel={selectedPaymentLoan ? `${selectedPaymentLoan.borrower.displayName} · ${selectedPaymentLoan.loanNumber}` : undefined}
        onClose={() => setPaymentLoanId('')}
        onPaymentPosted={loadLoans}
      />

      <ConfirmationDialog
        open={Boolean(deleteLoanId)}
        title="Delete loan"
        message="Are you sure you want to delete this loan? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        confirmDisabled={deleting}
        onConfirm={handleDeleteLoan}
        onClose={() => setDeleteLoanId('')}
      />
    </div>
  )
}
