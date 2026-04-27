import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import type { LoanApplicationStatus, LoanApplication } from '@/lib/types'

function getActionPath(status: LoanApplicationStatus) {
  return {
    approved: 'approve',
    cancelled: 'cancel',
    draft: 'return-for-revision',
    expired: null,
    rejected: 'reject',
    submitted: 'submit',
    under_review: 'mark-under-review',
    withdrawn: 'cancel',
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
  } | null
  const status = body?.status

  if (!status) {
    return jsonError('Application status is required', 400)
  }

  const actionPath = getActionPath(status)
  if (!actionPath) {
    return jsonError('Unsupported application status update', 400)
  }

  try {
    const init: RequestInit = {
      method: actionPath === 'submit' || actionPath === 'cancel' ? 'PATCH' : 'PATCH',
    }

    if (actionPath !== 'submit' && actionPath !== 'cancel') {
      init.body = JSON.stringify({ reviewerRemarks: body?.reviewerRemarks ?? '' })
    }

    const updated = await authorizedBackendRequest<LoanApplication>(`/loan-applications/${id}/${actionPath}`, init)
    return NextResponse.json(updated)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to update application'
    return jsonError(message, message === 'Loan application not found' ? 404 : 400)
  }
}
