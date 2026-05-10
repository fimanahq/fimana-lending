import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ACCESS_COOKIE_NAME, API_BASE_URL, REFRESH_COOKIE_NAME } from '@/lib/constants'
import { isJwtExpiredOrNearExpiry } from '@/lib/jwt-expiry'
import { isProtectedPath } from '@/lib/protected-routes'
import { getExpiredSessionCookieOptions, getSessionCookieOptions } from '@/lib/session-cookies'

function getLoginUrl(request: NextRequest) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return loginUrl
}

function applySessionCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  const accessCookieOptions = getSessionCookieOptions(accessToken)
  const refreshCookieOptions = getSessionCookieOptions(refreshToken)

  if (!accessCookieOptions || !refreshCookieOptions) {
    return false
  }

  response.cookies.set(ACCESS_COOKIE_NAME, accessToken, accessCookieOptions)
  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions)
  return true
}

function clearSessionCookies(response: NextResponse) {
  const expiredCookieOptions = getExpiredSessionCookieOptions()

  response.cookies.set(ACCESS_COOKIE_NAME, '', expiredCookieOptions)
  response.cookies.set(REFRESH_COOKIE_NAME, '', expiredCookieOptions)
}

function withUpdatedRequestCookies(request: NextRequest, accessToken: string, refreshToken: string) {
  const requestHeaders = new Headers(request.headers)
  const cookiePairs = request.cookies.getAll().filter(({ name }) => name !== ACCESS_COOKIE_NAME && name !== REFRESH_COOKIE_NAME)

  cookiePairs.push(
    { name: ACCESS_COOKIE_NAME, value: accessToken },
    { name: REFRESH_COOKIE_NAME, value: refreshToken },
  )

  requestHeaders.set(
    'cookie',
    cookiePairs.map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join('; '),
  )

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value

  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  if (!refreshToken) {
    return NextResponse.redirect(getLoginUrl(request))
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value
  if (accessToken && !isJwtExpiredOrNearExpiry(accessToken, 30)) {
    return NextResponse.next()
  }

  const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  }).catch(() => null)

  if (!refreshResponse?.ok) {
    const response = NextResponse.redirect(getLoginUrl(request))
    clearSessionCookies(response)
    return response
  }

  const payload = await refreshResponse.json().catch(() => null) as { data?: { accessToken?: string; refreshToken?: string } } | null
  const nextAccessToken = payload?.data?.accessToken
  const nextRefreshToken = payload?.data?.refreshToken

  if (!nextAccessToken || !nextRefreshToken) {
    const response = NextResponse.redirect(getLoginUrl(request))
    clearSessionCookies(response)
    return response
  }

  const response = withUpdatedRequestCookies(request, nextAccessToken, nextRefreshToken)
  if (!applySessionCookies(response, nextAccessToken, nextRefreshToken)) {
    const redirectResponse = NextResponse.redirect(getLoginUrl(request))
    clearSessionCookies(redirectResponse)
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
