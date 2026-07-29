import { NextResponse } from 'next/server'
import { hasFiManaSessionAccess } from '@/lib/access'
import { BackendRequestError, clearSessionCookies, getSessionUserWithRefresh, jsonError } from '@/lib/server/backend'

export async function GET() {
  let user

  try {
    user = await getSessionUserWithRefresh()
  } catch (caughtError) {
    if (caughtError instanceof BackendRequestError) {
      return jsonError(caughtError.message, caughtError.status)
    }

    return jsonError('Unable to verify session', 503)
  }

  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  if (!hasFiManaSessionAccess(user)) {
    await clearSessionCookies()
    return jsonError('This account does not have access to FiMana Lending.', 403)
  }

  return NextResponse.json({ user })
}
