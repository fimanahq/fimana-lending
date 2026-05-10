import { NextResponse } from 'next/server'
import { hasLoanAppAccess } from '@/lib/access'
import { clearSessionCookies, getSessionUserWithRefresh, jsonError } from '@/lib/server/backend'

export async function GET() {
  const user = await getSessionUserWithRefresh()
  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  if (!hasLoanAppAccess(user)) {
    await clearSessionCookies()
    return jsonError('This account does not have access to FiMana Lending.', 403)
  }

  return NextResponse.json({ user })
}
