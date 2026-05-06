'use client'

import { useEffect, useMemo, useState, type FormEvent, type WheelEvent } from 'react'
import { useRouter } from 'next/navigation'
import type {
  Borrower,
  LoanApplicationDraftInput,
  LoanApplicationPaymentType,
} from '@/lib/types'
import { buildLoanDueDates, buildPaymentDays } from '@/lib/loan-schedule'
import { formatDate } from '@/lib/format'
import {
  createLoanApplication,
  listLoanBorrowers,
} from '@/services'
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Select,
  Textarea,
} from '@/components/shared'
import { BorrowerForm } from '@/components/borrowers/borrower-form'

const initialForm = {
  borrowerId: '',
  loanAmount: '',
  numberOfCutoffs: '2',
  startDate: '',
  paymentType: 'semi_monthly' as LoanApplicationPaymentType,
  firstDay: '15',
  secondDay: 'month_end',
  purpose: '',
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

function deriveSemiMonthlyPaymentDaysFromStartDate(startDate: string) {
  const parts = getDateParts(startDate)
  if (!parts) {
    return null
  }

  const firstDay = String(parts.day)

  if (parts.day === 15) {
    return {
      firstDay,
      secondDay: 'month_end',
    }
  }

  const startDateValue = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12))
  const secondDateValue = new Date(startDateValue)
  secondDateValue.setUTCDate(secondDateValue.getUTCDate() + 15)

  return {
    firstDay,
    secondDay: String(secondDateValue.getUTCDate()),
  }
}

function deriveMonthlyPaymentDayFromStartDate(startDate: string) {
  const parts = getDateParts(startDate)
  return parts ? String(parts.day) : null
}

function pesosToMinor(value: string) {
  return Math.round(Number(value) * 100)
}

function getDraftPayload(form: typeof initialForm): LoanApplicationDraftInput {
  const paymentDays = buildPaymentDays(form.paymentType, form.firstDay, form.secondDay)

  return {
    borrowerId: form.borrowerId,
    loanAmountMinor: pesosToMinor(form.loanAmount),
    numberOfCutoffs: Number(form.numberOfCutoffs),
    startDate: form.startDate,
    paymentType: form.paymentType,
    paymentDays,
    purpose: form.purpose.trim() || undefined,
  }
}

function validateForm(form: typeof initialForm) {
  if (!form.borrowerId) {
    return 'Borrower is required'
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
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)
  const [loadingBorrowers, setLoadingBorrowers] = useState(true)
  const [showValidation, setShowValidation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showBorrowerModal, setShowBorrowerModal] = useState(false)

  const validationError = useMemo(() => validateForm(form), [form])
  const computedPaymentDays = useMemo(
    () => buildPaymentDays(form.paymentType, form.firstDay, form.secondDay),
    [form.firstDay, form.paymentType, form.secondDay],
  )
  const computedPaymentDates = useMemo(() => {
    if (!form.startDate) {
      return { first: '', second: '' }
    }

    try {
      const dueDates = buildLoanDueDates(2, form.paymentType, computedPaymentDays, form.startDate)
      return {
        first: dueDates[0] ? formatDate(dueDates[0]) : '',
        second: dueDates[1] ? formatDate(dueDates[1]) : '',
      }
    } catch {
      return { first: '', second: '' }
    }
  }, [computedPaymentDays, form.paymentType, form.startDate])

  useEffect(() => {
    const loadBorrowers = async () => {
      try {
        const rows = await listLoanBorrowers()
        setBorrowers(rows)
        // Only update borrowerId if it's empty and we have borrowers
        setForm((current) => {
          if (current.borrowerId === '' && rows.length > 0) {
            return { ...current, borrowerId: rows[0].id }
          }
          return current
        })
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

  const updateStartDate = (startDate: string) => {
    setForm((current) => {
      if (current.paymentType === 'monthly') {
        const monthlyPaymentDay = deriveMonthlyPaymentDayFromStartDate(startDate)
        return {
          ...current,
          startDate,
          firstDay: monthlyPaymentDay ?? current.firstDay,
          secondDay: monthlyPaymentDay ?? current.secondDay,
        }
      }

      const semiMonthlyDays = deriveSemiMonthlyPaymentDaysFromStartDate(startDate)
      return {
        ...current,
        startDate,
        firstDay: semiMonthlyDays?.firstDay ?? current.firstDay,
        secondDay: semiMonthlyDays?.secondDay ?? current.secondDay,
      }
    })
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
      const created = await createLoanApplication(getDraftPayload(form))
      router.push(`/loan-applications/${created.id}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBorrowerCreated = async (newBorrower: Borrower) => {
    setShowBorrowerModal(false)
    setBorrowers((current) => [...current, newBorrower])
    setForm((current) => ({ ...current, borrowerId: newBorrower.id }))
  }

  const handleAddBorrowerClick = () => {
    setShowBorrowerModal(true)
  }

  return (
    <div className="stack">
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
              onChange={(event) => {
                if (event.target.value === '__add_new__') {
                  handleAddBorrowerClick()
                } else {
                  updateForm({ borrowerId: event.target.value })
                }
              }}
            >
              <option value="">Select borrower</option>
              {borrowers.map((borrower) => (
                <option key={borrower.id} value={borrower.id}>
                  {borrower.fullName} ({borrower.borrowerNumber})
                </option>
              ))}
              <option value="__add_new__">+ Add new borrower</option>
            </Select>

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
                onChange={(event) => updateStartDate(event.target.value)}
              />
              <Select
                id="applicationFrequency"
                label="Payment type"
                value={form.paymentType}
                onChange={(event) => {
                  const nextPaymentType = event.target.value as LoanApplicationPaymentType
                  if (nextPaymentType === 'monthly') {
                    const monthlyPaymentDay = deriveMonthlyPaymentDayFromStartDate(form.startDate)
                    updateForm({
                      paymentType: nextPaymentType,
                      firstDay: monthlyPaymentDay ?? form.firstDay,
                      secondDay: monthlyPaymentDay ?? form.secondDay,
                    })
                    return
                  }

                  const semiMonthlyDays = deriveSemiMonthlyPaymentDaysFromStartDate(form.startDate)
                  updateForm({
                    paymentType: nextPaymentType,
                    firstDay: semiMonthlyDays?.firstDay ?? form.firstDay,
                    secondDay: semiMonthlyDays?.secondDay ?? form.secondDay,
                  })
                }}
              >
                <option value="monthly">Monthly</option>
                <option value="semi_monthly">Semi-monthly</option>
              </Select>
            </div>

            {form.paymentType === 'monthly' ? (
              <div className="grid two">
                <Input
                  id="applicationMonthlyPaymentDayComputed"
                  label="Monthly payment day"
                  type="text"
                  value={computedPaymentDates.first}
                  readOnly
                />
                <div />
              </div>
            ) : (
              <div className="grid two">
                <Input
                  id="applicationFirstPaymentDayComputed"
                  label="First payment day"
                  type="text"
                  value={computedPaymentDates.first}
                  readOnly
                />
                <Input
                  id="applicationSecondPaymentDayComputed"
                  label="Second payment day"
                  type="text"
                  value={computedPaymentDates.second}
                  readOnly
                />
              </div>
            )}

            <Textarea
              id="applicationPurpose"
              label="Purpose"
              value={form.purpose}
              onChange={(event) => updateForm({ purpose: event.target.value })}
            />

            <div className="application-form-actions">
              <Button
                type="submit"
                disabled={submitting || borrowers.length === 0}
              >
                {submitting ? 'Creating...' : 'Create application'}
              </Button>
            </div>
          </form>
        </Card>
      </div>

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
    </div>
  )
}
