import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ACCESS_COOKIE_NAME, API_BASE_URL, REFRESH_COOKIE_NAME } from '@/lib/constants'
import { getExpiredSessionCookieOptions, getSessionCookieOptions } from '@/lib/session-cookies'
import type { User } from '@/lib/types/shared'

interface BackendEnvelope<T> {
  message?: string
  data: T
}

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
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
  const payload = (await response.json().catch(() => null)) as BackendEnvelope<T> | null

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Request failed'))
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

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })
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

async function refreshAuthSession(): Promise<AuthPayload | null> {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value

    if (!refreshToken) {
      return null
    }

    const response = await backendFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      await clearSessionCookies()
      return null
    }

    const authPayload = await parseBackendResponse<AuthPayload>(response)
    await setSessionCookies(authPayload)
    return authPayload
  } catch (error) {
    logSessionLookupError('refresh session', error)
    return null
  }
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
      await clearSessionCookies()
      return null
    }

    return parseBackendResponse<User>(response)
  } catch (error) {
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

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status })
}
