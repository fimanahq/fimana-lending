import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'
import { AUTH_FETCH_TIMEOUT_MS, fetchWithTimeout, getFetchFailureMessage, isAbortLikeError } from '@/lib/fetch-timeout'
import { createSession, jsonError } from '@/lib/server/backend'
import { resolveDefaultAdminLenderMode } from '@/lib/server/auth-mode'
import { readJsonBody } from '@/lib/server/request'
import type { User } from '@/lib/types/shared'

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody<{ token?: unknown }>(request)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''

  if (!token) {
    return jsonError('Verification token is required', 400)
  }

  let response: Response

  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/auth/email-verification/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    }, AUTH_FETCH_TIMEOUT_MS)
  } catch (error) {
    return jsonError(getFetchFailureMessage(error), isAbortLikeError(error) ? 408 : 503)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return jsonError(payload?.message || 'Unable to verify email', response.status)
  }

  const authPayload = await resolveDefaultAdminLenderMode(payload.data as AuthPayload)
  const user = await createSession(authPayload)
  return NextResponse.json({ user })
}
