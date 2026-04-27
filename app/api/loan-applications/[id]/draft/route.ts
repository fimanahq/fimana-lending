import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { LoanApplication } from '@/lib/types'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const body = await readJsonBody<Record<string, unknown>>(request)

  if (!body) {
    return jsonError('Invalid request body', 400)
  }

  try {
    const updated = await authorizedBackendRequest<LoanApplication>(`/loan-applications/${id}/draft`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })

    return NextResponse.json(updated)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to update application draft'
    return jsonError(message, message === 'Loan application not found' ? 404 : 400)
  }
}
