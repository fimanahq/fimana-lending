import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'
import { AUTH_FETCH_TIMEOUT_MS, fetchWithTimeout, getFetchFailureMessage, isAbortLikeError } from '@/lib/fetch-timeout'
import { createSession } from '@/lib/server/backend'
import { isBorrowerProtectedPath, isLenderProtectedPath } from '@/lib/protected-routes'
import type { User } from '@/lib/types/shared'

const GOOGLE_AUTH_STATE_COOKIE = 'fimana_google_auth_state'

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

function getLoginUrl(request: NextRequest, reason: string) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('authError', reason)
  return loginUrl
}

function getDestination(state: string | null, user: User) {
  if (user.accountTypeSelectionRequired) {
    return '/select-account-type'
  }

  const parts = state?.split(':') ?? []
  const rawNext = parts.length >= 3 ? decodeURIComponent(parts.slice(2).join(':')) : ''
  const isSafePath = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
  if (isSafePath && user.accountType === 'borrower' && isBorrowerProtectedPath(rawNext)) {
    return rawNext
  }

  if (isSafePath && user.accountType === 'lender' && isLenderProtectedPath(rawNext)) {
    return rawNext
  }

  return user.accountType === 'borrower' ? '/portal' : '/dashboard'
}

export async function GET(request: NextRequest) {
  const ticket = request.nextUrl.searchParams.get('ticket')
  const state = request.nextUrl.searchParams.get('state')
  const expectedState = request.cookies.get(GOOGLE_AUTH_STATE_COOKIE)?.value

  if (!ticket || !state || state !== expectedState) {
    return NextResponse.redirect(getLoginUrl(request, 'google_state'))
  }

  let backendResponse: Response

  try {
    backendResponse = await fetchWithTimeout(`${API_BASE_URL}/auth/google/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ticket }),
      cache: 'no-store',
    }, AUTH_FETCH_TIMEOUT_MS)
  } catch (error) {
    const loginUrl = getLoginUrl(request, isAbortLikeError(error) ? 'google_timeout' : 'google_unavailable')
    loginUrl.searchParams.set('message', getFetchFailureMessage(error))
    return NextResponse.redirect(loginUrl)
  }

  const payload = await backendResponse.json().catch(() => null)
  if (!backendResponse.ok) {
    return NextResponse.redirect(getLoginUrl(request, 'google_failed'))
  }

  const authPayload = payload.data as AuthPayload
  const user = await createSession(authPayload)
  const response = NextResponse.redirect(new URL(getDestination(state, user), request.url))
  response.cookies.set(GOOGLE_AUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}
