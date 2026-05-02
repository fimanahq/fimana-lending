import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { Settings } from '@/lib/types'

export async function GET() {
  try {
    const settings = await authorizedBackendRequest<Settings>('/settings/me')
    return NextResponse.json(settings)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load settings', 401)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }

    const settings = await authorizedBackendRequest<Settings>('/settings/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })

    return NextResponse.json(settings)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to update settings', 400)
  }
}
