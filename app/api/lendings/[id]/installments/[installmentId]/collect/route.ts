import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import type { Loan } from '@/lib/types'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; installmentId: string }> },
) {
  try {
    const { id, installmentId } = await context.params
    const body = await request.json()
    const loan = await authorizedBackendRequest<Loan>(`/lendings/${id}/installments/${installmentId}/collect`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    return NextResponse.json(loan)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to collect installment', 400)
  }
}
