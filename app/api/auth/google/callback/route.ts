import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'
import { getPostAuthDestination, hasBorrowerPortalAccess, hasLoanAppAccess } from '@/lib/access'
import { AUTH_FETCH_TIMEOUT_MS, fetchWithTimeout, getFetchFailureMessage, isAbortLikeError } from '@/lib/fetch-timeout'
import { createSession } from '@/lib/server/backend'
import { resolveDefaultAdminLenderMode } from '@/lib/server/auth-mode'
import { isBorrowerProtectedPath, isLenderProtectedPath } from '@/lib/protected-routes'
import type { User } from '@/lib/types/shared'

const GOOGLE_AUTH_STATE_COOKIE = 'fimana_google_auth_state'

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

interface GoogleAuthState {
  nonce: string
  next: string
  lenderSlug?: string
}

function getLoginUrl(request: NextRequest, reason: string) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('authError', reason)
  return loginUrl
}

function parseAuthState(state: string): GoogleAuthState | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as Partial<GoogleAuthState>
    if (typeof parsed.nonce !== 'string' || typeof parsed.next !== 'string') {
      return null
    }
    return {
      nonce: parsed.nonce,
      next: parsed.next,
      lenderSlug: typeof parsed.lenderSlug === 'string' ? parsed.lenderSlug : undefined,
    }
  } catch {
    return null
  }
}

function getDestination(authState: GoogleAuthState, user: User) {
  const rawNext = authState.next
  const isSafePath = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
  if (isSafePath && hasBorrowerPortalAccess(user) && isBorrowerProtectedPath(rawNext)) {
    return rawNext
  }

  if (isSafePath && hasLoanAppAccess(user) && isLenderProtectedPath(rawNext)) {
    return rawNext
  }

  return getPostAuthDestination(user)
}

export async function GET(request: NextRequest) {
  const ticket = request.nextUrl.searchParams.get('ticket')
  const state = request.nextUrl.searchParams.get('state')
  const expectedState = request.cookies.get(GOOGLE_AUTH_STATE_COOKIE)?.value

  if (!ticket || !state || state !== expectedState) {
    return NextResponse.redirect(getLoginUrl(request, 'google_state'))
  }

  const authState = parseAuthState(state)
  if (!authState) {
    return NextResponse.redirect(getLoginUrl(request, 'google_state'))
  }

  let backendResponse: Response

  try {
    backendResponse = await fetchWithTimeout(`${API_BASE_URL}/auth/google/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ticket, lenderSlug: authState.lenderSlug }),
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

  const authPayload = await resolveDefaultAdminLenderMode(payload.data as AuthPayload)
  const user = await createSession(authPayload)
  const response = NextResponse.redirect(new URL(getDestination(authState, user), request.url))
  response.cookies.set(GOOGLE_AUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}
