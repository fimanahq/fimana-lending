'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Button, ConfirmationDialog, DataTable, EmptyState, ErrorState, ListToolbar, LoadingState, Pagination, ProtectedLink as Link, TableShell, useToast } from '@/components/shared'
import { DeleteIcon, PaymentIcon, ViewIcon } from '@/components/shared/table-icons'
import { LoanPaymentDialog } from '@/components/payments'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import {
  buildLoanDetailPath,
  buildLoanListPath,
  type LoanListFilter,
  type LoanListState,
} from '@/lib/loan-navigation'
import { getStatusClassName } from '@/lib/status'
import type { LoanRecord, LoanStatus } from '@/lib/types/lending'
import { deleteLoan, listLoanRecords } from '@/services'
import { classNames } from '@/utils/class-names'
import styles from './loan-list.module.css'

const PAGE_SIZE = 20

const STATUS_FILTERS: Array<{ label: string; value: LoanListFilter }> = [
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Defaulted', value: 'defaulted' },
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

function formatLoanNextDue(loan: LoanRecord) {
  if (loan.nextDueDate) {
    return formatDate(loan.nextDueDate)
  }

  if (loan.status === 'completed') {
    return 'Completed'
  }

  if (loan.status === 'defaulted') {
    return 'Defaulted'
  }

  return 'Not scheduled'
}

interface LoansListProps {
  listState: LoanListState
}

export function LoansList({ listState }: LoansListProps) {
  const router = useRouter()
  const { dismiss, loading: showLoading, update } = useToast()
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [query, setQuery] = useState(listState.search)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLoans, setTotalLoans] = useState(0)
  const { page, status: activeFilter, search } = listState

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentLoanId, setPaymentLoanId] = useState('')
  const [deleteLoanId, setDeleteLoanId] = useState('')
  const [deleting, setDeleting] = useState(false)
  const loanRequestSequenceRef = useRef(0)

  useEffect(() => {
    setQuery(search)
  }, [search])

  const loadLoans = useCallback(async () => {
    const requestSequence = ++loanRequestSequenceRef.current
    setLoading(true)
    setError('')

    try {
      const response = await listLoanRecords({
        status: activeFilter === 'all' ? undefined : activeFilter,
        search,
        page,
        itemsPerPage: PAGE_SIZE,
      })

      if (requestSequence !== loanRequestSequenceRef.current) {
        return
      }

      const nextTotalPages = Math.max(response.totalPages, 1)
      if (page > nextTotalPages) {
        router.replace(buildLoanListPath({
          page: nextTotalPages,
          status: activeFilter,
          search,
        }), { scroll: false })
        return
      }

      setLoans(response.items)
      setTotalLoans(response.total)
      setTotalPages(nextTotalPages)
    } catch (caughtError) {
      if (requestSequence !== loanRequestSequenceRef.current) {
        return
      }

      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load loans')
    } finally {
      if (requestSequence === loanRequestSequenceRef.current) {
        setLoading(false)
      }
    }
  }, [activeFilter, page, router, search])

  const handleDeleteLoan = async () => {
    if (!deleteLoanId) return

    setDeleting(true)
    const toastId = showLoading('Deleting loan...')

    try {
      await deleteLoan(deleteLoanId)
      setDeleteLoanId('')
      update(toastId, 'Loan deleted.', { tone: 'success', title: 'Success' })

      if (loans.length === 1 && page > 1) {
        router.replace(buildLoanListPath({
          page: page - 1,
          status: activeFilter,
          search,
        }), { scroll: false })
      } else {
        await loadLoans()
      }
    } catch (caughtError) {
      dismiss(toastId)
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to delete loan')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    void loadLoans()

    return () => {
      loanRequestSequenceRef.current += 1
    }
  }, [loadLoans])

  const selectedPaymentLoan = loans.find((loan) => loan.id === paymentLoanId) || null
  const selectedDeleteLoan = loans.find((loan) => loan.id === deleteLoanId) || null
  const currentListPath = buildLoanListPath(listState)

  const openLoan = (loanId: string) => {
    router.push(buildLoanDetailPath(loanId, currentListPath))
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, loanId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openLoan(loanId)
    }
  }

  const applySearch = () => {
    router.push(buildLoanListPath({
      page: 1,
      status: activeFilter,
      search: query.trim(),
    }), { scroll: false })
  }

  const clearSearch = () => {
    setQuery('')
    router.push(buildLoanListPath({
      page: 1,
      status: activeFilter,
      search: '',
    }), { scroll: false })
  }

  return (
    <div className="stack">
      <ListToolbar
        activeFilter={activeFilter}
        filterLabel="Loan status filters"
        filters={STATUS_FILTERS}
        searchId="loan-borrower-search"
        searchLabel="Search loans"
        searchPlaceholder="Loan number, borrower name, mobile, or email"
        searchValue={query}
        onSearchChange={setQuery}
        onSearchSubmit={applySearch}
        onFilterChange={(status) => {
          router.push(buildLoanListPath({
            page: 1,
            status,
            search,
          }), { scroll: false })
        }}
      />

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
          title={search ? 'No loans match your search' : activeFilter === 'all' ? 'No loans yet' : 'No loans match this status'}
          description={
            search
              ? 'Clear the search or try a different status filter.'
              : activeFilter === 'all'
              ? 'Approved applications appear here after they are converted and auto-disbursed.'
              : 'Try another status filter or check loan applications.'
          }
          action={search
            ? <Button variant="ghost" onClick={clearSearch}>Clear search</Button>
            : <Link href="/loan-applications" className="button-secondary">Go to applications</Link>}
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
                  <th>Installments</th>
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
                    <td>{loan.installmentCount}</td>
                    <td>{formatMinorCurrency(loan.totalInterestAmountMinor, loan.loanProduct.currency)}</td>
                    <td>{formatMinorCurrency(loan.balances.totalOutstandingAmountMinor, loan.loanProduct.currency)}</td>
                    <td>{formatLoanNextDue(loan)}</td>
                    <td>
                      <span className={getStatusClassName(loan.status)}>
                        {formatLoanStatus(loan.status)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link
                          href={buildLoanDetailPath(loan.id, currentListPath)}
                          className={classNames('button-ghost table-action-icon mobile-table-action--duplicate-view', styles.iconAction)}
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
                          disabled={loan.status !== 'active' || loan.balances.totalOutstandingAmountMinor <= 0}
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
            getPageHref={(nextPage) => buildLoanListPath({
              page: nextPage,
              status: activeFilter,
              search,
            })}
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
        title={selectedDeleteLoan ? `Delete ${selectedDeleteLoan.loanNumber}` : 'Delete loan'}
        message={
          selectedDeleteLoan
            ? `Delete ${selectedDeleteLoan.loanNumber} for ${selectedDeleteLoan.borrower.displayName}? This removes the loan and returns its application to Submitted. This action cannot be undone.`
            : 'Delete this loan? This removes the loan and returns its application to Submitted. This action cannot be undone.'
        }
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
