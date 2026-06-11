import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'
import { AUTH_FETCH_TIMEOUT_MS, fetchWithTimeout, getFetchFailureMessage, isAbortLikeError, LOGIN_FETCH_TIMEOUT_MS } from '@/lib/fetch-timeout'
import { createSession, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import { hasLoanAppAccess } from '@/lib/access'
import type { User } from '@/lib/types/shared'

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody<{ email?: unknown; password?: unknown }>(request)
  if (!body) {
    return jsonError('Invalid request body', 400)
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return jsonError('Email and password are required', 400)
  }

  let response: Response

  try {
    response = await fetchWithTimeout(
      `${API_BASE_URL}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
      },
      LOGIN_FETCH_TIMEOUT_MS,
    )
  } catch (error) {
    if (isAbortLikeError(error)) {
      return jsonError(getFetchFailureMessage(error), 408)
    }

    return jsonError(getFetchFailureMessage(error), 503)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return jsonError(payload?.message || 'Unable to sign in', response.status)
  }

  const authPayload = payload.data as AuthPayload
  if (!hasLoanAppAccess(authPayload.user)) {
    await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authPayload.accessToken}`,
      },
      body: JSON.stringify({ refreshToken: authPayload.refreshToken }),
      cache: 'no-store',
    }, AUTH_FETCH_TIMEOUT_MS).catch(() => null)

    return jsonError('This account does not have access to FiMana Lending.', 403)
  }

  const user = await createSession(authPayload)
  return NextResponse.json({ user })
}
