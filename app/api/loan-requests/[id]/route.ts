import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { LoanRequest } from '@/lib/types'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const body = await readJsonBody<{ action?: string }>(request)
  const { id } = await context.params

  if (body?.action !== 'approve' && body?.action !== 'reject') {
    return jsonError('Unsupported review action', 400)
  }

  try {
    const updated = await authorizedBackendRequest<LoanRequest>(`/loan-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: body.action,
      }),
    })

    return NextResponse.json(updated)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to review request'
    const status = message === 'Loan request not found' ? 404 : message === 'Only pending requests can be reviewed' ? 409 : 400
    return jsonError(message, status)
  }
}
