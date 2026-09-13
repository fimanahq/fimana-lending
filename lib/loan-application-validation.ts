import { buildLoanDueDates, buildPaymentDays } from '@/lib/loan-schedule'
import type { PaymentFrequency } from '@/lib/types/shared'
import type { AddressDetails } from '@/lib/types/lending'

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
  firstPaymentDate: string
  purpose: string
  income?: number | null
  addressDetails?: AddressDetails
}

interface LoanApplicationValidationOptions {
  requireEmail?: boolean
  requireAddress?: boolean
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
  firstPaymentDate: string
  purpose: string
  income: number
  source?: 'public'
  addressDetails?: AddressDetails
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
  line1: string
  line2: string
  city: string
  province: string
  postalCode: string
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
    addressDetails: AddressDetails | null
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
  line1: '',
  line2: '',
  city: '',
  province: '',
  postalCode: '',
}

export function isPaymentFrequency(value: unknown): value is PaymentFrequency {
  return value === 'monthly' || value === 'semi_monthly'
}

export function normalizeIncomingPaymentFrequency(
  value: PaymentFrequency | 'twice_monthly',
): PaymentFrequency {
  return value === 'twice_monthly' ? 'semi_monthly' : value
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
    || errors.line1
    || errors.line2
    || errors.city
    || errors.province
    || errors.postalCode
  )
}

export function getLoanApplicationValidationResult(
  input: LoanApplicationValidationInput,
  options: LoanApplicationValidationOptions = {},
): LoanApplicationValidationResult {
  const paymentFrequency = normalizeIncomingPaymentFrequency(input.paymentFrequency)
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const email = input.email.trim()
  const phone = normalizePhone(input.phone)
  const purpose = input.purpose.trim()
  const income = input.income ?? null
  const firstPaymentDate = input.firstPaymentDate
  const addressDetails = input.addressDetails
    ? {
        line1: input.addressDetails.line1.trim(),
        line2: input.addressDetails.line2.trim(),
        city: input.addressDetails.city.trim(),
        province: input.addressDetails.province.trim(),
        postalCode: input.addressDetails.postalCode?.trim() || undefined,
      }
    : null
  const errors = { ...EMPTY_ERRORS }
  let paymentDays: string[] = []

  if (!firstName) {
    errors.firstName = 'First name is required'
  }

  if (!lastName) {
    errors.lastName = 'Last name is required'
  }

  if (options.requireEmail && !email) {
    errors.email = 'Email address is required'
  } else if (email && !isValidEmail(email)) {
    errors.email = 'Enter a valid email address'
  }

  if (phone && getPhoneDigits(phone).length !== 10) {
    errors.phone = 'Phone number must be 10 digits'
  }

  if (!options.requireEmail && !email && !phone) {
    errors.phone = 'Provide an email address or phone number'
  }

  if (!Number.isFinite(input.principal) || input.principal <= 0) {
    errors.principal = 'Loan amount must be greater than zero'
  }

  if (income === null) {
    errors.income = 'Monthly Income is required'
  } else if (!Number.isFinite(income) || income < 0) {
    errors.income = 'Monthly Income must be zero or greater'
  }

  if (!purpose) {
    errors.purpose = 'Loan purpose is required'
  }

  if (!Number.isInteger(input.gives) || input.gives < 1) {
    errors.gives = 'Number of installments must be a whole number of at least 1'
  }

  if (!firstPaymentDate) {
    errors.firstPaymentDate = 'Start date is required'
  }

  if (options.requireAddress && !addressDetails?.line1) {
    errors.line1 = 'Street address is required'
  }
  if (options.requireAddress && !addressDetails?.line2) {
    errors.line2 = 'Barangay or district is required'
  }
  if (options.requireAddress && !addressDetails?.city) {
    errors.city = 'City or municipality is required'
  }
  if (options.requireAddress && !addressDetails?.province) {
    errors.province = 'Province is required'
  }
  if (addressDetails?.postalCode && !/^\d{4}$/.test(addressDetails.postalCode)) {
    errors.postalCode = 'Postal code must be 4 digits'
  }

  if (paymentFrequency === 'semi_monthly' && input.firstDay === input.secondDay) {
    errors.paymentDays = 'Choose two different payment days for a semi-monthly schedule'
  }

  if (!errors.paymentDays) {
    paymentDays = buildPaymentDays(
      paymentFrequency,
      input.firstDay,
      input.secondDay,
    )
  }

  if (!errors.gives && !errors.paymentDays && !errors.firstPaymentDate) {
    try {
      buildLoanDueDates(input.gives, paymentFrequency, paymentDays, firstPaymentDate)
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
      addressDetails,
    },
    isValid: !getFirstValidationError(errors),
  }
}

export function validateLoanApplicationInput(
  input: LoanApplicationValidationInput,
  options: LoanApplicationValidationOptions = {},
): ValidatedLoanApplicationInput {
  const validation = getLoanApplicationValidationResult(input, options)
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
    paymentFrequency: normalizeIncomingPaymentFrequency(input.paymentFrequency),
    paymentDays: validation.normalized.paymentDays,
    firstPaymentDate: validation.normalized.firstPaymentDate,
    purpose: validation.normalized.purpose,
    income: validation.normalized.income!,
    source: 'public',
    addressDetails: validation.normalized.addressDetails ?? undefined,
  }
}
