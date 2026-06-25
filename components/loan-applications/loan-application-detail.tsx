'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LoanApplicationRiskMeter } from '@/components/loan-applications/loan-application-risk-meter'
import { calculateApplicationPreviewMonthlyPayment } from '@/lib/borrower-risk'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { formatLoanApplicationStatus, getStatusClassName, normalizeLoanApplicationStatus } from '@/lib/status'
import type { Borrower, LoanApplication, LoanApplicationStatus } from '@/lib/types/lending'
import { getLoanApplication, listLoanBorrowers, undoLoanApplicationApproval, updateLoanApplicationStatus } from '@/services'
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  ProtectedLink as Link,
  SearchableSelect,
  type SearchableSelectOption,
  Textarea,
  useToast,
} from '@/components/shared'
import { ApplicationBreakdownPreview } from '@/components/loan-applications/application-breakdown-preview'
import {
  getLoanApplicationFormValues,
  LoanApplicationForm,
  loanApplicationLabels,
} from '@/components/loan-applications/loan-application-form'

interface LoanApplicationDetailProps {
  applicationId: string
}

function getApplicantName(application: LoanApplication) {
  return application.borrower?.displayName
    || `${application.firstName || ''} ${application.lastName || ''}`.trim()
    || 'Unnamed applicant'
}

function formatApplicationSource(source: LoanApplication['source']) {
  return source === 'public' ? 'Public' : 'Internal'
}

function isTerminalStatus(status: LoanApplicationStatus) {
  return status === 'approved' || status === 'rejected' || status === 'cancelled' || status === 'withdrawn' || status === 'expired'
}

const editableStatuses: LoanApplicationStatus[] = ['submitted', 'under_review']

export function LoanApplicationDetail({ applicationId }: LoanApplicationDetailProps) {
  const router = useRouter()
  const { dismiss, loading: showLoading, update } = useToast()
  const [application, setApplication] = useState<LoanApplication | null>(null)
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [decisionNotes, setDecisionNotes] = useState('')
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingBorrowers, setLoadingBorrowers] = useState(true)
  const [savingStatus, setSavingStatus] = useState<LoanApplicationStatus | null>(null)
  const [approvalReferrerBorrowerId, setApprovalReferrerBorrowerId] = useState('')
  const [approvalReferralRewardAmount, setApprovalReferralRewardAmount] = useState('')

  const loadApplication = useCallback(async () => {
    setError('')
    setLoading(true)
    setLoadingBorrowers(true)

    try {
      const [loaded, borrowerRows] = await Promise.all([
        getLoanApplication(applicationId),
        listLoanBorrowers(),
      ])
      setApplication(loaded)
      setBorrowers(borrowerRows)
      setIsEditing(false)
      setDecisionNotes(
        loaded.reviewerRemarks || loaded.decisionNotes || loaded.approvalNotes || loaded.rejectionReason || '',
      )
      setApprovalReferrerBorrowerId(loaded.referral?.referrerBorrowerId ?? '')
      setApprovalReferralRewardAmount(loaded.referral?.rewardAmountMinor ? String(loaded.referral.rewardAmountMinor / 100) : '')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load application')
    } finally {
      setLoading(false)
      setLoadingBorrowers(false)
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
    const referralRewardAmountMinor = Math.round(Number(approvalReferralRewardAmount || '0') * 100)
    if (status === 'approved') {
      if (!Number.isFinite(referralRewardAmountMinor) || referralRewardAmountMinor < 0) {
        setError('Referral reward must be zero or greater')
        setSavingStatus(null)
        return
      }

      if (referralRewardAmountMinor > 0 && !approvalReferrerBorrowerId) {
        setError('Referrer is required when referral reward is greater than zero')
        setSavingStatus(null)
        return
      }

      if (approvalReferrerBorrowerId && approvalReferrerBorrowerId === application.borrowerId) {
        setError('Referrer cannot be the application borrower')
        setSavingStatus(null)
        return
      }
    }
    const toastId = showLoading(status === 'approved' ? 'Approving application...' : 'Rejecting application...')

    try {
      const updated = await updateLoanApplicationStatus(application.id, status, {
        reviewerRemarks: decisionNotes.trim() || undefined,
        referrerBorrowerId: status === 'approved' ? approvalReferrerBorrowerId || null : undefined,
        referralRewardAmountMinor: status === 'approved' ? referralRewardAmountMinor : undefined,
      })
      setApplication(updated)
      setDecisionNotes(
        updated.reviewerRemarks || updated.decisionNotes || updated.approvalNotes || updated.rejectionReason || decisionNotes,
      )
      setApprovalReferrerBorrowerId(updated.referral?.referrerBorrowerId ?? '')
      setApprovalReferralRewardAmount(updated.referral?.rewardAmountMinor ? String(updated.referral.rewardAmountMinor / 100) : '')
      if (status === 'approved' && updated.loanId) {
        update(toastId, 'Application approved.', { tone: 'success', title: 'Success' })
        router.push(`/loans/${updated.loanId}`)
        return
      }

      update(toastId, `Application marked ${formatLoanApplicationStatus(updated.status)}.`, { tone: 'success', title: 'Success' })
    } catch (caughtError) {
      dismiss(toastId)
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update application')
    } finally {
      setSavingStatus(null)
    }
  }

  const handleUndoApproval = async () => {
    if (!application) {
      return
    }

    setSavingStatus('submitted')
    setError('')
    const toastId = showLoading('Undoing approval...')

    try {
      const updated = await undoLoanApplicationApproval(application.id)
      setApplication(updated)
      setDecisionNotes(
        updated.reviewerRemarks || updated.decisionNotes || updated.approvalNotes || updated.rejectionReason || decisionNotes,
      )
      update(toastId, 'Approval undone. Application returned to Submitted.', { tone: 'success', title: 'Success' })
    } catch (caughtError) {
      dismiss(toastId)
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to undo approval')
    } finally {
      setSavingStatus(null)
    }
  }

  const amount = application ? (application.loanAmountMinor ?? application.principal ?? 0) / (application.loanAmountMinor ? 100 : 1) : 0
  const cutoffs = application?.numberOfCutoffs ?? application?.gives ?? 0
  const frequency = application?.paymentType || application?.paymentFrequency
  const frequencyLabel = frequency === 'monthly' ? 'Monthly' : 'Semi-Monthly'
  const firstPaymentDate = application?.startDate || application?.firstPaymentDate || application?.createdAt || ''
  const interestRate = application?.interestRate ?? application?.computedPreviewSnapshot?.interestRate ?? null
  const applicationPurpose = application?.purpose?.trim() || application?.notes?.trim() || ''

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
  const preview = application.computedPreviewSnapshot ?? application.previewSnapshot ?? null
  const hasPreview = Boolean(preview)
  const proposedMonthlyPayment = calculateApplicationPreviewMonthlyPayment(preview)
  const canReview = normalizedStatus === 'submitted' || normalizedStatus === 'under_review'
  const canEdit = editableStatuses.includes(normalizedStatus)
  const canUndoApproval = normalizedStatus === 'approved'
  const reviewDisabled = terminal || !hasPreview || !canReview || Boolean(savingStatus) || isEditing
  const referral = application.referral
  const referrerOptions: SearchableSelectOption[] = borrowers
    .filter((borrower) => borrower.id !== application.borrowerId)
    .map((borrower) => ({
      label: `${borrower.fullName} (${borrower.borrowerNumber})`,
      value: borrower.id,
    }))

  const cancelEditing = () => {
    setIsEditing(false)
    setError('')
  }

  return (
    <div className="stack">
      <div className="inline-actions">
        {application.loanId ? <Link href={`/loans/${application.loanId}`} className="button">Open loan</Link> : null}
        <Link href="/loan-applications" className="button-secondary">Back</Link>
      </div>
      {error ? <ErrorState title="Unable to update application" description={error} /> : null}

      <Card
        title="Loan application summary"
        actions={
          <div className="inline-actions">
            <span className={getStatusClassName(application.status)}>
              {formatLoanApplicationStatus(application.status)}
            </span>
            {canUndoApproval ? (
              <Button variant="secondary" onClick={() => void handleUndoApproval()} disabled={Boolean(savingStatus) || isEditing}>
                {savingStatus === 'submitted' ? 'Undoing approval...' : 'Undo approval'}
              </Button>
            ) : null}
            {canEdit && !isEditing ? (
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="application-summary-grid">
          <div className="data-card">
            <span className="muted">Borrower</span>
            <strong>{getApplicantName(application)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">{loanApplicationLabels.loanAmount}</span>
            <strong>{formatCurrency(amount, application.loanProduct?.currency)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">{loanApplicationLabels.numberOfInstallments}</span>
            <strong>{cutoffs}</strong>
          </div>
          <div className="data-card">
            <span className="muted">{loanApplicationLabels.paymentFrequency}</span>
            <strong>
              {frequencyLabel} on{' '}
              {application.paymentDays.map(formatPaymentDay).join(' and ')}
            </strong>
          </div>
          <div className="data-card">
            <span className="muted">{loanApplicationLabels.startDate}</span>
            <strong>{formatDate(firstPaymentDate)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">{loanApplicationLabels.interestRate}</span>
            <strong>{interestRate !== null ? `${interestRate}%` : 'Not returned'}</strong>
          </div>
        </div>

        <div className="grid two">
          <div>
            <div className="muted">Email Address</div>
            <strong>{application.borrower?.email || application.email || 'Not provided'}</strong>
          </div>
          <div>
            <div className="muted">Phone Number</div>
            <strong>{application.borrower?.mobileNumber || application.phone || 'Not provided'}</strong>
          </div>
          <div>
            <div className="muted">Monthly Income</div>
            <strong>
              {application.borrower?.income !== null && application.borrower?.income !== undefined
                ? formatCurrency(application.borrower.income, application.loanProduct?.currency)
                : 'Not provided'}
            </strong>
          </div>
          <div>
            <div className="muted">Source</div>
            <strong>{formatApplicationSource(application.source)}</strong>
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

        {applicationPurpose ? (
          <div>
            <div className="muted">Loan purpose</div>
            <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>{applicationPurpose}</div>
          </div>
        ) : null}
        {referral && referral.status !== 'none' ? (
          <div className="application-summary-grid">
            <div className="data-card">
              <span className="muted">Referrer</span>
              <strong>{referral.referrerDisplayName || 'Not selected'}</strong>
            </div>
            <div className="data-card">
              <span className="muted">Referral reward</span>
              <strong>{formatCurrency(referral.rewardAmountMinor / 100, application.loanProduct?.currency)}</strong>
            </div>
            <div className="data-card">
              <span className="muted">Applied</span>
              <strong>{formatCurrency(referral.appliedAmountMinor / 100, application.loanProduct?.currency)}</strong>
            </div>
            <div className="data-card">
              <span className="muted">Unapplied</span>
              <strong>{formatCurrency(referral.unappliedAmountMinor / 100, application.loanProduct?.currency)}</strong>
            </div>
          </div>
        ) : null}
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
          <div className="grid two">
            <SearchableSelect
              id="approvalReferrer"
              label="Referrer"
              placeholder="No referrer"
              options={referrerOptions}
              value={approvalReferrerBorrowerId}
              loading={loadingBorrowers}
              disabled={loadingBorrowers || Boolean(savingStatus)}
              emptyMessage="No borrowers match your search"
              onChange={setApprovalReferrerBorrowerId}
            />
            <Input
              id="approvalReferralReward"
              label="Referral reward"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              inputClassName="input-no-spinner"
              value={approvalReferralRewardAmount}
              disabled={Boolean(savingStatus)}
              onChange={(event) => setApprovalReferralRewardAmount(event.target.value)}
            />
          </div>
        ) : null}

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

      <LoanApplicationRiskMeter
        currency={application.loanProduct?.currency}
        monthlyIncome={application.borrower?.income}
        proposedMonthlyPayment={proposedMonthlyPayment}
      />

      <Dialog
        id="loan-application-edit-dialog"
        title="Edit loan application"
        description="Update the application terms and regenerate the preview."
        open={isEditing}
        onClose={cancelEditing}
        className="loan-application-edit-dialog"
      >
        <LoanApplicationForm
          applicationId={application.id}
          borrowers={borrowers}
          initialValues={getLoanApplicationFormValues(application)}
          loadingBorrowers={loadingBorrowers}
          mode="edit"
          onCancel={cancelEditing}
          onSaved={(updated) => {
            setApplication(updated)
            setApprovalReferrerBorrowerId(updated.referral?.referrerBorrowerId ?? '')
            setApprovalReferralRewardAmount(updated.referral?.rewardAmountMinor ? String(updated.referral.rewardAmountMinor / 100) : '')
            if (updated.borrower) {
              setBorrowers((current) => current.map((borrower) => (
                borrower.id === updated.borrower?.id
                  ? { ...borrower, income: updated.borrower.income ?? null }
                  : borrower
              )))
            }
            setIsEditing(false)
            setError('')
          }}
          showCard={false}
        />
      </Dialog>

      <ApplicationBreakdownPreview
        borrowerName={getApplicantName(application)}
        calculationMethod={application.calculationMethod}
        preview={preview}
      />
    </div>
  )
}
