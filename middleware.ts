import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { REFRESH_COOKIE_NAME } from '@/lib/constants'

const protectedPaths = [
  '/active-loans',
  '/borrowers',
  '/calculator',
  '/collections',
  '/dashboard',
  '/loan-applications',
  '/loans',
  '/payments',
  '/reports',
  '/rules',
  '/settings',
]

function isProtectedPath(pathname: string) {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasRefreshToken = Boolean(request.cookies.get(REFRESH_COOKIE_NAME)?.value)

  if (isProtectedPath(pathname) && !hasRefreshToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
