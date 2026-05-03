import { buildLoanDueDates, buildPaymentDays } from '@/lib/loan-schedule'
import type { LoanSchedulePreset, PaymentFrequency } from '@/lib/types'

export interface LoanApplicationValidationInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  principal: number
  gives: number
  paymentFrequency: PaymentFrequency
  firstDay: string
  secondDay: string
  paymentPreset: LoanSchedulePreset
  firstPaymentDate: string
  purpose: string
  income?: number | null
}

export interface ValidatedLoanApplicationInput {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  principal: number
  gives: number
  paymentFrequency: PaymentFrequency
  paymentDays: string[]
  paymentPreset: LoanSchedulePreset
  firstPaymentDate: string
  purpose: string
  income: number
  source?: 'public'
}

export interface LoanApplicationValidationErrors {
  firstName: string
  lastName: string
  email: string
  phone: string
  principal: string
  income: string
  purpose: string
  gives: string
  paymentDays: string
  firstPaymentDate: string
}

export interface LoanApplicationValidationResult {
  errors: LoanApplicationValidationErrors
  normalized: {
    firstName: string
    lastName: string
    email: string
    phone: string
    purpose: string
    income: number | null
    firstPaymentDate: string
    paymentDays: string[]
  }
  isValid: boolean
}

const EMPTY_ERRORS: LoanApplicationValidationErrors = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  principal: '',
  income: '',
  purpose: '',
  gives: '',
  paymentDays: '',
  firstPaymentDate: '',
}

export function isPaymentFrequency(value: unknown): value is PaymentFrequency {
  return value === 'monthly' || value === 'twice_monthly'
}

export function isPaymentPreset(value: unknown): value is LoanSchedulePreset {
  return value === '15_month_end' || value === '5_20' || value === 'custom'
}

function normalizePhone(value: string) {
  const phone = value.trim()
  const digits = phone.replace(/\D/g, '')

  if (!digits || digits === '63') {
    return ''
  }

  const withoutCountryCode = digits.startsWith('63') ? digits.slice(2) : digits
  const localDigits = withoutCountryCode.startsWith('0') ? withoutCountryCode.slice(1) : withoutCountryCode

  return localDigits ? `+63 ${localDigits}` : ''
}

function getPhoneDigits(value: string) {
  return value.replace(/\D/g, '').replace(/^63/, '')
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getFirstValidationError(errors: LoanApplicationValidationErrors) {
  return (
    errors.firstName ||
    errors.lastName ||
    errors.email ||
    errors.phone ||
    errors.principal ||
    errors.income ||
    errors.purpose ||
    errors.gives ||
    errors.paymentDays ||
    errors.firstPaymentDate
  )
}

export function getLoanApplicationValidationResult(input: LoanApplicationValidationInput): LoanApplicationValidationResult {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const email = input.email.trim()
  const phone = normalizePhone(input.phone)
  const purpose = input.purpose.trim()
  const income = input.income ?? null
  const firstPaymentDate = input.firstPaymentDate
  const errors = { ...EMPTY_ERRORS }
  let paymentDays: string[] = []

  if (!firstName) {
    errors.firstName = 'First name is required'
  }

  if (!lastName) {
    errors.lastName = 'Last name is required'
  }

  if (email && !isValidEmail(email)) {
    errors.email = 'Enter a valid email address'
  }

  if (phone && getPhoneDigits(phone).length !== 10) {
    errors.phone = 'Phone number must be 10 digits'
  }

  if (!email && !phone) {
    errors.phone = 'Provide an email address or phone number'
  }

  if (!Number.isFinite(input.principal) || input.principal <= 0) {
    errors.principal = 'Requested amount must be greater than zero'
  }

  if (income === null) {
    errors.income = 'Monthly income is required'
  } else if (!Number.isFinite(income) || income < 0) {
    errors.income = 'Monthly income must be zero or greater'
  }

  if (!purpose) {
    errors.purpose = 'Loan purpose is required'
  }

  if (!Number.isInteger(input.gives) || input.gives < 1) {
    errors.gives = 'Number of gives must be a whole number of at least 1'
  }

  if (!firstPaymentDate) {
    errors.firstPaymentDate = 'Preferred first payment date is required'
  }

  if (
    input.paymentFrequency === 'twice_monthly' &&
    input.paymentPreset === 'custom' &&
    input.firstDay === input.secondDay
  ) {
    errors.paymentDays = 'Choose two different payment days for a twice-monthly schedule'
  }

  if (!errors.paymentDays) {
    paymentDays = buildPaymentDays(
      input.paymentFrequency,
      input.firstDay,
      input.secondDay,
      input.paymentPreset,
    )
  }

  if (!errors.gives && !errors.paymentDays && !errors.firstPaymentDate) {
    try {
      buildLoanDueDates(input.gives, input.paymentFrequency, paymentDays, firstPaymentDate)
    } catch (caughtError) {
      errors.firstPaymentDate = caughtError instanceof Error
        ? caughtError.message
        : 'Enter a valid first payment date'
    }
  }

  return {
    errors,
    normalized: {
      firstName,
      lastName,
      email,
      phone,
      purpose,
      income,
      firstPaymentDate,
      paymentDays,
    },
    isValid: !getFirstValidationError(errors),
  }
}

export function validateLoanApplicationInput(input: LoanApplicationValidationInput): ValidatedLoanApplicationInput {
  const validation = getLoanApplicationValidationResult(input)
  const firstError = getFirstValidationError(validation.errors)

  if (firstError) {
    throw new Error(firstError)
  }

  return {
    firstName: validation.normalized.firstName,
    lastName: validation.normalized.lastName,
    email: validation.normalized.email || undefined,
    phone: validation.normalized.phone || undefined,
    principal: input.principal,
    gives: input.gives,
    paymentFrequency: input.paymentFrequency,
    paymentDays: validation.normalized.paymentDays,
    paymentPreset: input.paymentPreset,
    firstPaymentDate: validation.normalized.firstPaymentDate,
    purpose: validation.normalized.purpose,
    income: validation.normalized.income!,
    source: 'public',
  }
}
