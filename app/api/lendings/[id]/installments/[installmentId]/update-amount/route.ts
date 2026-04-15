import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { Loan } from '@/lib/types'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; installmentId: string }> },
) {
  try {
    const { id, installmentId } = await context.params
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }
    const loan = await authorizedBackendRequest<Loan>(`/lendings/${id}/installments/${installmentId}/update-amount`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    return NextResponse.json(loan)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to update payment', 400)
  }
}
