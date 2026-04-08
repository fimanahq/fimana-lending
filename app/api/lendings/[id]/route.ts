import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import type { Loan } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const loan = await authorizedBackendRequest<Loan>(`/lendings/${id}`)
    return NextResponse.json(loan)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan', 404)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const loan = await authorizedBackendRequest<Loan>(`/lendings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    return NextResponse.json(loan)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to update loan', 400)
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const result = await authorizedBackendRequest<{ _id: string }>(`/lendings/${id}`, {
      method: 'DELETE',
    })
    return NextResponse.json(result)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to delete loan', 400)
  }
}
