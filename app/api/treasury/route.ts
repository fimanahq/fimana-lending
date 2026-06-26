import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { Treasury } from '@/lib/types/shared'

export async function GET() {
  try {
    const treasury = await authorizedBackendRequest<Treasury>('/treasury')
    return NextResponse.json(treasury)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load Treasury', 400)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }

    const treasury = await authorizedBackendRequest<Treasury>('/treasury', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })

    return NextResponse.json(treasury)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to update Treasury', 400)
  }
}
