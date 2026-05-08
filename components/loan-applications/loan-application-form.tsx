'use client'

import { useEffect, useMemo, useState, type FormEvent, type WheelEvent } from 'react'
import { useRouter } from 'next/navigation'
import type {
  Borrower,
  LoanApplication,
  LoanApplicationDraftInput,
  LoanApplicationPaymentType,
} from '@/lib/types'
import { buildLoanDueDates, buildPaymentDays, getBorrowerRequestSemiMonthlyFirstPaymentDate } from '@/lib/loan-schedule'
import { formatDate } from '@/lib/format'
import {
  createLoanApplication,
  listLoanBorrowers,
  updateLoanApplication,
} from '@/services'
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  SearchableSelect,
  type SearchableSelectOption,
  Textarea,
} from '@/components/shared'
import { BorrowerForm } from '@/components/borrowers/borrower-form'

export const loanApplicationLabels = {
  borrower: 'Borrower',
  firstPaymentDay: 'First Payment Day',
  loanAmount: 'Loan Amount',
  loanPurpose: 'Loan Purpose',
  numberOfInstallments: 'Number of Installments',
  paymentFrequency: 'Payment Frequency',
  secondPaymentDay: 'Second Payment Day',
  startDate: 'Start Date',
} as const

export interface LoanApplicationFormValues {
  borrowerId: string
  loanAmount: string
  numberOfInstallments: string
  startDate: string
  paymentType: LoanApplicationPaymentType
  purpose: string
}

interface LoanApplicationFormProps {
  applicationId?: string
  borrowers?: Borrower[]
  initialValues?: LoanApplicationFormValues
  loadingBorrowers?: boolean
  mode?: 'create' | 'edit'
  onCancel?: () => void
  onSaved?: (application: LoanApplication) => void
  showCard?: boolean
}

const initialFormValues: LoanApplicationFormValues = {
  borrowerId: '',
  loanAmount: '',
  numberOfInstallments: '2',
  startDate: getBorrowerRequestSemiMonthlyFirstPaymentDate(),
  paymentType: 'semi_monthly',
  purpose: '',
}

const paymentFrequencyOptions: SearchableSelectOption[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Semi-Monthly', value: 'semi_monthly' },
]

function getDateParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }

  const [, yearRaw, monthRaw, dayRaw] = match
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  return { year, month, day }
}

function derivePaymentDaysFromStartDate(startDate: string, paymentType: LoanApplicationPaymentType) {
  const parts = getDateParts(startDate)
  if (!parts) {
    return paymentType === 'monthly' ? [''] : ['', '']
  }

  const firstDay = String(parts.day)

  if (paymentType === 'monthly') {
    return [firstDay]
  }

  if (parts.day === 15) {
    return [firstDay, 'month_end']
  }

  const startDateValue = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12))
  const secondDateValue = new Date(startDateValue)
  secondDateValue.setUTCDate(secondDateValue.getUTCDate() + 15)

  return [firstDay, String(secondDateValue.getUTCDate())]
}

function pesosToMinor(value: string) {
  return Math.round(Number(value) * 100)
}

function getDraftPayload(form: LoanApplicationFormValues): LoanApplicationDraftInput {
  const [firstDay = '', secondDay = ''] = derivePaymentDaysFromStartDate(form.startDate, form.paymentType)

  return {
    borrowerId: form.borrowerId,
    loanAmountMinor: pesosToMinor(form.loanAmount),
    numberOfCutoffs: Number(form.numberOfInstallments),
    startDate: form.startDate,
    paymentType: form.paymentType,
    paymentDays: buildPaymentDays(form.paymentType, firstDay, secondDay),
    purpose: form.purpose.trim() || undefined,
  }
}

function validateForm(form: LoanApplicationFormValues) {
  if (!form.borrowerId) {
    return 'Borrower is required'
  }

  const amountMinor = pesosToMinor(form.loanAmount)
  if (!Number.isFinite(amountMinor) || amountMinor < 1) {
    return 'Loan amount must be greater than zero'
  }

  const installments = Number(form.numberOfInstallments)
  if (!Number.isInteger(installments) || installments < 1) {
    return 'Number of installments must be a whole number of at least 1'
  }

  if (!form.startDate) {
    return 'Start date is required'
  }

  return ''
}

function minorToPesos(value?: number) {
  return value ? String(value / 100) : ''
}

export function getLoanApplicationFormValues(application: LoanApplication): LoanApplicationFormValues {
  const paymentType = (
    application.paymentType || (application.paymentFrequency === 'monthly' ? 'monthly' : 'semi_monthly')
  ) as LoanApplicationPaymentType

  return {
    borrowerId: application.borrowerId || application.borrower?.id || '',
    loanAmount: minorToPesos(application.loanAmountMinor ?? (application.principal ? application.principal * 100 : 0)),
    numberOfInstallments: String(application.numberOfCutoffs ?? application.gives ?? 1),
    startDate: application.startDate || application.firstPaymentDate || '',
    paymentType,
    purpose: application.purpose || application.notes || '',
  }
}

export function LoanApplicationForm({
  applicationId,
  borrowers: providedBorrowers,
  initialValues,
  loadingBorrowers: providedLoadingBorrowers = false,
  mode = 'create',
  onCancel,
  onSaved,
  showCard = true,
}: LoanApplicationFormProps) {
  const router = useRouter()
  const [borrowers, setBorrowers] = useState<Borrower[]>(providedBorrowers ?? [])
  const [error, setError] = useState('')
  const [form, setForm] = useState<LoanApplicationFormValues>(initialValues ?? initialFormValues)
  const [loadingBorrowers, setLoadingBorrowers] = useState(providedBorrowers ? providedLoadingBorrowers : true)
  const [showBorrowerModal, setShowBorrowerModal] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const validationError = useMemo(() => validateForm(form), [form])
  const derivedPaymentDays = useMemo(
    () => derivePaymentDaysFromStartDate(form.startDate, form.paymentType),
    [form.paymentType, form.startDate],
  )
  const [firstPaymentDay = '', secondPaymentDay = ''] = derivedPaymentDays
  const derivedPaymentDates = useMemo(() => {
    if (!form.startDate) {
      return { first: '', second: '' }
    }

    try {
      const paymentDays = buildPaymentDays(form.paymentType, firstPaymentDay, secondPaymentDay)
      const dueDates = buildLoanDueDates(
        form.paymentType === 'monthly' ? 1 : 2,
        form.paymentType,
        paymentDays,
        form.startDate,
      )

      return {
        first: dueDates[0] ? formatDate(dueDates[0]) : '',
        second: dueDates[1] ? formatDate(dueDates[1]) : '',
      }
    } catch {
      return { first: '', second: '' }
    }
  }, [firstPaymentDay, form.paymentType, form.startDate, secondPaymentDay])
  const shouldLoadBorrowers = providedBorrowers === undefined

  useEffect(() => {
    if (initialValues) {
      setForm(initialValues)
    }
  }, [initialValues])

  useEffect(() => {
    if (providedBorrowers !== undefined) {
      setBorrowers(providedBorrowers)
      setLoadingBorrowers(providedLoadingBorrowers)
    }
  }, [providedBorrowers, providedLoadingBorrowers])

  useEffect(() => {
    if (!shouldLoadBorrowers) {
      return
    }

    const loadBorrowers = async () => {
      setLoadingBorrowers(true)

      try {
        const rows = await listLoanBorrowers()
        setBorrowers(rows)
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load borrowers')
      } finally {
        setLoadingBorrowers(false)
      }
    }

    void loadBorrowers()
  }, [shouldLoadBorrowers])

  const preventWheelValueChange = (event: WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur()
  }

  const updateForm = (updates: Partial<LoanApplicationFormValues>) => {
    setForm((current) => ({ ...current, ...updates }))
    setError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setShowValidation(true)
    setError('')

    if (validationError) {
      return
    }

    setSubmitting(true)

    try {
      const payload = getDraftPayload(form)
      const saved = mode === 'edit' && applicationId
        ? await updateLoanApplication(applicationId, payload)
        : await createLoanApplication(payload)

      onSaved?.(saved)

      if (mode === 'create') {
        router.push(`/loan-applications/${saved.id}`)
      }
    } catch (caughtError) {
      const fallbackMessage = mode === 'edit'
        ? 'Unable to update loan application'
        : 'Unable to create loan application'
      setError(caughtError instanceof Error ? caughtError.message : fallbackMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBorrowerCreated = async (newBorrower: Borrower) => {
    setShowBorrowerModal(false)
    setBorrowers((current) => [...current, newBorrower])
    setForm((current) => ({ ...current, borrowerId: newBorrower.id }))
  }

  const borrowerOptions = useMemo<SearchableSelectOption[]>(
    () => borrowers.map((borrower) => ({
      label: `${borrower.fullName} (${borrower.borrowerNumber})`,
      value: borrower.id,
    })),
    [borrowers],
  )

  const formContent = (
    <>
      {error ? <ErrorState title="Loan application not ready" description={error} /> : null}
      {showValidation && validationError ? (
        <ErrorState title="Missing loan application details" description={validationError} />
      ) : null}

      {loadingBorrowers ? (
        <LoadingState title="Loading borrowers" description="Fetching borrower records for the loan application." />
      ) : null}

      {!loadingBorrowers && borrowers.length === 0 && mode !== 'create' ? (
        <EmptyState title="No active borrowers found" description="Create a borrower before starting a loan application." />
      ) : null}

      {!loadingBorrowers || borrowers.length > 0 ? (
        <form className="stack" onSubmit={handleSubmit}>
          <SearchableSelect
            id={`${mode}ApplicationBorrower`}
            label={loanApplicationLabels.borrower}
            placeholder="Select borrower"
            options={borrowerOptions}
            value={form.borrowerId}
            loading={loadingBorrowers}
            disabled={loadingBorrowers}
            emptyMessage="No borrowers match your search"
            actionLabel={mode === 'create' ? '+ Add new borrower' : undefined}
            onAction={mode === 'create' ? () => setShowBorrowerModal(true) : undefined}
            onChange={(nextValue) => updateForm({ borrowerId: nextValue })}
          />

          <div className="grid two">
            <Input
              id={`${mode}ApplicationLoanAmount`}
              label={loanApplicationLabels.loanAmount}
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
              id={`${mode}ApplicationInstallments`}
              label={loanApplicationLabels.numberOfInstallments}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              inputClassName="input-no-spinner"
              value={form.numberOfInstallments}
              onWheel={preventWheelValueChange}
              onChange={(event) => updateForm({ numberOfInstallments: event.target.value })}
            />
          </div>

          <div className="grid two">
            <Input
              id={`${mode}ApplicationStartDate`}
              label={loanApplicationLabels.startDate}
              type="date"
              value={form.startDate}
              onChange={(event) => updateForm({ startDate: event.target.value })}
            />
            <SearchableSelect
              id={`${mode}ApplicationFrequency`}
              label={loanApplicationLabels.paymentFrequency}
              options={paymentFrequencyOptions}
              value={form.paymentType}
              onChange={(nextValue) => {
                updateForm({ paymentType: nextValue as LoanApplicationPaymentType })
              }}
            />
          </div>

          {form.paymentType === 'monthly' ? (
            <div className="grid two">
              <Input
                id={`${mode}ApplicationFirstPaymentDay`}
                label={loanApplicationLabels.firstPaymentDay}
                type="text"
                value={derivedPaymentDates.first}
                readOnly
              />
              <div />
            </div>
          ) : (
            <div className="grid two">
              <Input
                id={`${mode}ApplicationFirstPaymentDay`}
                label={loanApplicationLabels.firstPaymentDay}
                type="text"
                value={derivedPaymentDates.first}
                readOnly
              />
              <Input
                id={`${mode}ApplicationSecondPaymentDay`}
                label={loanApplicationLabels.secondPaymentDay}
                type="text"
                value={derivedPaymentDates.second}
                readOnly
              />
            </div>
          )}

          <Textarea
            id={`${mode}ApplicationPurpose`}
            label={loanApplicationLabels.loanPurpose}
            value={form.purpose}
            onChange={(event) => updateForm({ purpose: event.target.value })}
          />

          <div className="application-form-actions">
            <Button type="submit" disabled={submitting || !form.borrowerId}>
              {submitting
                ? mode === 'edit' ? 'Saving...' : 'Creating...'
                : mode === 'edit' ? 'Save loan application' : 'Create loan application'}
            </Button>
            {mode === 'edit' && onCancel ? (
              <Button type="button" variant="ghost" disabled={submitting} onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {mode === 'create' ? (
        <Dialog
          id="add-borrower-modal"
          title="Add new borrower"
          description="Create a new borrower record for the loan application."
          open={showBorrowerModal}
          onClose={() => setShowBorrowerModal(false)}
        >
          <div className="stack">
            <BorrowerForm mode="create" onSaved={handleBorrowerCreated} />
          </div>
        </Dialog>
      ) : null}
    </>
  )

  if (!showCard) {
    return formContent
  }

  return (
    <div className="stack">
      <div className="application-workspace-grid">
        <Card
          title="Loan application form"
          description="This creates an application-stage record, not a loan record."
        >
          {formContent}
        </Card>
      </div>
    </div>
  )
}
