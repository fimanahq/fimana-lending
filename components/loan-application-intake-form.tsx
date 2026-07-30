'use client'

import { useEffect, useMemo, useState } from 'react'
import { getLoanApplicationValidationResult, validateLoanApplicationInput } from '@/lib/loan-application-validation'
import type { ValidatedLoanApplicationInput } from '@/lib/loan-application-validation'
import { getBorrowerRequestSemiMonthlyFirstPaymentDate } from '@/lib/loan-schedule'
import type { LoanApplication } from '@/lib/types/lending'
import { createPublicLoanApplication, sendPublicApplicationEmailVerification } from '@/services'
import { Button, Dialog } from '@/components/shared'

const PHONE_PREFIX = '+63 '
const REQUIRED_ERROR_SUFFIX = 'is required'
const BORROWER_REQUEST_PAYMENT_FREQUENCY = 'semi_monthly' as const
const BORROWER_REQUEST_FIRST_DAY = '15'
const BORROWER_REQUEST_SECOND_DAY = 'month_end'

interface LoanApplicationIntakeFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  principal: string
  gives: string
  firstPaymentDate: string
  income: string
  purpose: string
}

type LoanApplicationIntakeInitialValues = Partial<Omit<LoanApplicationIntakeFormState, 'firstPaymentDate'>>

function buildInitialForm(initialValues: LoanApplicationIntakeInitialValues = {}): LoanApplicationIntakeFormState {
  return {
    firstName: initialValues.firstName ?? '',
    lastName: initialValues.lastName ?? '',
    email: initialValues.email ?? '',
    phone: initialValues.phone || PHONE_PREFIX,
    principal: initialValues.principal ?? '',
    gives: initialValues.gives ?? '12',
    firstPaymentDate: getBorrowerRequestSemiMonthlyFirstPaymentDate(),
    income: initialValues.income ?? '',
    purpose: initialValues.purpose ?? '',
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

interface LoanApplicationIntakeFormProps {
  publicLoanRequestSlug?: string
  initialValues?: LoanApplicationIntakeInitialValues
  emailReadOnly?: boolean
  disabled?: boolean
  disabledMessage?: string
  submitLabel?: string
  submittingLabel?: string
  finePrint?: string
  idPrefix?: string
  onSubmitApplication?: (input: ValidatedLoanApplicationInput) => Promise<LoanApplication>
  onSubmitError?: (error: Error) => void
  onSubmitted?: (application: LoanApplication) => string | void | Promise<string | void>
  successMessage?: (application: LoanApplication, submittedForm: LoanApplicationIntakeFormState) => string
}

export function LoanApplicationIntakeForm({
  publicLoanRequestSlug,
  initialValues,
  emailReadOnly = false,
  disabled = false,
  disabledMessage,
  submitLabel = 'Submit loan application',
  submittingLabel = 'Submitting loan application...',
  finePrint = 'By submitting, you agree to our curated ledger review process.',
  idPrefix = 'request',
  onSubmitApplication,
  onSubmitError,
  onSubmitted,
  successMessage,
}: LoanApplicationIntakeFormProps) {
  const [form, setForm] = useState(() => buildInitialForm(initialValues))
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
  const [sendingVerificationCode, setSendingVerificationCode] = useState(false)
  const [emailVerificationCode, setEmailVerificationCode] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationMessage, setVerificationMessage] = useState('')
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false)
  const [pendingPublicApplication, setPendingPublicApplication] = useState<ValidatedLoanApplicationInput | null>(null)
  const [pendingSubmittedForm, setPendingSubmittedForm] = useState<LoanApplicationIntakeFormState | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const requiresPublicEmailVerification = Boolean(publicLoanRequestSlug) && !onSubmitApplication
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
      }, { requireEmail: requiresPublicEmailVerification }),
    [form, requiresPublicEmailVerification],
  )
  const emailValue = form.email.trim()
  const emailIsDirty = touchedFields.email && emailValue.length > 0 && Boolean(validation.errors.email) && !isRequiredError(validation.errors.email)
  const emailIsValid = touchedFields.email && emailValue.length > 0 && !validation.errors.email
  const emailHasFormatError = emailIsDirty
  const phoneDigits = form.phone.replace(/\D/g, '').replace(/^63/, '')
  const phoneIsDirty = phoneDigits.length > 0
  const phoneHasLengthError = touchedFields.phone && phoneIsDirty && Boolean(validation.errors.phone) && !isRequiredError(validation.errors.phone)
  const resolvedSuccessMessage = (application: LoanApplication, submittedForm: LoanApplicationIntakeFormState) =>
    successMessage
      ? successMessage(application, submittedForm)
      : `Loan application submitted for ${application.borrower?.displayName || `${submittedForm.firstName} ${submittedForm.lastName}`.trim()}. Reference: ${application.applicationNumber || application.id}`

  useEffect(() => {
    if (verificationEmail && emailValue.toLowerCase() !== verificationEmail) {
      setVerificationEmail('')
      setEmailVerificationCode('')
      setVerificationMessage('')
      setVerificationDialogOpen(false)
      setPendingPublicApplication(null)
      setPendingSubmittedForm(null)
    }
  }, [emailValue, verificationEmail])

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

  const resetSubmittedForm = () => {
    setForm(buildInitialForm(initialValues))
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
    setEmailVerificationCode('')
    setVerificationEmail('')
    setVerificationMessage('')
    setVerificationDialogOpen(false)
    setPendingPublicApplication(null)
    setPendingSubmittedForm(null)
  }

  const requestVerificationCode = async (email: string) => {
    if (!publicLoanRequestSlug) {
      throw new Error('Unable to send verification code')
    }

    const response = await sendPublicApplicationEmailVerification(publicLoanRequestSlug, email)
    setVerificationEmail(email.toLowerCase())
    setEmailVerificationCode('')
    setVerificationMessage(response.message || 'Verification code sent')
  }

  const handleResendVerificationCode = async () => {
    if (!publicLoanRequestSlug || disabled) {
      return
    }

    markTouched('email')
    setError('')
    setSuccess('')
    setVerificationMessage('')

    if (!emailValue) {
      setError('Email address is required')
      return
    }

    if (validation.errors.email) {
      setError(validation.errors.email)
      return
    }

    setSendingVerificationCode(true)
    try {
      await requestVerificationCode(emailValue)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to send verification code')
    } finally {
      setSendingVerificationCode(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled) {
      return
    }

    setError('')
    setSuccess('')
    setSubmitting(true)
    let attemptedSubmission = false

    try {
      const validated = validateLoanApplicationInput({
        ...form,
        principal: Number(form.principal),
        income: parseOptionalNumber(form.income),
        gives: Number(form.gives),
        paymentFrequency: BORROWER_REQUEST_PAYMENT_FREQUENCY,
        firstDay: BORROWER_REQUEST_FIRST_DAY,
        secondDay: BORROWER_REQUEST_SECOND_DAY,
      }, { requireEmail: requiresPublicEmailVerification })

      if (requiresPublicEmailVerification) {
        if (!validated.email) {
          throw new Error('Email address is required')
        }

        const submittedForm = form
        setPendingPublicApplication(validated)
        setPendingSubmittedForm(submittedForm)
        if (verificationEmail === validated.email.toLowerCase()) {
          setVerificationDialogOpen(true)
          return
        }

        await requestVerificationCode(validated.email)
        setVerificationDialogOpen(true)
        return
      }

      const submittedForm = form
      attemptedSubmission = true
      const created = onSubmitApplication
        ? await onSubmitApplication(validated)
        : publicLoanRequestSlug
          ? await createPublicLoanApplication(publicLoanRequestSlug, {
            ...validated,
            emailVerificationCode: emailVerificationCode.trim(),
          })
          : null

      if (!created) {
        throw new Error('Unable to submit loan application')
      }

      const submittedMessage = await onSubmitted?.(created)
      setSuccess(submittedMessage || resolvedSuccessMessage(created, submittedForm))
      resetSubmittedForm()
    } catch (caughtError) {
      const submitError = caughtError instanceof Error ? caughtError : new Error('Unable to submit loan application')
      setError(submitError.message)
      if (attemptedSubmission) {
        onSubmitError?.(submitError)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmVerification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!publicLoanRequestSlug || !pendingPublicApplication || !pendingSubmittedForm) {
      return
    }

    setError('')
    setSuccess('')

    if (emailVerificationCode.trim().length !== 6) {
      setError('Email verification code is required')
      return
    }

    setSubmitting(true)
    try {
      const created = await createPublicLoanApplication(publicLoanRequestSlug, {
        ...pendingPublicApplication,
        emailVerificationCode: emailVerificationCode.trim(),
      })
      const submittedMessage = await onSubmitted?.(created)
      setSuccess(submittedMessage || resolvedSuccessMessage(created, pendingSubmittedForm))
      resetSubmittedForm()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to submit loan application')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <form className="request-loan-form" onSubmit={handleSubmit} noValidate>
      <div className="request-loan-form__grid">
        <div className="request-loan-form__field">
          <label htmlFor={`${idPrefix}FirstName`}>First Name</label>
          <input
            id={`${idPrefix}FirstName`}
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
          <label htmlFor={`${idPrefix}LastName`}>Last Name</label>
          <input
            id={`${idPrefix}LastName`}
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
          <label htmlFor={`${idPrefix}Email`}>Email Address</label>
          <input
            id={`${idPrefix}Email`}
            type="email"
            autoComplete="email"
            placeholder="julian@example.com"
            readOnly={emailReadOnly}
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
          <label htmlFor={`${idPrefix}Phone`}>Phone Number</label>
          <input
            id={`${idPrefix}Phone`}
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
          <label htmlFor={`${idPrefix}Principal`}>Loan Amount</label>
          <input
            id={`${idPrefix}Principal`}
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
          <label htmlFor={`${idPrefix}Income`}>Monthly Income</label>
          <input
            id={`${idPrefix}Income`}
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
          <label htmlFor={`${idPrefix}Gives`}>Number of Installments</label>
          <input
            id={`${idPrefix}Gives`}
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
          <span className="request-loan-form__fieldLabel">Schedule</span>
          <div
            className="request-loan-form__readonly"
            role="status"
          >
            Semi-monthly (15th and month end)
          </div>
        </div>
      </div>

      <div className="request-loan-form__field request-loan-form__field--full">
        <span className="request-loan-form__fieldLabel">First due date (computed)</span>
        <div
          className="request-loan-form__readonly"
          role="status"
        >
          {form.firstPaymentDate}
        </div>
      </div>

      <div className="request-loan-form__field">
          <label htmlFor={`${idPrefix}Purpose`}>Loan Purpose</label>
        <textarea
          id={`${idPrefix}Purpose`}
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

      {error && !verificationDialogOpen ? <div className="notice danger request-loan-form__notice">{error}</div> : null}
      {disabled && disabledMessage ? <div className="notice danger request-loan-form__notice">{disabledMessage}</div> : null}
      {verificationMessage && !verificationDialogOpen ? <div className="notice request-loan-form__notice">{verificationMessage}</div> : null}
      {success ? <div className="notice request-loan-form__notice">{success}</div> : null}

      <button
        className="request-loan-form__submit"
        type="submit"
        disabled={disabled || submitting || !validation.isValid}
      >
        <span>
          {submitting
            ? requiresPublicEmailVerification
              ? 'Sending verification code...'
              : submittingLabel
            : submitLabel}
        </span>
        <span className="request-loan-form__submitArrow" aria-hidden="true">→</span>
      </button>

        {finePrint ? <p className="request-loan-form__finePrint">{finePrint}</p> : null}
      </form>
      {requiresPublicEmailVerification ? (
        <Dialog
          id={`${idPrefix}EmailVerificationDialog`}
          open={verificationDialogOpen}
          title="Verify your email"
          description={verificationEmail ? `Enter the 6-digit code sent to ${verificationEmail}.` : 'Enter the 6-digit code sent to your email.'}
          onClose={() => {
            if (!submitting) {
              setVerificationDialogOpen(false)
            }
          }}
          actions={(
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting || sendingVerificationCode}
                onClick={handleResendVerificationCode}
              >
                {sendingVerificationCode ? 'Sending...' : 'Send new code'}
              </Button>
              <Button
                type="submit"
                form={`${idPrefix}EmailVerificationForm`}
                disabled={submitting || emailVerificationCode.trim().length !== 6}
              >
                {submitting ? 'Submitting...' : 'Verify and submit'}
              </Button>
            </>
          )}
        >
          <form id={`${idPrefix}EmailVerificationForm`} className="request-loan-form" onSubmit={handleConfirmVerification} noValidate>
            {verificationMessage ? <div className="notice request-loan-form__notice">{verificationMessage}</div> : null}
            {error ? <div className="notice danger request-loan-form__notice">{error}</div> : null}
            <div className="request-loan-form__field">
              <label htmlFor={`${idPrefix}EmailVerificationCode`}>Email Verification Code</label>
              <input
                id={`${idPrefix}EmailVerificationCode`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={emailVerificationCode}
                onChange={(event) => {
                  setEmailVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }}
              />
            </div>
          </form>
        </Dialog>
      ) : null}
    </>
  )
}
