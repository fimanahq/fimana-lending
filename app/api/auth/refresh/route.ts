import { NextRequest, NextResponse } from 'next/server'
import { hasLoanAppAccess } from '@/lib/access'
import { API_BASE_URL, REFRESH_COOKIE_NAME } from '@/lib/constants'
import { isProtectedPath } from '@/lib/protected-routes'
import { clearSessionCookies, createSession } from '@/lib/server/backend'
import type { User } from '@/lib/types/shared'

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

function getSafeDestination(nextPath: string | null) {
  return nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') && isProtectedPath(nextPath)
    ? nextPath
    : '/dashboard'
}

function getLoginUrl(request: NextRequest, nextPath: string) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', nextPath)
  return loginUrl
}

export async function GET(request: NextRequest) {
  const nextPath = getSafeDestination(request.nextUrl.searchParams.get('next'))
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value

  if (!refreshToken) {
    return NextResponse.redirect(getLoginUrl(request, nextPath))
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  }).catch(() => null)

  if (!response?.ok) {
    await clearSessionCookies()
    return NextResponse.redirect(getLoginUrl(request, nextPath))
  }

  const payload = await response.json().catch(() => null) as { data?: AuthPayload } | null
  const authPayload = payload?.data

  if (!authPayload?.accessToken || !authPayload.refreshToken || !authPayload.user) {
    await clearSessionCookies()
    return NextResponse.redirect(getLoginUrl(request, nextPath))
  }

  if (!hasLoanAppAccess(authPayload.user)) {
    await clearSessionCookies()
    return NextResponse.redirect(getLoginUrl(request, nextPath))
  }

  await createSession(authPayload)
  return NextResponse.redirect(new URL(nextPath, request.url))
}
