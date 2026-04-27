'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/format'
import { formatLoanApplicationStatus, getStatusClassName, normalizeLoanApplicationStatus } from '@/lib/status'
import type { LoanApplicationStatus, LoanApplication } from '@/lib/types'
import { getLoanApplication, updateLoanApplicationStatus } from '@/services'
import { Button, Card, EmptyState, ErrorState, LoadingState, SectionHeader, Textarea } from '@/components/shared'
import { ApplicationBreakdownPreview } from '@/components/loan-applications/application-breakdown-preview'

interface LoanApplicationApprovalProps {
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

export function LoanApplicationApproval({ applicationId }: LoanApplicationApprovalProps) {
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
      setDecisionNotes(loaded.reviewerRemarks || loaded.decisionNotes || '')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load application')
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    void loadApplication()
  }, [loadApplication])

  const handleStatusUpdate = async (status: LoanApplicationStatus) => {
    if (!application) {
      return
    }

    setSavingStatus(status)
    setError('')
    setMessage('')

    try {
      const updated = await updateLoanApplicationStatus(application.id, status, decisionNotes.trim() || undefined)
      setApplication(updated)
      setDecisionNotes(updated.reviewerRemarks || updated.decisionNotes || decisionNotes)
      setMessage(`Application marked ${formatLoanApplicationStatus(updated.status)}.`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update application')
    } finally {
      setSavingStatus(null)
    }
  }

  if (loading) {
    return <LoadingState title="Loading approval screen" description="Fetching application and preview snapshot." />
  }

  if (error && !application) {
    return (
      <ErrorState
        title="Unable to load approval screen"
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
  const approvalDisabled = terminal || !hasPreview || normalizedStatus !== 'under_review' || Boolean(savingStatus)
  const amount = (application.loanAmountMinor ?? application.principal ?? 0) / (application.loanAmountMinor ? 100 : 1)

  return (
    <div className="stack">
      <SectionHeader
        eyebrow="Approval"
        title={getApplicantName(application)}
        description="Approve or reject the application record only. Loan issuance remains a separate flow."
        actions={<Link href={`/loan-applications/${application.id}`} className="button-secondary">Back to detail</Link>}
      />

      {message ? <div className="notice">{message}</div> : null}
      {error ? <ErrorState title="Unable to save decision" description={error} /> : null}

      <Card
        title="Decision"
        description="Approval updates the application status and preserves the application-stage record."
        actions={
          <span className={getStatusClassName(application.status)}>
            {formatLoanApplicationStatus(application.status)}
          </span>
        }
      >
        <div className="application-summary-grid application-summary-grid--compact">
          <div className="data-card">
            <span className="muted">Requested amount</span>
            <strong>{formatCurrency(amount, application.loanProduct?.currency)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Preview snapshot</span>
            <strong>{hasPreview ? 'Available' : 'Missing'}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Current status</span>
            <strong>{formatLoanApplicationStatus(application.status)}</strong>
          </div>
        </div>

        {!hasPreview ? (
          <div className="notice danger">
            This application has no backend preview snapshot. Recreate or update it before approval.
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

        <div className="application-form-actions">
          <Button
            variant="secondary"
            disabled={terminal || normalizedStatus !== 'submitted' || Boolean(savingStatus)}
            onClick={() => void handleStatusUpdate('under_review')}
          >
            {savingStatus === 'under_review' ? 'Saving...' : 'Mark under review'}
          </Button>
          <Button
            disabled={approvalDisabled}
            onClick={() => void handleStatusUpdate('approved')}
          >
            {savingStatus === 'approved' ? 'Approving...' : 'Approve application'}
          </Button>
          <Button
            variant="danger"
            disabled={terminal || normalizedStatus !== 'under_review' || Boolean(savingStatus)}
            onClick={() => void handleStatusUpdate('rejected')}
          >
            {savingStatus === 'rejected' ? 'Rejecting...' : 'Reject application'}
          </Button>
        </div>
      </Card>

      <ApplicationBreakdownPreview preview={application.computedPreviewSnapshot ?? application.previewSnapshot ?? null} />
    </div>
  )
}
