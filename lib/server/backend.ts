import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { hasFiManaSessionAccess } from '@/lib/access'
import { ACCESS_COOKIE_NAME, API_BASE_URL, REFRESH_COOKIE_NAME } from '@/lib/constants'
import {
  API_UNAVAILABLE_MESSAGE,
  AUTH_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
  getFetchFailureMessage,
  isAbortLikeError,
  REQUEST_TIMEOUT_MESSAGE,
} from '@/lib/fetch-timeout'
import { getExpiredSessionCookieOptions, getSessionCookieOptions } from '@/lib/session-cookies'
import type { User } from '@/lib/types/shared'

interface BackendEnvelope<T> {
  message?: string
  data: T
}

interface BackendErrorPayload {
  message?: string
  errorCode?: string
  availableAmountMinor?: number
  requiredAmountMinor?: number
}

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

export class BackendRequestError extends Error {
  status: number
  payload: BackendErrorPayload | null

  constructor(message: string, status: number, payload: BackendErrorPayload | null = null) {
    super(message)
    this.name = 'BackendRequestError'
    this.status = status
    this.payload = payload
  }
}

function isDefinitiveAuthFailure(status: number) {
  return status === 401 || status === 403
}

function isTransientBackendFailure(error: unknown) {
  return error instanceof BackendRequestError && (error.status === 408 || error.status === 503)
}

function getRefreshSingleFlightKey(refreshToken: string) {
  return createHash('sha256').update(refreshToken).digest('hex')
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload !== 'object' || payload === null || !('message' in payload) || typeof payload.message !== 'string') {
    return fallback
  }

  if ('errors' in payload && Array.isArray(payload.errors) && payload.errors.every((error) => typeof error === 'string')) {
    return `${payload.message}: ${payload.errors.join('; ')}`
  }

  return payload.message
}

async function parseBackendResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (BackendEnvelope<T> & BackendErrorPayload) | null

  if (!response.ok) {
    throw new BackendRequestError(getErrorMessage(payload, 'Request failed'), response.status, payload)
  }

  return payload?.data ?? (payload as unknown as T)
}

async function backendFetch(path: string, init: RequestInit = {}, accessToken?: string) {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  try {
    return await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    }, AUTH_FETCH_TIMEOUT_MS)
  } catch (error) {
    throw new BackendRequestError(getFetchFailureMessage(error), isAbortLikeError(error) ? 408 : 503)
  }
}

function logSessionLookupError(action: string, error: unknown) {
  console.warn(`[auth] ${action} failed`, error)
}

async function setSessionCookies(payload: AuthPayload) {
  const cookieStore = await cookies()
  const accessCookieOptions = getSessionCookieOptions(payload.accessToken)
  const refreshCookieOptions = getSessionCookieOptions(payload.refreshToken)

  if (!accessCookieOptions || !refreshCookieOptions) {
    throw new Error('Auth tokens are missing valid expiration claims')
  }

  cookieStore.set(ACCESS_COOKIE_NAME, payload.accessToken, accessCookieOptions)
  cookieStore.set(REFRESH_COOKIE_NAME, payload.refreshToken, refreshCookieOptions)
}

export async function clearSessionCookies() {
  const cookieStore = await cookies()
  const expiredCookieOptions = getExpiredSessionCookieOptions()

  cookieStore.set(ACCESS_COOKIE_NAME, '', expiredCookieOptions)
  cookieStore.set(REFRESH_COOKIE_NAME, '', expiredCookieOptions)
}

export async function createSession(payload: AuthPayload) {
  await setSessionCookies(payload)
  return payload.user
}

async function refreshBackendSession(refreshToken: string): Promise<RefreshResult> {
  let response: Response

  try {
    response = await backendFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  } catch (error) {
    if (error instanceof BackendRequestError && isTransientBackendFailure(error)) {
      return {
        ok: false,
        clearCookies: false,
        message: error.message,
        status: error.status,
      }
    }

    logSessionLookupError('refresh session', error)
    return {
      ok: false,
      clearCookies: false,
      message: 'Unable to refresh session',
      status: 503,
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

  try {
    const authPayload = await parseBackendResponse<AuthPayload>(response)

    if (!authPayload?.accessToken || !authPayload.refreshToken || !authPayload.user) {
      return {
        ok: false,
        clearCookies: false,
        message: 'Unable to refresh session',
        status: 503,
      }
    }

    if (!hasFiManaSessionAccess(authPayload.user)) {
      return {
        ok: false,
        clearCookies: true,
        message: 'This account does not have access to FiMana Lending.',
        status: 403,
      }
    }

    return { ok: true, authPayload }
  } catch (error) {
    logSessionLookupError('refresh session', error)
    return {
      ok: false,
      clearCookies: false,
      message: 'Unable to refresh session',
      status: 503,
    }
  }
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

export async function refreshAuthSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value

  if (!refreshToken) {
    return null
  }

  const result = await refreshBackendSessionOnce(refreshToken)

  if (!result.ok) {
    if (result.clearCookies) {
      await clearSessionCookies()
      return null
    }

    if (result.status === 408 || result.status === 503) {
      throw new BackendRequestError(result.message, result.status)
    }

    return null
  }

  await setSessionCookies(result.authPayload)
  return result.authPayload
}

export async function getSessionUser() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value

    if (!accessToken) {
      return null
    }

    const response = await backendFetch('/users/me', { method: 'GET' }, accessToken)
    if (!response.ok) {
      return null
    }

    return parseBackendResponse<User>(response)
  } catch (error) {
    logSessionLookupError('get session user', error)
    return null
  }
}

export async function getSessionUserWithRefresh() {
  try {
    const cookieStore = await cookies()
    let accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value

    if (!accessToken && !cookieStore.get(REFRESH_COOKIE_NAME)?.value) {
      return null
    }

    if (!accessToken) {
      const refreshed = await refreshAuthSession()
      return refreshed?.user ?? null
    }

    let response = await backendFetch('/users/me', { method: 'GET' }, accessToken)
    if (response.status === 401) {
      const refreshed = await refreshAuthSession()
      if (!refreshed) {
        return null
      }

      accessToken = refreshed.accessToken
      response = await backendFetch('/users/me', { method: 'GET' }, accessToken)
    }

    if (!response.ok) {
      if (isDefinitiveAuthFailure(response.status)) {
        await clearSessionCookies()
      }

      return null
    }

    return parseBackendResponse<User>(response)
  } catch (error) {
    if (isTransientBackendFailure(error)) {
      throw error
    }

    logSessionLookupError('get session user with refresh', error)
    return null
  }
}

export async function authorizedBackendRequest<T>(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies()
  let accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value

  if (!accessToken) {
    const refreshed = await refreshAuthSession()
    accessToken = refreshed?.accessToken
  }

  if (!accessToken) {
    throw new Error('Unauthorized')
  }

  let response = await backendFetch(path, init, accessToken)
  if (response.status === 401) {
    const refreshed = await refreshAuthSession()
    if (!refreshed) {
      throw new Error('Unauthorized')
    }

    response = await backendFetch(path, init, refreshed.accessToken)
  }

  return parseBackendResponse<T>(response)
}

export async function authorizedBackendRequestWithCurrentAccess<T>(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value

  if (!accessToken) {
    throw new Error('Unauthorized')
  }

  const response = await backendFetch(path, init, accessToken)
  return parseBackendResponse<T>(response)
}

export function jsonError(message: string, status = 400) {
  const resolvedStatus = message === REQUEST_TIMEOUT_MESSAGE
    ? 408
    : message === API_UNAVAILABLE_MESSAGE
      ? 503
      : status

  return NextResponse.json({ message }, { status: resolvedStatus })
}

export function backendErrorResponse(error: unknown, fallbackMessage: string, fallbackStatus = 400) {
  if (error instanceof BackendRequestError) {
    return NextResponse.json({
      message: error.message,
      ...(error.payload?.errorCode && { errorCode: error.payload.errorCode }),
      ...(error.payload?.availableAmountMinor !== undefined && {
        availableAmountMinor: error.payload.availableAmountMinor,
      }),
      ...(error.payload?.requiredAmountMinor !== undefined && {
        requiredAmountMinor: error.payload.requiredAmountMinor,
      }),
    }, { status: error.status })
  }

  const message = error instanceof Error ? error.message : fallbackMessage
  return jsonError(message, fallbackStatus)
}
