import { NextRequest, NextResponse } from 'next/server'
import { isProtectedPath } from '@/lib/protected-routes'
import { BackendRequestError, jsonError, refreshAuthSession } from '@/lib/server/backend'

function getSafeDestination(nextPath: string | null) {
  return nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') && isProtectedPath(nextPath)
    ? nextPath
    : '/dashboard'
}

function getLoginUrl(request: NextRequest, nextPath: string, reason?: string) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', nextPath)

  if (reason) {
    loginUrl.searchParams.set('authError', reason)
  }

  return loginUrl
}

export async function GET(request: NextRequest) {
  const nextPath = getSafeDestination(request.nextUrl.searchParams.get('next'))

  try {
    const authPayload = await refreshAuthSession()

    if (!authPayload) {
      return NextResponse.redirect(getLoginUrl(request, nextPath))
    }

    return NextResponse.redirect(new URL(nextPath, request.url))
  } catch (caughtError) {
    if (caughtError instanceof BackendRequestError && (caughtError.status === 408 || caughtError.status === 503)) {
      return NextResponse.redirect(getLoginUrl(request, nextPath, 'refresh_unavailable'))
    }

    return NextResponse.redirect(getLoginUrl(request, nextPath))
  }
}

export async function POST() {
  try {
    const authPayload = await refreshAuthSession()

    if (!authPayload) {
      return jsonError('Unauthorized', 401)
    }

    return NextResponse.json({ ok: true })
  } catch (caughtError) {
    if (caughtError instanceof BackendRequestError) {
      return jsonError(caughtError.message, caughtError.status)
    }

    return jsonError('Unable to refresh session', 503)
  }
}
