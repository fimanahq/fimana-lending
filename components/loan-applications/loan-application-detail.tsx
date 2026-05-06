'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type FormEvent, type WheelEvent } from 'react'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { buildLoanDueDates, buildPaymentDays } from '@/lib/loan-schedule'
import { formatLoanApplicationStatus, getStatusClassName, normalizeLoanApplicationStatus } from '@/lib/status'
import type { Borrower, LoanApplication, LoanApplicationPaymentType, LoanApplicationStatus } from '@/lib/types'
import { getLoanApplication, listLoanBorrowers, updateLoanApplication, updateLoanApplicationStatus } from '@/services'
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, Select, Textarea } from '@/components/shared'
import { ApplicationBreakdownPreview } from '@/components/loan-applications/application-breakdown-preview'

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

function minorToPesos(value?: number) {
  return value ? String(value / 100) : ''
}

function pesosToMinor(value: string) {
  return Math.round(Number(value) * 100)
}

function getDateParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }

  const [, yearRaw, monthRaw, dayRaw] = match
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  const lastDay = new Date(Date.UTC(year, month, 0, 12)).getUTCDate()

  return { year, month, day, lastDay }
}

function deriveSemiMonthlyPaymentDaysFromStartDate(startDate: string) {
  const parts = getDateParts(startDate)
  if (!parts) {
    return null
  }

  const firstPaymentDay = String(parts.day)

  if (parts.day === 15) {
    return {
      firstPaymentDay,
      secondPaymentDay: 'month_end',
    }
  }

  const startDateValue = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12))
  const secondDateValue = new Date(startDateValue)
  secondDateValue.setUTCDate(secondDateValue.getUTCDate() + 15)

  return {
    firstPaymentDay,
    secondPaymentDay: String(secondDateValue.getUTCDate()),
  }
}

function deriveMonthlyPaymentDayFromStartDate(startDate: string) {
  const parts = getDateParts(startDate)
  return parts ? String(parts.day) : null
}

function mapLegacyCutoffToPaymentDays(cutoffPatternCode?: LoanApplication['cutoffPatternCode'] | null) {
  if (cutoffPatternCode === '5_20') {
    return ['5', '20'] as const
  }

  if (cutoffPatternCode === '15_month_end') {
    return ['15', 'month_end'] as const
  }

  return null
}

function getApplicationEditForm(application: LoanApplication) {
  const paymentType = (application.paymentType || (application.paymentFrequency === 'monthly' ? 'monthly' : 'semi_monthly')) as LoanApplicationPaymentType
  const legacyPaymentDays = mapLegacyCutoffToPaymentDays(application.cutoffPatternCode)
  const selectedPaymentDays = application.paymentDays.length > 0
    ? application.paymentDays
    : legacyPaymentDays ?? []
  const startDate = application.startDate || application.firstPaymentDate || ''
  const startDateParts = getDateParts(startDate)
  const derivedSemiMonthlyDays = deriveSemiMonthlyPaymentDaysFromStartDate(startDate)
  const defaultMonthlyDay = startDateParts ? String(startDateParts.day) : '15'
  const [firstPaymentDay = defaultMonthlyDay, secondPaymentDay = 'month_end'] = paymentType === 'semi_monthly'
    ? derivedSemiMonthlyDays
      ? [derivedSemiMonthlyDays.firstPaymentDay, derivedSemiMonthlyDays.secondPaymentDay]
      : (selectedPaymentDays.length >= 2 ? selectedPaymentDays : (legacyPaymentDays ?? ['15', 'month_end']))
    : [selectedPaymentDays[0] || defaultMonthlyDay, selectedPaymentDays[1] || 'month_end']

  return {
    borrowerId: application.borrowerId || application.borrower?.id || '',
    loanAmount: minorToPesos(application.loanAmountMinor ?? (application.principal ? application.principal * 100 : 0)),
    numberOfCutoffs: String(application.numberOfCutoffs ?? application.gives ?? 1),
    startDate,
    paymentType,
    firstPaymentDay,
    secondPaymentDay,
    purpose: application.purpose || application.notes || '',
  }
}

export function LoanApplicationDetail({ applicationId }: LoanApplicationDetailProps) {
  const router = useRouter()
  const [application, setApplication] = useState<LoanApplication | null>(null)
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [decisionNotes, setDecisionNotes] = useState('')
  const [editForm, setEditForm] = useState(() => getApplicationEditForm({
    id: '',
    paymentDays: [],
    status: 'submitted',
    createdAt: '',
  } as LoanApplication))
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingBorrowers, setLoadingBorrowers] = useState(true)
  const [message, setMessage] = useState('')
  const [savingEdits, setSavingEdits] = useState(false)
  const [savingStatus, setSavingStatus] = useState<LoanApplicationStatus | null>(null)

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
      setEditForm(getApplicationEditForm(loaded))
      setIsEditing(false)
      setDecisionNotes(
        loaded.reviewerRemarks || loaded.decisionNotes || loaded.approvalNotes || loaded.rejectionReason || '',
      )
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

  const updateEditForm = (updates: Partial<typeof editForm>) => {
    setEditForm((current) => ({ ...current, ...updates }))
    setError('')
    setMessage('')
  }

  const updateStartDate = (startDate: string) => {
    setEditForm((current) => {
      if (current.paymentType === 'monthly') {
        const derivedMonthlyPaymentDay = deriveMonthlyPaymentDayFromStartDate(startDate)
        return {
          ...current,
          startDate,
          firstPaymentDay: derivedMonthlyPaymentDay ?? current.firstPaymentDay,
          secondPaymentDay: derivedMonthlyPaymentDay ?? current.secondPaymentDay,
        }
      }

      const derivedSemiMonthlyDays = deriveSemiMonthlyPaymentDaysFromStartDate(startDate)
      if (!derivedSemiMonthlyDays) {
        return { ...current, startDate }
      }

      return {
        ...current,
        startDate,
        firstPaymentDay: derivedSemiMonthlyDays.firstPaymentDay,
        secondPaymentDay: derivedSemiMonthlyDays.secondPaymentDay,
      }
    })
    setError('')
    setMessage('')
  }

  const preventWheelValueChange = (event: WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur()
  }

  const validateEditForm = () => {
    if (!editForm.borrowerId) {
      return 'Borrower is required'
    }

    const loanAmountMinor = pesosToMinor(editForm.loanAmount)
    if (!Number.isFinite(loanAmountMinor) || loanAmountMinor < 1) {
      return 'Requested amount must be greater than zero'
    }

    const numberOfCutoffs = Number(editForm.numberOfCutoffs)
    if (!Number.isInteger(numberOfCutoffs) || numberOfCutoffs < 1) {
      return 'Number of cutoffs must be a whole number of at least 1'
    }

    if (!editForm.startDate) {
      return 'Start date is required'
    }

    if (editForm.paymentType === 'semi_monthly' && editForm.firstPaymentDay === editForm.secondPaymentDay) {
      return 'Choose two different payment days for a semi-monthly schedule'
    }

    const paymentDays = buildPaymentDays(
      editForm.paymentType,
      editForm.firstPaymentDay,
      editForm.secondPaymentDay,
    )

    try {
      buildLoanDueDates(1, editForm.paymentType, paymentDays, editForm.startDate)
    } catch (caughtError) {
      return caughtError instanceof Error ? caughtError.message : 'Start date must match one of the selected payment days'
    }

    return ''
  }

  const handleSaveEdits = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!application) {
      return
    }

    const validationError = validateEditForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setSavingEdits(true)
    setError('')
    setMessage('')

    try {
      const updated = await updateLoanApplication(application.id, {
        borrowerId: editForm.borrowerId,
        loanAmountMinor: pesosToMinor(editForm.loanAmount),
        numberOfCutoffs: Number(editForm.numberOfCutoffs),
        startDate: editForm.startDate,
        paymentType: editForm.paymentType,
        paymentDays: buildPaymentDays(
          editForm.paymentType,
          editForm.firstPaymentDay,
          editForm.secondPaymentDay,
        ),
        purpose: editForm.purpose.trim(),
      })

      setApplication(updated)
      setEditForm(getApplicationEditForm(updated))
      setIsEditing(false)
      setMessage('Application updated.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update application')
    } finally {
      setSavingEdits(false)
    }
  }

  const amount = application ? (application.loanAmountMinor ?? application.principal ?? 0) / (application.loanAmountMinor ? 100 : 1) : 0
  const cutoffs = application?.numberOfCutoffs ?? application?.gives ?? 0
  const frequency = application?.paymentType || application?.paymentFrequency
  const frequencyLabel = frequency === 'monthly' ? 'Monthly' : 'Semi-monthly'
  const firstPaymentDate = application?.startDate || application?.firstPaymentDate || application?.createdAt || ''
  const computedPaymentDays = buildPaymentDays(
    editForm.paymentType,
    editForm.firstPaymentDay,
    editForm.secondPaymentDay,
  )
  const computedPaymentDates = (() => {
    if (!editForm.startDate) {
      return { first: '', second: '' }
    }

    try {
      const dueDates = buildLoanDueDates(2, editForm.paymentType, computedPaymentDays, editForm.startDate)
      return {
        first: dueDates[0] ? formatDate(dueDates[0]) : '',
        second: dueDates[1] ? formatDate(dueDates[1]) : '',
      }
    } catch {
      return { first: '', second: '' }
    }
  })()

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
  const canEdit = editableStatuses.includes(normalizedStatus)
  const reviewDisabled = terminal || !hasPreview || !canReview || Boolean(savingStatus) || isEditing || savingEdits

  const cancelEditing = () => {
    setEditForm(getApplicationEditForm(application))
    setIsEditing(false)
    setError('')
  }

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
          <div className="inline-actions">
            <span className={getStatusClassName(application.status)}>
              {formatLoanApplicationStatus(application.status)}
            </span>
            {canEdit && !isEditing ? (
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            ) : null}
          </div>
        }
      >
        {isEditing ? (
          <form className="stack" onSubmit={handleSaveEdits}>
            <Select
              id="editApplicationBorrower"
              label="Borrower"
              value={editForm.borrowerId}
              disabled={loadingBorrowers || borrowers.length === 0}
              onChange={(event) => updateEditForm({ borrowerId: event.target.value })}
            >
              <option value="">Select borrower</option>
              {borrowers.map((borrower) => (
                <option key={borrower.id} value={borrower.id}>
                  {borrower.fullName} ({borrower.borrowerNumber})
                </option>
              ))}
            </Select>

            <div className="grid two">
              <Input
                id="editApplicationPrincipal"
                label="Requested amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                inputClassName="input-no-spinner"
                value={editForm.loanAmount}
                onWheel={preventWheelValueChange}
                onChange={(event) => updateEditForm({ loanAmount: event.target.value })}
              />
            </div>

            <div className="grid two">
              <Input
                id="editApplicationCutoffs"
                label="Number of cutoffs"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                inputClassName="input-no-spinner"
                value={editForm.numberOfCutoffs}
                onWheel={preventWheelValueChange}
                onChange={(event) => updateEditForm({ numberOfCutoffs: event.target.value })}
              />
              <Select
                id="editApplicationFrequency"
                label="Payment type"
                value={editForm.paymentType}
                onChange={(event) => {
                  const nextPaymentType = event.target.value as LoanApplicationPaymentType
                  if (nextPaymentType === 'monthly') {
                    const derivedMonthlyPaymentDay = deriveMonthlyPaymentDayFromStartDate(editForm.startDate)
                    updateEditForm({
                      paymentType: nextPaymentType,
                      firstPaymentDay: derivedMonthlyPaymentDay ?? editForm.firstPaymentDay,
                      secondPaymentDay: derivedMonthlyPaymentDay ?? editForm.secondPaymentDay,
                    })
                    return
                  }

                  const derivedSemiMonthlyDays = deriveSemiMonthlyPaymentDaysFromStartDate(editForm.startDate)
                  updateEditForm({
                    paymentType: nextPaymentType,
                    firstPaymentDay: derivedSemiMonthlyDays?.firstPaymentDay ?? editForm.firstPaymentDay,
                    secondPaymentDay: derivedSemiMonthlyDays?.secondPaymentDay ?? editForm.secondPaymentDay,
                  })
                }}
              >
                <option value="monthly">Monthly</option>
                <option value="semi_monthly">Semi-monthly</option>
              </Select>
            </div>

            {editForm.paymentType === 'monthly' ? (
              <div className="grid two">
                <Input
                  id="editApplicationStartDate"
                  label="Start date"
                  type="date"
                  value={editForm.startDate}
                  onChange={(event) => updateStartDate(event.target.value)}
                />
                <Input
                  id="editApplicationMonthlyPaymentDayComputed"
                  label="Monthly payment day"
                  type="text"
                  value={computedPaymentDates.first}
                  readOnly
                />
              </div>
            ) : (
              <div className="grid two">
                <Input
                  id="editApplicationStartDate"
                  label="Start date"
                  type="date"
                  value={editForm.startDate}
                  onChange={(event) => updateStartDate(event.target.value)}
                />
                <div />
              </div>
            )}

            {editForm.paymentType === 'semi_monthly' ? (
              <div className="grid two">
                <Input
                  id="editApplicationFirstPaymentDateComputed"
                  label="First payment day"
                  type="text"
                  value={computedPaymentDates.first}
                  readOnly
                />
                <Input
                  id="editApplicationSecondPaymentDateComputed"
                  label="Second payment day"
                  type="text"
                  value={computedPaymentDates.second}
                  readOnly
                />
              </div>
            ) : null}

            <Textarea
              id="editApplicationPurpose"
              label="Purpose"
              value={editForm.purpose}
              onChange={(event) => updateEditForm({ purpose: event.target.value })}
            />

            <div className="inline-actions">
              <Button type="submit" disabled={savingEdits || Boolean(savingStatus) || borrowers.length === 0}>
                {savingEdits ? 'Saving...' : 'Save application'}
              </Button>
              <Button type="button" variant="ghost" disabled={savingEdits} onClick={cancelEditing}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="application-summary-grid">
              <div className="data-card">
                <span className="muted">Borrower</span>
                <strong>{getApplicantName(application)}</strong>
              </div>
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
                <div className="muted">Monthly income</div>
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

            {application.purpose || application.notes ? <div className="notice">{application.purpose || application.notes}</div> : null}
          </>
        )}
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
