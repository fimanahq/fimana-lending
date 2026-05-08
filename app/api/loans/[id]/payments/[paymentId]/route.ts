import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await context.params

  try {
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }

    const response = await authorizedBackendRequest(`/loans/${id}/payments/${paymentId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    return NextResponse.json(response)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to update payment'
    return jsonError(message, message === 'Loan not found' || message === 'Payment not found' ? 404 : 400)
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await context.params

  try {
    const response = await authorizedBackendRequest(`/loans/${id}/payments/${paymentId}`, {
      method: 'DELETE',
    })
    return NextResponse.json(response)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to delete payment'
    return jsonError(message, message === 'Loan not found' || message === 'Payment not found' ? 404 : 400)
  }
}
