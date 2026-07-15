import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'
import { isProtectedPath } from '@/lib/protected-routes'

const GOOGLE_AUTH_STATE_COOKIE = 'fimana_google_auth_state'

interface GoogleAuthState {
  nonce: string
  next: string
  lenderSlug?: string
}

function getSafeDestination(nextPath: string | null) {
  if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') && isProtectedPath(nextPath)) {
    return nextPath
  }

  return '/portal'
}

export async function GET(request: NextRequest) {
  const nonce = crypto.randomUUID()
  const next = getSafeDestination(request.nextUrl.searchParams.get('next'))
  const requestedLenderSlug = request.nextUrl.searchParams.get('lenderSlug')?.trim().toLowerCase() ?? ''
  const lenderSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedLenderSlug)
    ? requestedLenderSlug
    : undefined
  const authState: GoogleAuthState = { nonce, next, lenderSlug }
  const state = Buffer.from(JSON.stringify(authState)).toString('base64url')
  const redirectUrl = new URL('/auth/google', API_BASE_URL)
  redirectUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set(GOOGLE_AUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60,
  })

  return response
}
