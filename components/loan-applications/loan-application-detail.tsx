'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { formatLoanApplicationStatus, getStatusClassName, normalizeLoanApplicationStatus } from '@/lib/status'
import type { LoanApplication } from '@/lib/types'
import { getLoanApplication, updateLoanApplicationStatus } from '@/services'
import { Button, Card, EmptyState, ErrorState, LoadingState, SectionHeader } from '@/components/shared'
import { ApplicationBreakdownPreview } from '@/components/loan-applications/application-breakdown-preview'

interface LoanApplicationDetailProps {
  applicationId: string
}

function getApplicantName(application: LoanApplication) {
  return application.borrower?.displayName
    || `${application.firstName || ''} ${application.lastName || ''}`.trim()
    || 'Unnamed applicant'
}

function canCancel(application: LoanApplication) {
  const status = normalizeLoanApplicationStatus(application.status)
  return status !== 'approved' && status !== 'rejected' && status !== 'cancelled'
}

export function LoanApplicationDetail({ applicationId }: LoanApplicationDetailProps) {
  const [application, setApplication] = useState<LoanApplication | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState(false)

  const loadApplication = useCallback(async () => {
    setError('')
    setLoading(true)

    try {
      setApplication(await getLoanApplication(applicationId))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load application')
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    void loadApplication()
  }, [loadApplication])

  const handleCancel = async () => {
    if (!application) {
      return
    }

    const confirmed = window.confirm(`Cancel the application for ${getApplicantName(application)}?`)
    if (!confirmed) {
      return
    }

    setSavingStatus(true)
    setError('')

    try {
      setApplication(await updateLoanApplicationStatus(application.id, 'cancelled'))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to cancel application')
    } finally {
      setSavingStatus(false)
    }
  }

  const amount = application ? (application.loanAmountMinor ?? application.principal ?? 0) / (application.loanAmountMinor ? 100 : 1) : 0
  const cutoffs = application?.numberOfCutoffs ?? application?.gives ?? 0
  const frequency = application?.paymentType || application?.paymentFrequency
  const frequencyLabel = frequency === 'monthly' ? 'Monthly' : 'Semi-monthly'
  const firstPaymentDate = application?.startDate || application?.firstPaymentDate || application?.createdAt || ''

  if (loading) {
    return <LoadingState title="Loading application" description="Fetching borrower application details." />
  }

  if (error && !application) {
    return (
      <ErrorState
        title="Unable to load application"
        description={error}
        action={<Button variant="secondary" onClick={() => void loadApplication()}>Retry</Button>}
      />
    )
  }

  if (!application) {
    return (
      <EmptyState
        title="Application not found"
        description="The requested loan application could not be found."
        action={<Link href="/loan-applications" className="button-secondary">Back to applications</Link>}
      />
    )
  }

  return (
    <div className="stack">
      <SectionHeader
        eyebrow="Application Details"
        title={getApplicantName(application)}
        description="Review the application-stage record and backend preview snapshot before taking approval action."
        actions={
          <>
            <Link href="/loan-applications" className="button-secondary">Back</Link>
            <Link href={`/loan-applications/${application.id}/approval`} className="button">Approval</Link>
          </>
        }
      />

      {error ? <ErrorState title="Unable to update application" description={error} /> : null}

      <Card
        title="Request summary"
        actions={
          <span className={getStatusClassName(application.status)}>
            {formatLoanApplicationStatus(application.status)}
          </span>
        }
      >
        <div className="application-summary-grid">
          <div className="data-card">
            <span className="muted">Requested amount</span>
            <strong>{formatCurrency(amount, application.loanProduct?.currency)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Cutoffs</span>
            <strong>{cutoffs}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Schedule</span>
            <strong>
              {frequencyLabel} on{' '}
              {application.paymentDays.map(formatPaymentDay).join(' and ')}
            </strong>
          </div>
          <div className="data-card">
            <span className="muted">Start date</span>
            <strong>{formatDate(firstPaymentDate)}</strong>
          </div>
        </div>

        <div className="grid two">
          <div>
            <div className="muted">Email</div>
            <strong>{application.borrower?.email || application.email || 'Not provided'}</strong>
          </div>
          <div>
            <div className="muted">Phone</div>
            <strong>{application.borrower?.mobileNumber || application.phone || 'Not provided'}</strong>
          </div>
          <div>
            <div className="muted">Application number</div>
            <strong>{application.applicationNumber || application.id}</strong>
          </div>
          <div>
            <div className="muted">Loan product</div>
            <strong>{application.loanProduct?.name || application.loanProductId || 'Not provided'}</strong>
          </div>
          <div>
            <div className="muted">Created</div>
            <strong>{formatDate(application.createdAt)}</strong>
          </div>
          <div>
            <div className="muted">Reviewed</div>
            <strong>{application.reviewedAt ? formatDate(application.reviewedAt) : 'Not reviewed'}</strong>
          </div>
        </div>

        {application.purpose || application.notes ? <div className="notice">{application.purpose || application.notes}</div> : null}
        {application.reviewerRemarks || application.approvalNotes || application.rejectionReason || application.decisionNotes ? (
          <div className="notice">
            {application.reviewerRemarks || application.approvalNotes || application.rejectionReason || application.decisionNotes}
          </div>
        ) : null}

        {canCancel(application) ? (
          <div className="inline-actions">
            <Button variant="danger" disabled={savingStatus} onClick={() => void handleCancel()}>
              {savingStatus ? 'Cancelling...' : 'Cancel application'}
            </Button>
          </div>
        ) : null}
      </Card>

      <ApplicationBreakdownPreview preview={application.computedPreviewSnapshot ?? application.previewSnapshot ?? null} />
    </div>
  )
}
