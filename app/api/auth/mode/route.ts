import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, backendErrorResponse, createSession, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { User } from '@/lib/types/shared'

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody<{ accountType?: unknown }>(request)
  if (!body || (body.accountType !== 'lender' && body.accountType !== 'borrower')) {
    return jsonError('Select a valid account mode', 400)
  }

  try {
    const authPayload = await authorizedBackendRequest<AuthPayload>('/auth/mode', {
      method: 'POST',
      body: JSON.stringify({ accountType: body.accountType }),
    })
    const user = await createSession(authPayload)
    return NextResponse.json({ user })
  } catch (error) {
    return backendErrorResponse(error, 'Unable to switch account mode', 400)
  }
}
