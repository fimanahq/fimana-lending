import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/constants'
import { isJwtExpiredOrNearExpiry } from '@/lib/jwt-expiry'
import { isProtectedPath } from '@/lib/protected-routes'

function getLoginUrl(request: NextRequest) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return loginUrl
}

function getRefreshUrl(request: NextRequest) {
  const refreshUrl = new URL('/refresh-session', request.url)
  refreshUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return refreshUrl
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value

  if (accessToken && !isJwtExpiredOrNearExpiry(accessToken, 30)) {
    return NextResponse.next()
  }

  if (refreshToken) {
    return NextResponse.redirect(getRefreshUrl(request))
  }

  return NextResponse.redirect(getLoginUrl(request))
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
