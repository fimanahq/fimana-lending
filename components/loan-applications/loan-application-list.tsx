'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { formatLoanApplicationStatus, getStatusClassName, normalizeLoanApplicationStatus } from '@/lib/status'
import type { LoanApplicationStatus, LoanApplication } from '@/lib/types'
import { listLoanApplications } from '@/services'
import { Button, DataTable, EmptyState, ErrorState, LoadingState, SectionHeader, TableShell } from '@/components/shared'

const STATUS_FILTERS: Array<{ label: string; value: LoanApplicationStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
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
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [activeStatus, setActiveStatus] = useState<LoanApplicationStatus | 'all'>('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadApplications = async () => {
    setError('')
    setLoading(true)

    try {
      setApplications(await listLoanApplications())
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadApplications()
  }, [])

  const visibleApplications = useMemo(() => {
    const sorted = [...applications].sort((left, right) => right.createdAt.localeCompare(left.createdAt))

    if (activeStatus === 'all') {
      return sorted
    }

    return sorted.filter((application) => normalizeLoanApplicationStatus(application.status) === activeStatus)
  }, [activeStatus, applications])

  return (
    <div className="stack">
      <SectionHeader
        eyebrow="Loan Applications"
        title="Application queue"
        description="Track applications before they become issued loans. Approval keeps the application separate from loan creation."
        actions={<Link href="/loan-applications/new" className="button">New application</Link>}
      />

      <div className="application-status-tabs" aria-label="Application status filters">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status.value}
            type="button"
            className={activeStatus === status.value ? 'is-active' : ''}
            onClick={() => setActiveStatus(status.value)}
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
          title="No applications yet"
          description="Create an application to preview terms and submit it for review."
          action={<Link href="/loan-applications/new" className="button">New application</Link>}
        />
      ) : null}

      {!loading && !error && applications.length > 0 ? (
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleApplications.length > 0 ? (
                visibleApplications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <Link className="data-card__titleLink" href={`/loan-applications/${application.id}`}>
                        {getApplicantName(application)}
                      </Link>
                      <div className="muted micro-copy">
                        {application.applicationNumber || application.borrower?.mobileNumber || application.email || application.phone || 'No contact'}
                      </div>
                    </td>
                    <td>{formatCurrency((application.loanAmountMinor ?? application.principal ?? 0) / (application.loanAmountMinor ? 100 : 1), application.loanProduct?.currency)}</td>
                    <td>{getApplicationSchedule(application)}</td>
                    <td>{formatDate(application.startDate || application.firstPaymentDate || application.createdAt)}</td>
                    <td>
                      <span className={getStatusClassName(application.status)}>
                        {formatLoanApplicationStatus(application.status)}
                      </span>
                    </td>
                    <td>{formatDate(application.createdAt)}</td>
                    <td>
                      <Link href={`/loan-applications/${application.id}`} className="button-ghost">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="muted">No applications match this status.</td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </TableShell>
      ) : null}
    </div>
  )
}
