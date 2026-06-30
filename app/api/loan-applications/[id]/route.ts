import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, backendErrorResponse, jsonError } from '@/lib/server/backend'
import type { LoanApplicationStatus, LoanApplication } from '@/lib/types/lending'

function getActionPath(status: LoanApplicationStatus) {
  return {
    approved: 'approve',
    cancelled: null,
    draft: null,
    expired: null,
    rejected: 'reject',
    submitted: 'submit',
    under_review: null,
    withdrawn: null,
  }[status]
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const application = await authorizedBackendRequest<LoanApplication>(`/loan-applications/${id}`)
    return NextResponse.json(application)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to load application'
    return jsonError(message, message === 'Loan application not found' ? 404 : 400)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const body = (await request.json().catch(() => null)) as {
    reviewerRemarks?: string
    status?: LoanApplicationStatus
    [key: string]: unknown
  } | null

  if (!body) {
    return jsonError('Invalid request body', 400)
  }
  const status = body?.status

  if (!status) {
    try {
      const updated = await authorizedBackendRequest<LoanApplication>(`/loan-applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      return NextResponse.json(updated)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to update application'
      return jsonError(message, message === 'Loan application not found' ? 404 : 400)
    }
  }

  const actionPath = getActionPath(status)
  if (!actionPath) {
    return jsonError('Unsupported application status update', 400)
  }

  try {
    const init: RequestInit = { method: 'PATCH' }

    if (actionPath !== 'submit') {
      init.body = JSON.stringify({
        reviewerRemarks: body?.reviewerRemarks ?? '',
        referrerBorrowerId: body?.referrerBorrowerId ?? undefined,
        referralRewardAmountMinor: body?.referralRewardAmountMinor ?? undefined,
      })
    }

    const updated = await authorizedBackendRequest<LoanApplication>(`/loan-applications/${id}/${actionPath}`, init)
    return NextResponse.json(updated)
  } catch (caughtError) {
    return backendErrorResponse(caughtError, 'Unable to update application')
  }
}
