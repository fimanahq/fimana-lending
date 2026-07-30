import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'
import {
  fetchWithTimeout,
  getFetchFailureMessage,
  isAbortLikeError,
  REQUEST_LOAN_FETCH_TIMEOUT_MS,
} from '@/lib/fetch-timeout'
import { jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'

interface BackendEnvelope<T> {
  message?: string
  data: T
}

interface SendEmailVerificationRouteContext {
  params: Promise<{
    slug: string
  }>
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: NextRequest, context: SendEmailVerificationRouteContext) {
  const { slug } = await context.params
  const body = await readJsonBody<{ email?: unknown }>(request)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email) {
    return jsonError('Email address is required', 400)
  }

  if (!isValidEmail(email)) {
    return jsonError('Enter a valid email address', 400)
  }

  let response: Response

  try {
    response = await fetchWithTimeout(
      `${API_BASE_URL}/loan-applications/public/${encodeURIComponent(slug)}/email-verification/send`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        cache: 'no-store',
      },
      REQUEST_LOAN_FETCH_TIMEOUT_MS,
    )
  } catch (caughtError) {
    return jsonError(getFetchFailureMessage(caughtError), isAbortLikeError(caughtError) ? 408 : 503)
  }

  const payload = (await response.json().catch(() => null)) as BackendEnvelope<{
    message: string
    expiresInSeconds: number
  }> | { message?: string } | null

  if (!response.ok) {
    return jsonError(payload?.message || 'Unable to send verification code', response.status)
  }

  const data = payload && 'data' in payload ? payload.data : payload
  return NextResponse.json(data ?? { message: 'Verification code sent', expiresInSeconds: 600 })
}
