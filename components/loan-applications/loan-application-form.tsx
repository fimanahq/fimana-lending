'use client'

import { useEffect, useMemo, useState, type FormEvent, type WheelEvent } from 'react'
import { useRouter } from 'next/navigation'
import type {
  Borrower,
  LoanApplicationCutoffPatternCode,
  LoanApplicationDraftInput,
  LoanApplicationPaymentType,
  LoanApplication,
} from '@/lib/types'
import {
  createLoanApplication,
  updateLoanApplicationDraft,
  updateLoanApplicationStatus,
  listLendingBorrowers,
} from '@/services'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  SectionHeader,
  Select,
  Textarea,
} from '@/components/shared'
import { ApplicationBreakdownPreview } from '@/components/loan-applications/application-breakdown-preview'

const initialForm = {
  borrowerId: '',
  loanProductId: '',
  loanAmount: '',
  numberOfCutoffs: '2',
  startDate: '',
  paymentType: 'semi_monthly' as LoanApplicationPaymentType,
  cutoffPatternCode: '15_30' as LoanApplicationCutoffPatternCode,
  purpose: '',
}

function pesosToMinor(value: string) {
  return Math.round(Number(value) * 100)
}

function getDraftPayload(form: typeof initialForm): LoanApplicationDraftInput {
  return {
    borrowerId: form.borrowerId,
    loanProductId: form.loanProductId.trim(),
    loanAmountMinor: pesosToMinor(form.loanAmount),
    numberOfCutoffs: Number(form.numberOfCutoffs),
    startDate: form.startDate,
    paymentType: form.paymentType,
    cutoffPatternCode: form.paymentType === 'semi_monthly' ? form.cutoffPatternCode : null,
    purpose: form.purpose.trim() || undefined,
  }
}

function validateForm(form: typeof initialForm) {
  if (!form.borrowerId) {
    return 'Borrower is required'
  }

  if (!form.loanProductId.trim()) {
    return 'Loan product ID is required'
  }

  const amountMinor = pesosToMinor(form.loanAmount)
  if (!Number.isFinite(amountMinor) || amountMinor < 1) {
    return 'Requested amount must be greater than zero'
  }

  const cutoffs = Number(form.numberOfCutoffs)
  if (!Number.isInteger(cutoffs) || cutoffs < 1) {
    return 'Number of cutoffs must be a whole number of at least 1'
  }

  if (!form.startDate) {
    return 'Start date is required'
  }

  return ''
}

export function LoanApplicationForm() {
  const router = useRouter()
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [draft, setDraft] = useState<LoanApplication | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)
  const [loadingBorrowers, setLoadingBorrowers] = useState(true)
  const [previewing, setPreviewing] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const validationError = useMemo(() => validateForm(form), [form])
  const preview = draft?.computedPreviewSnapshot ?? null

  useEffect(() => {
    const loadBorrowers = async () => {
      try {
        const rows = await listLendingBorrowers()
        setBorrowers(rows)
        setForm((current) => ({ ...current, borrowerId: current.borrowerId || rows[0]?.id || '' }))
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load borrowers')
      } finally {
        setLoadingBorrowers(false)
      }
    }

    void loadBorrowers()
  }, [])

  const preventWheelValueChange = (event: WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur()
  }

  const updateForm = (updates: Partial<typeof initialForm>) => {
    setForm((current) => ({ ...current, ...updates }))
    setError('')
  }

  const handlePreview = async () => {
    setShowValidation(true)
    setError('')

    if (validationError) {
      return
    }

    setPreviewing(true)

    try {
      const payload = getDraftPayload(form)
      const updatedDraft = draft
        ? await updateLoanApplicationDraft(draft.id, payload)
        : await createLoanApplication(payload)

      setDraft(updatedDraft)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to preview application')
    } finally {
      setPreviewing(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setShowValidation(true)
    setError('')

    if (validationError) {
      return
    }

    if (!draft) {
      setError('Run the backend calculation preview before submitting this application.')
      return
    }

    setSubmitting(true)

    try {
      const submitted = await updateLoanApplicationStatus(draft.id, 'submitted')
      router.push(`/loan-applications/${submitted.id}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="stack">
      <SectionHeader
        eyebrow="New Application"
        title="Create loan application"
        description="Create a draft to compute the backend preview, then submit it for review."
      />

      {error ? <ErrorState title="Application not ready" description={error} /> : null}
      {showValidation && validationError ? (
        <ErrorState title="Missing application details" description={validationError} />
      ) : null}

      {loadingBorrowers ? (
        <LoadingState title="Loading borrowers" description="Fetching borrower records for the application." />
      ) : null}

      {!loadingBorrowers && borrowers.length === 0 ? (
        <EmptyState title="No active borrowers found" description="Create a borrower before starting a loan application." />
      ) : null}

      <div className="application-workspace-grid">
        <Card title="Application form" description="This creates an application-stage record, not a loan record.">
          <form className="stack" onSubmit={handleSubmit}>
            <Select
              id="applicationBorrower"
              label="Borrower"
              value={form.borrowerId}
              disabled={loadingBorrowers || borrowers.length === 0}
              onChange={(event) => updateForm({ borrowerId: event.target.value })}
            >
              <option value="">Select borrower</option>
              {borrowers.map((borrower) => (
                <option key={borrower.id} value={borrower.id}>
                  {borrower.fullName} ({borrower.borrowerNumber})
                </option>
              ))}
            </Select>

            <Input
              id="applicationLoanProduct"
              label="Loan product ID"
              value={form.loanProductId}
              hint="The updated API requires an active loanProductId. Add a product picker when the backend exposes loan products."
              onChange={(event) => updateForm({ loanProductId: event.target.value })}
            />

            <div className="grid two">
              <Input
                id="applicationPrincipal"
                label="Requested amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                inputClassName="input-no-spinner"
                value={form.loanAmount}
                onWheel={preventWheelValueChange}
                onChange={(event) => updateForm({ loanAmount: event.target.value })}
              />
              <Input
                id="applicationCutoffs"
                label="Number of cutoffs"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                inputClassName="input-no-spinner"
                value={form.numberOfCutoffs}
                onWheel={preventWheelValueChange}
                onChange={(event) => updateForm({ numberOfCutoffs: event.target.value })}
              />
            </div>

            <div className="grid two">
              <Input
                id="applicationStartDate"
                label="Start date"
                type="date"
                value={form.startDate}
                onChange={(event) => updateForm({ startDate: event.target.value })}
              />
              <Select
                id="applicationFrequency"
                label="Payment type"
                value={form.paymentType}
                onChange={(event) =>
                  updateForm({ paymentType: event.target.value as LoanApplicationPaymentType })
                }
              >
                <option value="monthly">Monthly</option>
                <option value="semi_monthly">Semi-monthly</option>
              </Select>
            </div>

            {form.paymentType === 'semi_monthly' ? (
              <Select
                id="applicationCutoffPattern"
                label="Cutoff pattern"
                value={form.cutoffPatternCode}
                onChange={(event) =>
                  updateForm({ cutoffPatternCode: event.target.value as LoanApplicationCutoffPatternCode })
                }
              >
                <option value="15_30">15th + 30th</option>
                <option value="5_20">5th + 20th</option>
              </Select>
            ) : null}

            <Textarea
              id="applicationPurpose"
              label="Purpose"
              value={form.purpose}
              onChange={(event) => updateForm({ purpose: event.target.value })}
            />

            <div className="application-form-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={previewing || submitting || borrowers.length === 0}
                onClick={() => void handlePreview()}
              >
                {previewing ? 'Previewing...' : draft ? 'Refresh preview' : 'Preview breakdown'}
              </Button>
              <Button type="submit" disabled={submitting || !draft}>
                {submitting ? 'Submitting...' : 'Submit application'}
              </Button>
            </div>

            {draft ? (
              <p className="muted micro-copy">
                Draft {draft.applicationNumber || draft.id} has a backend-computed preview snapshot.
              </p>
            ) : null}
          </form>
        </Card>

        <ApplicationBreakdownPreview preview={preview} />
      </div>
    </div>
  )
}
