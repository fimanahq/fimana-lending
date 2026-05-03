'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { formatLoanApplicationStatus, getStatusClassName, normalizeLoanApplicationStatus } from '@/lib/status'
import type { LoanApplication, LoanApplicationStatus } from '@/lib/types'
import { getLoanApplication, updateLoanApplicationStatus } from '@/services'
import { Button, Card, EmptyState, ErrorState, LoadingState, Textarea } from '@/components/shared'
import { ApplicationBreakdownPreview } from '@/components/loan-applications/application-breakdown-preview'

interface LoanApplicationDetailProps {
  applicationId: string
}

function getApplicantName(application: LoanApplication) {
  return application.borrower?.displayName
    || `${application.firstName || ''} ${application.lastName || ''}`.trim()
    || 'Unnamed applicant'
}

function isTerminalStatus(status: LoanApplicationStatus) {
  return status === 'approved' || status === 'rejected' || status === 'cancelled' || status === 'withdrawn' || status === 'expired'
}

export function LoanApplicationDetail({ applicationId }: LoanApplicationDetailProps) {
  const router = useRouter()
  const [application, setApplication] = useState<LoanApplication | null>(null)
  const [decisionNotes, setDecisionNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [savingStatus, setSavingStatus] = useState<LoanApplicationStatus | null>(null)

  const loadApplication = useCallback(async () => {
    setError('')
    setLoading(true)

    try {
      const loaded = await getLoanApplication(applicationId)
      setApplication(loaded)
      setDecisionNotes(
        loaded.reviewerRemarks || loaded.decisionNotes || loaded.approvalNotes || loaded.rejectionReason || '',
      )
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load application')
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    void loadApplication()
  }, [loadApplication])

  const handleDecision = async (status: Extract<LoanApplicationStatus, 'approved' | 'rejected'>) => {
    if (!application) {
      return
    }

    setSavingStatus(status)
    setError('')
    setMessage('')

    try {
      const updated = await updateLoanApplicationStatus(application.id, status, decisionNotes.trim() || undefined)
      setApplication(updated)
      setDecisionNotes(
        updated.reviewerRemarks || updated.decisionNotes || updated.approvalNotes || updated.rejectionReason || decisionNotes,
      )
      if (status === 'approved' && updated.loanId) {
        router.push(`/loans/${updated.loanId}`)
        return
      }

      setMessage(`Application marked ${formatLoanApplicationStatus(updated.status)}.`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update application')
    } finally {
      setSavingStatus(null)
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

  const normalizedStatus = normalizeLoanApplicationStatus(application.status)
  const terminal = isTerminalStatus(normalizedStatus)
  const hasPreview = Boolean(application.computedPreviewSnapshot || application.previewSnapshot)
  const canReview = normalizedStatus === 'submitted' || normalizedStatus === 'under_review'
  const reviewDisabled = terminal || !hasPreview || !canReview || Boolean(savingStatus)

  return (
    <div className="stack">
      <div className="inline-actions">
        {application.loanId ? <Link href={`/loans/${application.loanId}`} className="button">Open loan</Link> : null}
        <Link href="/loan-applications" className="button-secondary">Back</Link>
      </div>

      {message ? <div className="notice">{message}</div> : null}
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

        {!hasPreview ? (
          <div className="notice danger">
            This application has no backend preview snapshot. Recreate or update it before taking a decision.
          </div>
        ) : null}

        {terminal ? (
          <div className="notice">This application already has a final decision.</div>
        ) : null}

        <Textarea
          id="applicationDecisionNotes"
          label="Decision notes"
          value={decisionNotes}
          onChange={(event) => setDecisionNotes(event.target.value)}
        />

        {canReview ? (
          <div className="inline-actions">
            <Button disabled={reviewDisabled} onClick={() => void handleDecision('approved')}>
              {savingStatus === 'approved' ? 'Approving...' : 'Approve application'}
            </Button>
            <Button variant="danger" disabled={reviewDisabled} onClick={() => void handleDecision('rejected')}>
              {savingStatus === 'rejected' ? 'Rejecting...' : 'Reject application'}
            </Button>
          </div>
        ) : null}
      </Card>

      <ApplicationBreakdownPreview preview={application.computedPreviewSnapshot ?? application.previewSnapshot ?? null} />
    </div>
  )
}
