import { NextRequest, NextResponse } from 'next/server'
import {
  isPaymentFrequency,
  validateLoanApplicationInput,
} from '@/lib/loan-application-validation'
import { API_BASE_URL } from '@/lib/constants'
import {
  fetchWithTimeout,
  getFetchFailureMessage,
  isAbortLikeError,
  REQUEST_LOAN_FETCH_TIMEOUT_MS,
} from '@/lib/fetch-timeout'
import { getBorrowerRequestSemiMonthlyFirstPaymentDate } from '@/lib/loan-schedule'
import { jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { LoanApplication } from '@/lib/types/lending'

interface BackendEnvelope<T> {
  message?: string
  data: T
}

interface RequestLoanRouteContext {
  params: Promise<{
    slug: string
  }>
}

export async function POST(request: NextRequest, context: RequestLoanRouteContext) {
  const { slug } = await context.params
  const body = await readJsonBody<Record<string, unknown>>(request)
  if (!body) {
    return jsonError('Invalid request body', 400)
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const purpose = typeof body.purpose === 'string'
    ? body.purpose.trim()
    : typeof body.notes === 'string'
      ? body.notes.trim()
      : ''
  const firstPaymentDate = getBorrowerRequestSemiMonthlyFirstPaymentDate()
  const firstDay = '15'
  const secondDay = 'month_end'
  const principal = Number(body.principal)
  const income = body.income === undefined || body.income === null || body.income === ''
    ? null
    : Number(body.income)
  const gives = Number(body.gives)
  const paymentFrequency = 'semi_monthly' as const

  if (!firstName || !lastName) {
    return jsonError('Borrower first and last name are required', 400)
  }

  if (!email && !phone) {
    return jsonError('Provide at least an email address or phone number', 400)
  }

  if (!Number.isFinite(principal) || principal <= 0) {
    return jsonError('Loan amount must be greater than zero', 400)
  }

  if (income === null) {
    return jsonError('Monthly Income is required', 400)
  }

  if (!Number.isFinite(income) || income < 0) {
    return jsonError('Monthly Income must be zero or greater', 400)
  }

  if (!purpose) {
    return jsonError('Loan purpose is required', 400)
  }

  if (!Number.isInteger(gives) || gives < 1) {
    return jsonError('Number of installments must be a whole number of at least 1', 400)
  }

  if (!isPaymentFrequency(paymentFrequency)) {
    return jsonError('Invalid payment frequency', 400)
  }

  try {
    const validated = validateLoanApplicationInput({
      firstName,
      lastName,
      email,
      phone,
      principal,
      gives,
      paymentFrequency,
      firstDay,
      secondDay,
      firstPaymentDate,
      purpose,
      income,
    })

    const response = await fetchWithTimeout(`${API_BASE_URL}/loan-applications/public/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validated),
      cache: 'no-store',
    }, REQUEST_LOAN_FETCH_TIMEOUT_MS)

    const payload = (await response.json().catch(() => null)) as BackendEnvelope<LoanApplication> | { message?: string } | null
    if (!response.ok) {
      return jsonError(payload?.message || 'Public loan request link is unavailable', response.status)
    }

    const created = payload && 'data' in payload ? payload.data : payload as LoanApplication | null
    if (!created) {
      return jsonError('Unable to submit loan application', 502)
    }

    return NextResponse.json(created, { status: 201 })
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to submit loan application'

    if (isAbortLikeError(caughtError)) {
      return jsonError(getFetchFailureMessage(caughtError), 408)
    }

    if (message === 'fetch failed') {
      return jsonError(`Fimana API is unavailable at ${API_BASE_URL}`, 503)
    }

    return jsonError(message, 400)
  }
}
