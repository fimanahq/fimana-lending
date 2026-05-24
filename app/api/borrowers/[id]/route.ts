import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { Borrower } from '@/lib/types/lending'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const borrower = await authorizedBackendRequest<Borrower>(`/borrowers/${id}`)
    return NextResponse.json(borrower)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to load borrower'
    return jsonError(message, message === 'Borrower not found' ? 404 : 400)
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

    const borrower = await authorizedBackendRequest<Borrower>(`/borrowers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    return NextResponse.json(borrower)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to update borrower', 400)
  }
}
