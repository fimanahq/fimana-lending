'use client'

import { useMemo, useState } from 'react'
import { getLoanApplicationValidationResult, validateLoanApplicationInput } from '@/lib/loan-application-validation'
import type { LoanApplication, LoanSchedulePreset } from '@/lib/types'
import { createPublicLoanApplication } from '@/services'

const PHONE_PREFIX = '+63 '
const REQUIRED_ERROR_SUFFIX = 'is required'

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: PHONE_PREFIX,
  principal: '',
  gives: '12',
  paymentFrequency: 'twice_monthly' as const,
  firstDay: '15',
  secondDay: 'month_end',
  paymentPreset: '15_month_end' as LoanSchedulePreset,
  firstPaymentDate: '',
  notes: '',
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

export function LoanApplicationIntakeForm() {
  const [form, setForm] = useState(initialForm)
  const [touchedFields, setTouchedFields] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    principal: false,
    gives: false,
    firstPaymentDate: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<LoanApplication | null>(null)
  const validation = useMemo(
    () =>
      getLoanApplicationValidationResult({
        ...form,
        principal: Number(form.principal),
        gives: Number(form.gives),
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
      case 'gives':
        return form.gives.trim().length === 0
      case 'firstPaymentDate':
        return form.firstPaymentDate.trim().length === 0
    }
  }

  const showDirtyField = (field: keyof typeof touchedFields, error: string) =>
    touchedFields[field] && (isMissingValue(field) || isRequiredError(error))

  const getVisibleError = (field: keyof typeof validation.errors, touched: boolean) => {
    const error = validation.errors[field]
    if (!touched || !error) {
      return ''
    }

    if (field in touchedFields && isMissingValue(field as keyof typeof touchedFields)) {
      return ''
    }

    if (isRequiredError(error)) {
      return ''
    }

    return error
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
        gives: Number(form.gives),
      })

      const created = await createPublicLoanApplication({
        ...form,
        principal: validated.principal,
        gives: validated.gives,
      })

      setSuccess(created)
      setForm(initialForm)
      setTouchedFields({
        firstName: false,
        lastName: false,
        email: false,
        phone: false,
        principal: false,
        gives: false,
        firstPaymentDate: false,
      })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="request-loan-form" onSubmit={handleSubmit}>
      <div className="request-loan-form__grid">
        <div className="request-loan-form__field">
          <label htmlFor="requestFirstName">First name</label>
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
          <label htmlFor="requestLastName">Last name</label>
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
          <label htmlFor="requestEmail">Email</label>
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
          <label htmlFor="requestPhone">Phone</label>
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
        <div className="request-loan-form__field request-loan-form__field--full">
          <label htmlFor="requestPrincipal">Requested amount</label>
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
      </div>

      <div className="request-loan-form__grid">
        <div className="request-loan-form__field">
          <label htmlFor="requestGives">Number of gives</label>
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
          <label htmlFor="requestPreset">Schedule preset</label>
          <select
            id="requestPreset"
            value={form.paymentPreset}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                paymentPreset: event.target.value as LoanSchedulePreset,
              }))
            }
          >
            <option value="15_month_end">15th + month end</option>
            <option value="5_20">5th + 20th</option>
          </select>
        </div>
      </div>

      <div className="request-loan-form__field request-loan-form__field--full">
        <label htmlFor="requestFirstPaymentDate">Preferred first payment date</label>
        <input
          id="requestFirstPaymentDate"
          type="date"
          className={showDirtyField('firstPaymentDate', validation.errors.firstPaymentDate)
            ? 'request-loan-form__input--dirty'
            : ''}
          aria-invalid={Boolean(getVisibleError('firstPaymentDate', touchedFields.firstPaymentDate))}
          value={form.firstPaymentDate}
          onBlur={() => markTouched('firstPaymentDate')}
          onChange={(event) => setForm((current) => ({ ...current, firstPaymentDate: event.target.value }))}
        />
        {getVisibleError('firstPaymentDate', touchedFields.firstPaymentDate) ? (
          <p className="request-loan-form__error">{getVisibleError('firstPaymentDate', touchedFields.firstPaymentDate)}</p>
        ) : null}
      </div>

      <div className="request-loan-form__field">
        <label htmlFor="requestNotes">Loan purpose</label>
        <textarea
          id="requestNotes"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Describe the intended use of the loan and any relevant repayment details."
        />
      </div>

      {error ? <div className="notice danger request-loan-form__notice">{error}</div> : null}
      {success ? (
        <div className="notice request-loan-form__notice">
          Application submitted for {success.borrower?.displayName || `${form.firstName} ${form.lastName}`.trim()}. Reference: {success.applicationNumber || success.id}
        </div>
      ) : null}

      <button
        className="request-loan-form__submit"
        type="submit"
        disabled={submitting || !validation.isValid}
      >
        <span>{submitting ? 'Submitting application...' : 'Submit application'}</span>
        <span className="request-loan-form__submitArrow" aria-hidden="true">→</span>
      </button>

      <p className="request-loan-form__finePrint">
        By submitting, you agree to our curated ledger review process.
      </p>
    </form>
  )
}
