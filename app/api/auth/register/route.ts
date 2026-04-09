import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'
import { createSession, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { User } from '@/lib/types'

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody<{
    firstName?: unknown
    lastName?: unknown
    email?: unknown
    password?: unknown
    appCode?: unknown
  }>(request)
  if (!body) {
    return jsonError('Invalid request body', 400)
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const appCode = typeof body.appCode === 'string' && body.appCode.trim() ? body.appCode : 'fimana-lending'

  if (!firstName || !lastName || !email || !password) {
    return jsonError('First name, last name, email, and password are required', 400)
  }

  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      firstName,
      lastName,
      email,
      password,
      appCode,
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
