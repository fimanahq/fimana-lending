import { NextRequest, NextResponse } from 'next/server'
import { hasLoanAppAccess } from '@/lib/access'
import { ACCESS_COOKIE_NAME, API_BASE_URL, REFRESH_COOKIE_NAME } from '@/lib/constants'
import {
  AUTH_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
  getFetchFailureMessage,
  isAbortLikeError,
} from '@/lib/fetch-timeout'
import { getSessionCookieOptions } from '@/lib/session-cookies'
import { clearSessionCookies, jsonError } from '@/lib/server/backend'
import type { User } from '@/lib/types/shared'

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

function setRefreshResponseCookies(response: NextResponse, authPayload: AuthPayload) {
  const accessCookieOptions = getSessionCookieOptions(authPayload.accessToken)
  const refreshCookieOptions = getSessionCookieOptions(authPayload.refreshToken)

  if (!accessCookieOptions || !refreshCookieOptions) {
    return false
  }

  response.cookies.set(ACCESS_COOKIE_NAME, authPayload.accessToken, accessCookieOptions)
  response.cookies.set(REFRESH_COOKIE_NAME, authPayload.refreshToken, refreshCookieOptions)
  return true
}

function isDefinitiveAuthFailure(status: number) {
  return status === 401 || status === 403
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value

  if (!refreshToken) {
    return jsonError('Unauthorized', 401)
  }

  let response: Response

  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    }, AUTH_FETCH_TIMEOUT_MS)
  } catch (error) {
    return jsonError(getFetchFailureMessage(error), isAbortLikeError(error) ? 408 : 503)
  }

  if (!response.ok) {
    const isAuthFailure = isDefinitiveAuthFailure(response.status)

    if (isAuthFailure) {
      await clearSessionCookies()
    }

    return jsonError(isAuthFailure ? 'Unauthorized' : 'Unable to refresh session', isAuthFailure ? response.status : 503)
  }

  const payload = await response.json().catch(() => null) as { data?: AuthPayload } | null
  const authPayload = payload?.data

  if (!authPayload?.accessToken || !authPayload.refreshToken || !authPayload.user) {
    return jsonError('Unable to refresh session', 503)
  }

  if (!hasLoanAppAccess(authPayload.user)) {
    await clearSessionCookies()
    return jsonError('This account does not have access to FiMana Lending.', 403)
  }

  const refreshResponse = NextResponse.json({ ok: true })

  if (!setRefreshResponseCookies(refreshResponse, authPayload)) {
    return jsonError('Unable to refresh session', 503)
  }

  return refreshResponse
}
