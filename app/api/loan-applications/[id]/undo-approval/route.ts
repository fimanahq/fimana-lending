import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import type { LoanApplication } from '@/lib/types/lending'

export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const updated = await authorizedBackendRequest<LoanApplication>(`/loan-applications/${id}/undo-approval`, {
      method: 'PATCH',
    })
    return NextResponse.json(updated)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to undo approval'
    return jsonError(message, message === 'Loan application not found' ? 404 : 400)
  }
}
