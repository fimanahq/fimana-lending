import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
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

type RefreshResult =
  | {
    ok: true
    authPayload: AuthPayload
  }
  | {
    ok: false
    clearCookies: boolean
    message: string
    status: number
  }

const refreshInFlight = new Map<string, Promise<RefreshResult>>()

function getRefreshSingleFlightKey(refreshToken: string) {
  return createHash('sha256').update(refreshToken).digest('hex')
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

async function refreshBackendSession(refreshToken: string): Promise<RefreshResult> {
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
    return {
      ok: false,
      clearCookies: false,
      message: getFetchFailureMessage(error),
      status: isAbortLikeError(error) ? 408 : 503,
    }
  }

  if (!response.ok) {
    const isAuthFailure = isDefinitiveAuthFailure(response.status)

    return {
      ok: false,
      clearCookies: isAuthFailure,
      message: isAuthFailure ? 'Unauthorized' : 'Unable to refresh session',
      status: isAuthFailure ? response.status : 503,
    }
  }

  const payload = await response.json().catch(() => null) as { data?: AuthPayload } | null
  const authPayload = payload?.data

  if (!authPayload?.accessToken || !authPayload.refreshToken || !authPayload.user) {
    return {
      ok: false,
      clearCookies: false,
      message: 'Unable to refresh session',
      status: 503,
    }
  }

  if (!hasLoanAppAccess(authPayload.user)) {
    return {
      ok: false,
      clearCookies: true,
      message: 'This account does not have access to FiMana Lending.',
      status: 403,
    }
  }

  return { ok: true, authPayload }
}

function refreshBackendSessionOnce(refreshToken: string) {
  const key = getRefreshSingleFlightKey(refreshToken)
  const currentRequest = refreshInFlight.get(key)

  if (currentRequest) {
    return currentRequest
  }

  const nextRequest = refreshBackendSession(refreshToken).finally(() => {
    globalThis.setTimeout(() => {
      if (refreshInFlight.get(key) === nextRequest) {
        refreshInFlight.delete(key)
      }
    }, 5000)
  })

  refreshInFlight.set(key, nextRequest)
  return nextRequest
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value

  if (!refreshToken) {
    return jsonError('Unauthorized', 401)
  }

  const result = await refreshBackendSessionOnce(refreshToken)

  if (!result.ok) {
    if (result.clearCookies) {
      await clearSessionCookies()
    }

    return jsonError(result.message, result.status)
  }

  const refreshResponse = NextResponse.json({ ok: true })

  if (!setRefreshResponseCookies(refreshResponse, result.authPayload)) {
    return jsonError('Unable to refresh session', 503)
  }

  return refreshResponse
}
