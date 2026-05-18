'use client'

import { useEffect, useMemo, useState, type FormEvent, type WheelEvent } from 'react'
import { useRouter } from 'next/navigation'
import type {
  Borrower,
  LoanCalculationMethod,
  LoanApplication,
  LoanApplicationDraftInput,
  LoanApplicationPaymentType,
  PostInterestOnlyMethod,
  SimpleInterestMethod,
} from '@/lib/types'
import { buildLoanDueDates, buildPaymentDays, getBorrowerRequestSemiMonthlyFirstPaymentDate } from '@/lib/loan-schedule'
import { formatDate } from '@/lib/format'
import {
  createLoanApplication,
  getLoanApplication,
  listLoanBorrowers,
  updateBorrower,
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
  borrowerIncome: 'Monthly Income',
  firstPaymentDay: 'First Payment Day',
  loanAmount: 'Loan Amount',
  loanPurpose: 'Loan Purpose',
  numberOfInstallments: 'Number of Installments',
  paymentFrequency: 'Payment Frequency',
  calculationMethod: 'Calculation Method',
  interestRate: 'Interest Rate (%)',
  fixedTotalInterestRate: 'Whole-loan interest rate (%)',
  interestOnlyPeriod: 'Interest-Only Cutoffs',
  postInterestOnlyMethod: 'After Interest-Only',
  simpleInterestMethod: 'Simple Interest Type',
  secondPaymentDay: 'Second Payment Day',
  startDate: 'Start Date',
} as const

export interface LoanApplicationFormValues {
  borrowerId: string
  borrowerIncome: string
  loanAmount: string
  numberOfInstallments: string
  startDate: string
  paymentType: LoanApplicationPaymentType
  interestRate: string
  calculationMethod: LoanCalculationMethod
  interestOnlyPeriod: string
  postInterestOnlyMethod: PostInterestOnlyMethod
  simpleInterestMethod: SimpleInterestMethod
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
  borrowerIncome: '',
  loanAmount: '',
  numberOfInstallments: '2',
  startDate: getBorrowerRequestSemiMonthlyFirstPaymentDate(),
  paymentType: 'semi_monthly',
  interestRate: '',
  calculationMethod: 'reducing_balance',
  interestOnlyPeriod: '1',
  postInterestOnlyMethod: 'bullet',
  simpleInterestMethod: 'equal_principal',
  purpose: '',
}

const paymentFrequencyOptions: SearchableSelectOption[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Semi-Monthly', value: 'semi_monthly' },
]

const calculationMethodOptions: SearchableSelectOption[] = [
  { label: 'Reducing balance', value: 'reducing_balance' },
  { label: 'Flat rate', value: 'flat_rate' },
  { label: 'Interest only', value: 'interest_only' },
  { label: 'Simple interest', value: 'simple_interest' },
  { label: 'Fixed Total Interest', value: 'fixed_total_interest' },
]

const fixedTotalInterestHelperText = 'Interest is calculated once for the whole loan term and spread across all cutoffs.'

const postInterestOnlyMethodOptions: SearchableSelectOption[] = [
  { label: 'Bullet principal payoff', value: 'bullet' },
  { label: 'Amortize remaining principal', value: 'amortizing' },
]

const simpleInterestMethodOptions: SearchableSelectOption[] = [
  { label: 'Equal principal', value: 'equal_principal' },
  { label: 'Equal payment', value: 'equal_payment' },
]

function normalizeCalculationMethod(value: LoanApplication['calculationMethod']): LoanCalculationMethod {
  if (value === 'flat' || value === 'flat_rate') {
    return 'flat_rate'
  }

  if (value === 'diminishing_balance' || value === 'reducing_balance') {
    return 'reducing_balance'
  }

  if (value === 'interest_only' || value === 'simple_interest' || value === 'fixed_total_interest') {
    return value
  }

  return 'reducing_balance'
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

function parseOptionalIncome(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function formatOptionalIncome(value?: number | null) {
  return value !== null && value !== undefined ? String(value) : ''
}

function incomeHasChanged(nextIncome: number | null, currentIncome?: number | null) {
  return nextIncome !== (currentIncome ?? null)
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
    interestRate: form.interestRate.trim() ? Number(form.interestRate) : null,
    calculationMethod: form.calculationMethod,
    interestOnlyPeriod: form.calculationMethod === 'interest_only'
      ? Number(form.interestOnlyPeriod)
      : null,
    postInterestOnlyMethod: form.calculationMethod === 'interest_only'
      ? form.postInterestOnlyMethod
      : null,
    simpleInterestMethod: form.calculationMethod === 'simple_interest'
      ? form.simpleInterestMethod
      : null,
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

  if (form.calculationMethod === 'fixed_total_interest' && !form.interestRate.trim()) {
    return 'Whole-loan interest rate is required for fixed total interest'
  }

  if (form.interestRate.trim()) {
    const interestRate = Number(form.interestRate)
    if (!Number.isFinite(interestRate) || interestRate < 0) {
      return 'Interest rate must be zero or greater'
    }
  }

  if (form.borrowerIncome.trim()) {
    const borrowerIncome = parseOptionalIncome(form.borrowerIncome)
    if (borrowerIncome === null || !Number.isFinite(borrowerIncome) || borrowerIncome < 0) {
      return 'Monthly income must be zero or greater'
    }
  }

  if (form.calculationMethod === 'interest_only') {
    const interestOnlyPeriod = Number(form.interestOnlyPeriod)
    if (!Number.isInteger(interestOnlyPeriod) || interestOnlyPeriod < 0) {
      return 'Interest-only cutoffs must be a whole number of at least 0'
    }

    if (interestOnlyPeriod >= installments) {
      return 'Interest-only cutoffs must be less than the number of installments'
    }
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
    borrowerIncome: formatOptionalIncome(application.borrower?.income),
    loanAmount: minorToPesos(application.loanAmountMinor ?? (application.principal ? application.principal * 100 : 0)),
    numberOfInstallments: String(application.numberOfCutoffs ?? application.gives ?? 1),
    startDate: application.startDate || application.firstPaymentDate || '',
    paymentType,
    interestRate: String(application.interestRate ?? application.computedPreviewSnapshot?.interestRate ?? ''),
    calculationMethod: normalizeCalculationMethod(application.calculationMethod),
    interestOnlyPeriod: String(application.interestOnlyPeriod ?? 1),
    postInterestOnlyMethod: (application.postInterestOnlyMethod as PostInterestOnlyMethod) || 'bullet',
    simpleInterestMethod: (application.simpleInterestMethod as SimpleInterestMethod) || 'equal_principal',
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
  const selectedBorrower = useMemo(
    () => borrowers.find((borrower) => borrower.id === form.borrowerId) ?? null,
    [borrowers, form.borrowerId],
  )

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

  const handleBorrowerChange = (nextBorrowerId: string) => {
    const nextBorrower = borrowers.find((borrower) => borrower.id === nextBorrowerId)

    updateForm({
      borrowerId: nextBorrowerId,
      borrowerIncome: mode === 'edit'
        ? formatOptionalIncome(nextBorrower?.income)
        : form.borrowerIncome,
    })
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

      if (mode === 'edit' && applicationId) {
        const borrowerIncome = parseOptionalIncome(form.borrowerIncome)
        if (incomeHasChanged(borrowerIncome, selectedBorrower?.income)) {
          const updatedBorrower = await updateBorrower(form.borrowerId, { income: borrowerIncome })
          setBorrowers((current) => current.map((borrower) => (
            borrower.id === updatedBorrower.id ? updatedBorrower : borrower
          )))
        }

        onSaved?.(await getLoanApplication(applicationId))
      } else {
        onSaved?.(saved)
      }

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
    setForm((current) => ({
      ...current,
      borrowerId: newBorrower.id,
      borrowerIncome: formatOptionalIncome(newBorrower.income),
    }))
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
            onChange={handleBorrowerChange}
          />

          {mode === 'edit' ? (
            <Input
              id={`${mode}ApplicationBorrowerIncome`}
              label={loanApplicationLabels.borrowerIncome}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              inputClassName="input-no-spinner"
              value={form.borrowerIncome}
              onWheel={preventWheelValueChange}
              onChange={(event) => updateForm({ borrowerIncome: event.target.value })}
            />
          ) : null}

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

          <SearchableSelect
            id={`${mode}ApplicationCalculationMethod`}
            label={loanApplicationLabels.calculationMethod}
            options={calculationMethodOptions}
            searchable={false}
            value={form.calculationMethod}
            onChange={(nextValue) => updateForm({ calculationMethod: nextValue as LoanCalculationMethod })}
          />

          <Input
            id={`${mode}ApplicationInterestRate`}
            label={form.calculationMethod === 'fixed_total_interest'
              ? loanApplicationLabels.fixedTotalInterestRate
              : loanApplicationLabels.interestRate}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            inputClassName="input-no-spinner"
            placeholder={form.calculationMethod === 'fixed_total_interest' ? 'Enter whole-loan rate' : 'Uses product rate'}
            hint={form.calculationMethod === 'fixed_total_interest' ? fixedTotalInterestHelperText : undefined}
            value={form.interestRate}
            onWheel={preventWheelValueChange}
            onChange={(event) => updateForm({ interestRate: event.target.value })}
          />

          {form.calculationMethod === 'interest_only' ? (
            <div className="grid two">
              <Input
                id={`${mode}ApplicationInterestOnlyPeriod`}
                label={loanApplicationLabels.interestOnlyPeriod}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                inputClassName="input-no-spinner"
                value={form.interestOnlyPeriod}
                onWheel={preventWheelValueChange}
                onChange={(event) => updateForm({ interestOnlyPeriod: event.target.value })}
              />
              <SearchableSelect
                id={`${mode}ApplicationPostInterestOnlyMethod`}
                label={loanApplicationLabels.postInterestOnlyMethod}
                options={postInterestOnlyMethodOptions}
                value={form.postInterestOnlyMethod}
                onChange={(nextValue) => updateForm({ postInterestOnlyMethod: nextValue as PostInterestOnlyMethod })}
              />
            </div>
          ) : null}

          {form.calculationMethod === 'simple_interest' ? (
            <SearchableSelect
              id={`${mode}ApplicationSimpleInterestMethod`}
              label={loanApplicationLabels.simpleInterestMethod}
              options={simpleInterestMethodOptions}
              value={form.simpleInterestMethod}
              onChange={(nextValue) => updateForm({ simpleInterestMethod: nextValue as SimpleInterestMethod })}
            />
          ) : null}

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
