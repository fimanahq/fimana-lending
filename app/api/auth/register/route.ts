import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'
import { createSession, jsonError } from '@/lib/server/backend'
import type { User } from '@/lib/types'

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      ...body,
      appCode: body.appCode || 'fimana-loan',
    }),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return jsonError(payload?.message || 'Unable to register', response.status)
  }

  const user = await createSession(payload.data as AuthPayload)
  return NextResponse.json({ user })
}
