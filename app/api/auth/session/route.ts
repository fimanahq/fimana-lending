import { NextResponse } from 'next/server'
import { getSessionUser, jsonError } from '@/lib/server/backend'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  return NextResponse.json({ user })
}
