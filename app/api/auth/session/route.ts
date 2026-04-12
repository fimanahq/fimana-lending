import { NextResponse } from 'next/server'
import { hasLendingAccess } from '@/lib/access'
import { clearSessionCookies, getSessionUser, jsonError } from '@/lib/server/backend'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  if (!hasLendingAccess(user)) {
    await clearSessionCookies()
    return jsonError('This account does not have access to FiMana Lending.', 403)
  }

  return NextResponse.json({ user })
}
