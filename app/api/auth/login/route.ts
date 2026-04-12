import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'
import { createSession, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import { hasLendingAccess } from '@/lib/access'
import type { User } from '@/lib/types'

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody<{ email?: unknown; password?: unknown }>(request)
  if (!body) {
    return jsonError('Invalid request body', 400)
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return jsonError('Email and password are required', 400)
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return jsonError(payload?.message || 'Unable to sign in', response.status)
  }

  const authPayload = payload.data as AuthPayload
  if (!hasLendingAccess(authPayload.user)) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authPayload.accessToken}`,
      },
      body: JSON.stringify({ refreshToken: authPayload.refreshToken }),
      cache: 'no-store',
    }).catch(() => null)

    return jsonError('This account does not have access to FiMana Lending.', 403)
  }

  const user = await createSession(authPayload)
  return NextResponse.json({ user })
}
