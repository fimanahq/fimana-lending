import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const detail = await authorizedBackendRequest(`/loans/${id}/adjustments`)
    return NextResponse.json(detail)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to load loan adjustments'
    return jsonError(message, message === 'Loan not found' ? 404 : 400)
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }

    const adjustment = await authorizedBackendRequest(`/loans/${id}/adjustments`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return NextResponse.json(adjustment, { status: 201 })
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to post adjustment'
    return jsonError(message, message === 'Loan not found' ? 404 : 400)
  }
}
