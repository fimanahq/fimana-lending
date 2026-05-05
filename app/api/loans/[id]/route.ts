import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const loan = await authorizedBackendRequest(`/loans/${id}`)
    return NextResponse.json(loan)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to load loan'
    return jsonError(message, message === 'Loan not found' ? 404 : 400)
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    await authorizedBackendRequest(`/loans/${id}`, { method: 'DELETE' })
    return NextResponse.json({ success: true })
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to delete loan'
    return jsonError(message, message === 'Loan not found' ? 404 : 400)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }

    const loan = await authorizedBackendRequest(`/loans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })

    return NextResponse.json(loan)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to update loan'
    return jsonError(message, message === 'Loan not found' ? 404 : 400)
  }
}
