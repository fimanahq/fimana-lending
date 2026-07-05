import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, BackendRequestError, jsonError } from '@/lib/server/backend'

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const result = await authorizedBackendRequest<{ id: string }>(`/treasury/movements/${id}`, {
      method: 'DELETE',
    })
    return NextResponse.json(result)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to delete Treasury movement'
    const status = caughtError instanceof BackendRequestError ? caughtError.status : 400
    return jsonError(message, status)
  }
}
