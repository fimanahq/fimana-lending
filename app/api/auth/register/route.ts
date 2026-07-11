import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'
import { AUTH_FETCH_TIMEOUT_MS, fetchWithTimeout, getFetchFailureMessage, isAbortLikeError } from '@/lib/fetch-timeout'
import { normalizePhilippineMobileNumber } from '@/lib/phone'
import { createSession, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { User } from '@/lib/types/shared'

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
  verificationEmailSent?: boolean
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody<{
    email?: unknown
    password?: unknown
    firstName?: unknown
    lastName?: unknown
    mobileNumber?: unknown
  }>(request)

  if (!body) {
    return jsonError('Invalid request body', 400)
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const mobileNumber = typeof body.mobileNumber === 'string' ? normalizePhilippineMobileNumber(body.mobileNumber) : ''

  if (!email || !password || !firstName || !lastName || !mobileNumber) {
    return jsonError('Name, email, mobile number, and password are required', 400)
  }

  if (password.length < 8 || password.length > 72) {
    return jsonError('Password must be between 8 and 72 characters', 400)
  }

  if (firstName.length > 120 || lastName.length > 120) {
    return jsonError('Name must be 120 characters or fewer', 400)
  }

  let response: Response

  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName, mobileNumber }),
      cache: 'no-store',
    }, AUTH_FETCH_TIMEOUT_MS)
  } catch (error) {
    return jsonError(getFetchFailureMessage(error), isAbortLikeError(error) ? 408 : 503)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return jsonError(payload?.message || 'Unable to register', response.status)
  }

  const authPayload = payload.data as AuthPayload
  const user = await createSession(authPayload)
  return NextResponse.json({
    user,
    verificationEmailSent: authPayload.verificationEmailSent !== false,
  }, { status: 201 })
}
