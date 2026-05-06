import { NextRequest, NextResponse } from 'next/server'
import {
  isPaymentFrequency,
  validateLoanApplicationInput,
} from '@/lib/loan-application-validation'
import { API_BASE_URL } from '@/lib/constants'
import { getBorrowerRequestSemiMonthlyFirstPaymentDate } from '@/lib/loan-schedule'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type {
  LoanApplication,
  LoanApplicationDraftInput,
} from '@/lib/types'

interface BackendEnvelope<T> {
  message?: string
  data: T
}

function isDraftApplicationPayload(body: Record<string, unknown>) {
  return 'borrowerId' in body || 'loanProductId' in body || 'loanAmountMinor' in body
}

function getDraftPayload(body: Record<string, unknown>): LoanApplicationDraftInput {
  const rawPaymentDays = Array.isArray(body.paymentDays)
    ? body.paymentDays
      .map((day) => (typeof day === 'string' ? day.trim().toLowerCase() : String(day)))
      .filter((day) => day.length > 0)
    : []
  const legacyCutoffPatternCode =
    body.cutoffPatternCode === '5_20' || body.cutoffPatternCode === '15_month_end'
      ? body.cutoffPatternCode
      : null
  const paymentDays = rawPaymentDays.length > 0
    ? rawPaymentDays
    : legacyCutoffPatternCode === '5_20'
      ? ['5', '20']
      : legacyCutoffPatternCode === '15_month_end'
        ? ['15', 'month_end']
        : []

  return {
    borrowerId: typeof body.borrowerId === 'string' ? body.borrowerId : '',
    loanProductId:
      typeof body.loanProductId === 'string' && body.loanProductId.trim().length > 0
        ? body.loanProductId.trim()
        : undefined,
    loanAmountMinor: Number(body.loanAmountMinor),
    numberOfCutoffs: Number(body.numberOfCutoffs),
    startDate: typeof body.startDate === 'string' ? body.startDate : '',
    paymentType: body.paymentType === 'monthly' ? 'monthly' : 'semi_monthly',
    paymentDays,
    cutoffPatternCode: legacyCutoffPatternCode,
    purpose: typeof body.purpose === 'string' ? body.purpose.trim() : undefined,
  }
}

// export async function GET() {
//   try {
//     const applications = await authorizedBackendRequest<LoanApplication[]>('/loan-applications')
//     return NextResponse.json(applications)
//   } catch (caughtError) {
//     return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan applications', 401)
//   }
// }
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString()

  try {
    const applications = await authorizedBackendRequest(
      `/loan-applications${query ? `?${query}` : ''}`,
    )

    return NextResponse.json(applications)
  } catch (caughtError) {
    return jsonError(
      caughtError instanceof Error ? caughtError.message : 'Unable to load loan applications',
      401,
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody<Record<string, unknown>>(request)
  if (!body) {
    return jsonError('Invalid request body', 400)
  }

  if (isDraftApplicationPayload(body)) {
    try {
      const application = await authorizedBackendRequest<LoanApplication>('/loan-applications/submitted', {
        method: 'POST',
        body: JSON.stringify(getDraftPayload(body)),
      })

      return NextResponse.json(application, { status: 201 })
    } catch (caughtError) {
      return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to create loan application', 400)
    }
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
    return jsonError('Requested amount must be greater than zero', 400)
  }

  if (income === null) {
    return jsonError('Monthly income is required', 400)
  }

  if (!Number.isFinite(income) || income < 0) {
    return jsonError('Monthly income must be zero or greater', 400)
  }

  if (!purpose) {
    return jsonError('Loan purpose is required', 400)
  }

  if (!Number.isInteger(gives) || gives < 1) {
    return jsonError('Number of gives must be a whole number of at least 1', 400)
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

    const response = await fetch(`${API_BASE_URL}/loan-applications`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validated),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as BackendEnvelope<LoanApplication> | { message?: string } | null
    if (!response.ok) {
      return jsonError(payload?.message || 'Unable to submit application', response.status)
    }

    const created = payload && 'data' in payload ? payload.data : payload as LoanApplication | null
    if (!created) {
      return jsonError('Unable to submit application', 502)
    }

    return NextResponse.json(created, { status: 201 })
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to submit application'

    if (message === 'fetch failed') {
      return jsonError(`Fimana API is unavailable at ${API_BASE_URL}`, 503)
    }

    return jsonError(message, 400)
  }
}
