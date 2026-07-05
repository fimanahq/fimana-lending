import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { TreasuryMovement } from '@/lib/types/shared'

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) return jsonError('Invalid request body', 400)
    const movement = await authorizedBackendRequest<TreasuryMovement>('/treasury/capital-movements', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return NextResponse.json(movement)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to post Treasury capital movement', 400)
  }
}
