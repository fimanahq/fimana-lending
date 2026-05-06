'use client'

import { useMemo, useState } from 'react'
import { getLoanApplicationValidationResult, validateLoanApplicationInput } from '@/lib/loan-application-validation'
import { getBorrowerRequestSemiMonthlyFirstPaymentDate } from '@/lib/loan-schedule'
import type { LoanApplication } from '@/lib/types'
import { createPublicLoanApplication } from '@/services'

const PHONE_PREFIX = '+63 '
const REQUIRED_ERROR_SUFFIX = 'is required'
const BORROWER_REQUEST_PAYMENT_FREQUENCY = 'semi_monthly' as const
const BORROWER_REQUEST_FIRST_DAY = '15'
const BORROWER_REQUEST_SECOND_DAY = 'month_end'

function buildInitialForm() {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: PHONE_PREFIX,
    principal: '',
    gives: '12',
    firstPaymentDate: getBorrowerRequestSemiMonthlyFirstPaymentDate(),
    income: '',
    purpose: '',
  }
}

function coercePhoneValue(value: string) {
  const trimmedStart = value.replace(/^\s+/, '')
  const compactValue = trimmedStart.replace(/\s+/g, '')

  if (!compactValue || compactValue === '+' || compactValue === '+6' || compactValue === '+63' || compactValue === '6' || compactValue === '63') {
    return PHONE_PREFIX
  }

  if (trimmedStart.startsWith(PHONE_PREFIX)) {
    return trimmedStart
  }

  if (compactValue.startsWith('+63')) {
    return `${PHONE_PREFIX}${compactValue.slice(3)}`
  }

  if (compactValue.startsWith('63')) {
    return `${PHONE_PREFIX}${compactValue.slice(2)}`
  }

  if (compactValue.startsWith('+6')) {
    return `${PHONE_PREFIX}${compactValue.slice(2)}`
  }

  if (compactValue.startsWith('6')) {
    return `${PHONE_PREFIX}${compactValue.slice(1)}`
  }

  return `${PHONE_PREFIX}${trimmedStart}`
}

function isRequiredError(error: string) {
  return error.endsWith(REQUIRED_ERROR_SUFFIX)
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? Number(trimmed) : null
}

export function LoanApplicationIntakeForm() {
  const [form, setForm] = useState(() => buildInitialForm())
  const [touchedFields, setTouchedFields] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    principal: false,
    income: false,
    purpose: false,
    gives: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<LoanApplication | null>(null)
  const validation = useMemo(
    () =>
      getLoanApplicationValidationResult({
        ...form,
        principal: Number(form.principal),
        income: parseOptionalNumber(form.income),
        gives: Number(form.gives),
        paymentFrequency: BORROWER_REQUEST_PAYMENT_FREQUENCY,
        firstDay: BORROWER_REQUEST_FIRST_DAY,
        secondDay: BORROWER_REQUEST_SECOND_DAY,
      }),
    [form],
  )
  const emailValue = form.email.trim()
  const emailIsDirty = touchedFields.email && emailValue.length > 0 && Boolean(validation.errors.email) && !isRequiredError(validation.errors.email)
  const emailIsValid = touchedFields.email && emailValue.length > 0 && !validation.errors.email
  const emailHasFormatError = emailIsDirty
  const phoneDigits = form.phone.replace(/\D/g, '').replace(/^63/, '')
  const phoneIsDirty = phoneDigits.length > 0
  const phoneHasLengthError = touchedFields.phone && phoneIsDirty && Boolean(validation.errors.phone) && !isRequiredError(validation.errors.phone)

  const markTouched = (field: keyof typeof touchedFields) => {
    setTouchedFields((current) => (current[field] ? current : { ...current, [field]: true }))
  }

  const isMissingValue = (field: keyof typeof touchedFields) => {
    switch (field) {
      case 'firstName':
        return form.firstName.trim().length === 0
      case 'lastName':
        return form.lastName.trim().length === 0
      case 'email':
        return form.email.trim().length === 0
      case 'phone':
        return form.phone.replace(/\s+/g, '') === '+63'
      case 'principal':
        return form.principal.trim().length === 0
      case 'income':
        return form.income.trim().length === 0
      case 'purpose':
        return form.purpose.trim().length === 0
      case 'gives':
        return form.gives.trim().length === 0
    }
  }

  const showDirtyField = (field: keyof typeof touchedFields, error: string) =>
    touchedFields[field] && (isMissingValue(field) || isRequiredError(error))

  const getVisibleError = (field: keyof typeof validation.errors, touched: boolean) => {
    const fieldError = validation.errors[field]
    if (!touched || !fieldError) {
      return ''
    }

    if (field in touchedFields && isMissingValue(field as keyof typeof touchedFields)) {
      return ''
    }

    if (isRequiredError(fieldError)) {
      return ''
    }

    return fieldError
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess(null)
    setSubmitting(true)

    try {
      const validated = validateLoanApplicationInput({
        ...form,
        principal: Number(form.principal),
        income: parseOptionalNumber(form.income),
        gives: Number(form.gives),
        paymentFrequency: BORROWER_REQUEST_PAYMENT_FREQUENCY,
        firstDay: BORROWER_REQUEST_FIRST_DAY,
        secondDay: BORROWER_REQUEST_SECOND_DAY,
      })

      const created = await createPublicLoanApplication(validated)

      setSuccess(created)
      setForm(buildInitialForm())
      setTouchedFields({
        firstName: false,
        lastName: false,
        email: false,
        phone: false,
        principal: false,
        income: false,
        purpose: false,
        gives: false,
      })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to submit loan application')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="request-loan-form" onSubmit={handleSubmit}>
      <div className="request-loan-form__grid">
        <div className="request-loan-form__field">
          <label htmlFor="requestFirstName">First Name</label>
          <input
            id="requestFirstName"
            autoComplete="given-name"
            placeholder="e.g., Julian"
            className={showDirtyField('firstName', validation.errors.firstName) ? 'request-loan-form__input--dirty' : ''}
            aria-invalid={Boolean(getVisibleError('firstName', touchedFields.firstName))}
            value={form.firstName}
            onBlur={() => markTouched('firstName')}
            onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
          />
          {getVisibleError('firstName', touchedFields.firstName) ? (
            <p className="request-loan-form__error">{getVisibleError('firstName', touchedFields.firstName)}</p>
          ) : null}
        </div>
        <div className="request-loan-form__field">
          <label htmlFor="requestLastName">Last Name</label>
          <input
            id="requestLastName"
            autoComplete="family-name"
            placeholder="e.g., Sterling"
            className={showDirtyField('lastName', validation.errors.lastName) ? 'request-loan-form__input--dirty' : ''}
            aria-invalid={Boolean(getVisibleError('lastName', touchedFields.lastName))}
            value={form.lastName}
            onBlur={() => markTouched('lastName')}
            onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
          />
          {getVisibleError('lastName', touchedFields.lastName) ? (
            <p className="request-loan-form__error">{getVisibleError('lastName', touchedFields.lastName)}</p>
          ) : null}
        </div>
      </div>

      <div className="request-loan-form__grid">
        <div className="request-loan-form__field">
          <label htmlFor="requestEmail">Email Address</label>
          <input
            id="requestEmail"
            type="email"
            autoComplete="email"
            placeholder="julian@example.com"
            className={`request-loan-form__input${emailIsDirty || showDirtyField('email', validation.errors.email)
              ? ' request-loan-form__input--dirty'
              : ''}${emailIsValid ? ' request-loan-form__input--valid' : ''}`}
            aria-invalid={false}
            value={form.email}
            onBlur={() => markTouched('email')}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          {!emailHasFormatError && getVisibleError('email', touchedFields.email) ? (
            <p className="request-loan-form__error">{getVisibleError('email', touchedFields.email)}</p>
          ) : null}
        </div>
        <div className="request-loan-form__field">
          <label htmlFor="requestPhone">Phone Number</label>
          <input
            id="requestPhone"
            type="tel"
            autoComplete="tel"
            className={phoneHasLengthError || showDirtyField('phone', validation.errors.phone) ? 'request-loan-form__input--dirty' : ''}
            aria-invalid={false}
            value={form.phone}
            onBlur={() => markTouched('phone')}
            onChange={(event) => setForm((current) => ({ ...current, phone: coercePhoneValue(event.target.value) }))}
          />
          {!phoneHasLengthError && getVisibleError('phone', touchedFields.phone) ? (
            <p className="request-loan-form__error">{getVisibleError('phone', touchedFields.phone)}</p>
          ) : null}
        </div>
      </div>

      <div className="request-loan-form__grid">
        <div className="request-loan-form__field">
          <label htmlFor="requestPrincipal">Loan Amount</label>
          <input
            id="requestPrincipal"
            type="number"
            min="1"
            inputMode="decimal"
            placeholder="0.00"
            className={showDirtyField('principal', validation.errors.principal) ? 'request-loan-form__input--dirty' : ''}
            aria-invalid={Boolean(getVisibleError('principal', touchedFields.principal))}
            value={form.principal}
            onBlur={() => markTouched('principal')}
            onChange={(event) => setForm((current) => ({ ...current, principal: event.target.value }))}
          />
          {getVisibleError('principal', touchedFields.principal) ? (
            <p className="request-loan-form__error">{getVisibleError('principal', touchedFields.principal)}</p>
          ) : null}
        </div>
        <div className="request-loan-form__field">
          <label htmlFor="requestIncome">Monthly Income</label>
          <input
            id="requestIncome"
            type="number"
            min="0"
            inputMode="decimal"
            placeholder="0.00"
            className={showDirtyField('income', validation.errors.income) ? 'request-loan-form__input--dirty' : ''}
            aria-invalid={Boolean(getVisibleError('income', touchedFields.income))}
            value={form.income}
            onBlur={() => markTouched('income')}
            onChange={(event) => setForm((current) => ({ ...current, income: event.target.value }))}
          />
          {getVisibleError('income', touchedFields.income) ? (
            <p className="request-loan-form__error">{getVisibleError('income', touchedFields.income)}</p>
          ) : null}
        </div>
      </div>

      <div className="request-loan-form__grid">
        <div className="request-loan-form__field">
          <label htmlFor="requestGives">Number of Installments</label>
          <input
            id="requestGives"
            type="number"
            min="1"
            inputMode="numeric"
            className={showDirtyField('gives', validation.errors.gives) ? 'request-loan-form__input--dirty' : ''}
            aria-invalid={Boolean(getVisibleError('gives', touchedFields.gives))}
            value={form.gives}
            onBlur={() => markTouched('gives')}
            onChange={(event) => setForm((current) => ({ ...current, gives: event.target.value }))}
          />
          {getVisibleError('gives', touchedFields.gives) ? (
            <p className="request-loan-form__error">{getVisibleError('gives', touchedFields.gives)}</p>
          ) : null}
        </div>
        <div className="request-loan-form__field">
          <label htmlFor="requestSchedule">Schedule</label>
          <input id="requestSchedule" value="Semi-monthly (15th and month end)" readOnly />
        </div>
      </div>

      <div className="request-loan-form__field request-loan-form__field--full">
        <label htmlFor="requestFirstPaymentDate">First due date (computed)</label>
        <input id="requestFirstPaymentDate" type="date" value={form.firstPaymentDate} readOnly />
      </div>

      <div className="request-loan-form__field">
          <label htmlFor="requestPurpose">Loan Purpose</label>
        <textarea
          id="requestPurpose"
          value={form.purpose}
          aria-invalid={Boolean(getVisibleError('purpose', touchedFields.purpose))}
          className={showDirtyField('purpose', validation.errors.purpose) ? 'request-loan-form__input--dirty' : ''}
          onBlur={() => markTouched('purpose')}
          onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
          placeholder="Describe the intended use of the loan and any relevant repayment details."
        />
        {getVisibleError('purpose', touchedFields.purpose) ? (
          <p className="request-loan-form__error">{getVisibleError('purpose', touchedFields.purpose)}</p>
        ) : null}
      </div>

      {error ? <div className="notice danger request-loan-form__notice">{error}</div> : null}
      {success ? (
        <div className="notice request-loan-form__notice">
          Loan application submitted for {success.borrower?.displayName || `${form.firstName} ${form.lastName}`.trim()}. Reference: {success.applicationNumber || success.id}
        </div>
      ) : null}

      <button
        className="request-loan-form__submit"
        type="submit"
        disabled={submitting || !validation.isValid}
      >
        <span>{submitting ? 'Submitting loan application...' : 'Submit loan application'}</span>
        <span className="request-loan-form__submitArrow" aria-hidden="true">→</span>
      </button>

      <p className="request-loan-form__finePrint">
        By submitting, you agree to our curated ledger review process.
      </p>
    </form>
  )
}
