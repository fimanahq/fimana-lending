import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; adjustmentId: string }> },
) {
  const { id, adjustmentId } = await context.params

  try {
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }

    const response = await authorizedBackendRequest(`/loans/${id}/adjustments/${adjustmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    return NextResponse.json(response)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to update adjustment'
    return jsonError(message, message === 'Loan not found' || message === 'Adjustment not found' ? 404 : 400)
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; adjustmentId: string }> },
) {
  const { id, adjustmentId } = await context.params

  try {
    const response = await authorizedBackendRequest(`/loans/${id}/adjustments/${adjustmentId}`, {
      method: 'DELETE',
    })
    return NextResponse.json(response)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to delete adjustment'
    return jsonError(message, message === 'Loan not found' || message === 'Adjustment not found' ? 404 : 400)
  }
}
