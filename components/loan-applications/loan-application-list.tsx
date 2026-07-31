'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { formatLoanApplicationStatus, getStatusClassName } from '@/lib/status'
import type { LoanApplicationStatus, LoanApplication } from '@/lib/types/lending'
import { deleteLoanApplication, listLoanApplications } from '@/services'
import { Button, ConfirmationDialog, DataTable, EmptyState, ErrorState, Input, LoadingState, Pagination, ProtectedLink as Link, TableShell, useToast } from '@/components/shared'
import { DeleteIcon, ViewIcon } from '@/components/shared/table-icons'
import { classNames } from '@/utils/class-names'
import toolbarStyles from '@/components/shared/list-toolbar.module.css'

type LoanApplicationQueueFilter = 'all' | Extract<LoanApplicationStatus, 'submitted' | 'approved' | 'rejected'>

const PAGE_SIZE = 20

const STATUS_FILTERS: Array<{ label: string; value: LoanApplicationQueueFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

function getApplicantName(application: LoanApplication) {
  return application.borrower?.displayName
    || `${application.firstName || ''} ${application.lastName || ''}`.trim()
    || 'Unnamed applicant'
}

function getApplicationSchedule(application: LoanApplication) {
  const frequency = application.paymentType || application.paymentFrequency
  const frequencyLabel = frequency === 'monthly' ? 'Monthly' : 'Semi-monthly'
  return `${frequencyLabel} on ${application.paymentDays.map(formatPaymentDay).join(' and ')}`
}

export function LoanApplicationList() {
  const router = useRouter()
  const { dismiss, loading: showLoading, update } = useToast()
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [activeStatus, setActiveStatus] = useState<LoanApplicationQueueFilter>('all')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalApplications, setTotalApplications] = useState(0)
  const [error, setError] = useState('')
  const [deleteApplicationId, setDeleteApplicationId] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  const loadApplications = useCallback(async () => {
    setError('')
    setLoading(true)

    try {
      const response = await listLoanApplications({
        status: activeStatus === 'all' ? undefined : activeStatus,
        search: debouncedQuery,
        page,
        itemsPerPage: PAGE_SIZE,
      })

      setApplications(response.items)
      setTotalApplications(response.total)
      setTotalPages(Math.max(response.totalPages, 1))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan applications')
    } finally {
      setLoading(false)
    }
  }, [activeStatus, debouncedQuery, page])

  useEffect(() => {
    void loadApplications()
  }, [loadApplications])

  const openApplication = (applicationId: string) => {
    router.push(`/loan-applications/${applicationId}`)
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, applicationId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openApplication(applicationId)
    }
  }

  const handleDeleteApplication = async () => {
    if (!deleteApplicationId) {
      return
    }

    setDeleting(true)
    setError('')
    const toastId = showLoading('Deleting application...')

    try {
      await deleteLoanApplication(deleteApplicationId)
      setDeleteApplicationId('')
      update(toastId, 'Application deleted.', { tone: 'success', title: 'Success' })

      if (applications.length === 1 && page > 1) {
        setPage((currentPage) => Math.max(currentPage - 1, 1))
      } else {
        await loadApplications()
      }
    } catch (caughtError) {
      dismiss(toastId)
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to delete application')
    } finally {
      setDeleting(false)
    }
  }

  const selectedDeleteApplication = applications.find((application) => application.id === deleteApplicationId) || null

  return (
    <div className="stack">
      <div className={classNames('card panel', toolbarStyles.toolbar)}>
        <Input
          id="application-borrower-search"
          label="Search borrowers"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, borrower number, mobile, or email"
        />

        <div className={classNames('inline-actions', toolbarStyles.actions)}>
          <Link href="/loan-applications/new" className="button">New application</Link>
        </div>
      </div>

      <div className="application-status-tabs" aria-label="Application status filters">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status.value}
            type="button"
            className={activeStatus === status.value ? 'is-active' : ''}
            onClick={() => {
              setActiveStatus(status.value)
              setPage(1)
            }}
          >
            {status.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState
          title="Unable to load applications"
          description={error}
          action={<Button variant="secondary" onClick={() => void loadApplications()}>Retry</Button>}
        />
      ) : null}

      {loading ? (
        <LoadingState title="Loading applications" description="Fetching the latest application-stage records." />
      ) : null}

      {!loading && !error && applications.length === 0 ? (
        <EmptyState
          title={activeStatus === 'all' ? 'No applications yet' : 'No applications match this status'}
          description={
            activeStatus === 'all'
              ? 'Create an application to preview terms and submit it for review.'
              : 'Try another status filter or create a new application.'
          }
          action={<Link href="/loan-applications/new" className="button">New application</Link>}
        />
      ) : null}

      {!loading && !error && applications.length > 0 ? (
        <>
          <TableShell label="Loan applications">
            <DataTable>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Amount</th>
                  <th>Schedule</th>
                  <th>First Payment</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr
                    key={application.id}
                    className="table-row-link"
                    tabIndex={0}
                    role="link"
                    aria-label={`Open application for ${getApplicantName(application)}`}
                    onClick={() => openApplication(application.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, application.id)}
                  >
                    <td>
                      <Link
                        className="data-card__titleLink"
                        href={application.borrower?.id ? `/borrowers/${application.borrower.id}` : `/loan-applications/${application.id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {getApplicantName(application)}
                      </Link>
                      <div className="muted micro-copy">
                        {application.applicationNumber || application.borrower?.mobileNumber || application.email || application.phone || 'No contact'}
                      </div>
                    </td>
                    <td>
                      {formatCurrency(
                        (application.loanAmountMinor ?? application.principal ?? 0) / (application.loanAmountMinor ? 100 : 1),
                        application.loanProduct?.currency,
                      )}
                    </td>
                    <td>{getApplicationSchedule(application)}</td>
                    <td>{formatDate(application.startDate || application.firstPaymentDate || application.createdAt)}</td>
                    <td>
                      <span className={getStatusClassName(application.status)}>
                        {formatLoanApplicationStatus(application.status)}
                      </span>
                    </td>
                    <td>{formatDate(application.createdAt)}</td>
                    <td>
                      <div className="inline-actions">
                        <Link
                          href={`/loan-applications/${application.id}`}
                          className="button-ghost table-action-icon"
                          aria-label={`View application details for ${getApplicantName(application)}`}
                          title="View details"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ViewIcon />
                        </Link>

                        {application.status === 'submitted' ? (
                          <button
                            type="button"
                            className="button-ghost table-action-icon ui-button--danger"
                            aria-label={`Delete application for ${getApplicantName(application)}`}
                            title="Delete application"
                            onClick={(event) => {
                              event.stopPropagation()
                              setDeleteApplicationId(application.id)
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <DeleteIcon />
                          </button>
                        ) : null}
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
            totalItems={totalApplications}
            itemLabel="applications"
            loading={loading}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <ConfirmationDialog
        open={Boolean(deleteApplicationId)}
        title={selectedDeleteApplication ? `Delete ${selectedDeleteApplication.applicationNumber || 'application'}` : 'Delete application'}
        message={
          selectedDeleteApplication
            ? `Delete submitted application for ${getApplicantName(selectedDeleteApplication)}? This action cannot be undone.`
            : 'Delete this submitted application? This action cannot be undone.'
        }
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        destructive
        confirmDisabled={deleting}
        onConfirm={() => void handleDeleteApplication()}
        onClose={() => {
          if (!deleting) {
            setDeleteApplicationId('')
          }
        }}
      />
    </div>
  )
}
