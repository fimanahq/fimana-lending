import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, getSessionUser, jsonError } from '@/lib/server/backend'
import {
  claimLoanRequestReview,
  completeLoanRequestReview,
  releaseLoanRequestReview,
  saveLoanRequestReviewProgress,
} from '@/lib/server/loan-requests'
import { readJsonBody } from '@/lib/server/request'
import type { Contact, Loan } from '@/lib/types'

function buildContactNotes(requestNotes: string | undefined, requestId: string, createdAt: string) {
  return [
    `Public loan request ${requestId}`,
    `Submitted: ${new Date(createdAt).toLocaleString()}`,
    requestNotes ? `Applicant note: ${requestNotes}` : null,
  ].filter(Boolean).join('\n\n')
}

function buildLoanNotes(requestNotes: string | undefined, requestId: string, createdAt: string) {
  return [
    `Approved from public loan request ${requestId}`,
    `Submitted: ${new Date(createdAt).toLocaleString()}`,
    requestNotes || null,
  ].filter(Boolean).join('\n\n')
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  const body = await readJsonBody<{ action?: string }>(request)
  const { id } = await context.params
  const reviewedBy = `${user.firstName} ${user.lastName}`.trim()
  const reviewedAt = new Date().toISOString()

  if (body?.action !== 'approve' && body?.action !== 'reject') {
    return jsonError('Unsupported review action', 400)
  }

  const claimed = await claimLoanRequestReview(id, reviewedBy)

  if (claimed.kind === 'not_found') {
    return jsonError('Loan request not found', 404)
  }

  if (claimed.kind === 'conflict') {
    return jsonError('Only pending requests can be reviewed', 409)
  }

  if (body?.action === 'reject') {
    const rejected = await completeLoanRequestReview(id, claimed.token, (current) => ({
      ...current,
      status: 'rejected',
      reviewedAt,
      reviewedBy,
    }))

    return NextResponse.json(rejected)
  }

  try {
    let currentRequest = claimed.request
    let contactId = currentRequest.contactId || null

    if (!contactId) {
      const contact = await authorizedBackendRequest<Contact>('/contacts', {
        method: 'POST',
        body: JSON.stringify({
          firstName: currentRequest.firstName,
          lastName: currentRequest.lastName,
          email: currentRequest.email,
          phone: currentRequest.phone,
          notes: buildContactNotes(currentRequest.notes, currentRequest.id, currentRequest.createdAt),
        }),
      })

      contactId = contact._id
      currentRequest = await saveLoanRequestReviewProgress(id, claimed.token, (current) => ({
        ...current,
        contactId,
      }))
    }

    const loan = await authorizedBackendRequest<Loan>('/lendings', {
      method: 'POST',
      body: JSON.stringify({
        contactId,
        principal: currentRequest.principal,
        gives: currentRequest.gives,
        paymentFrequency: currentRequest.paymentFrequency,
        paymentDays: currentRequest.paymentDays,
        firstPaymentDate: currentRequest.firstPaymentDate,
        notes: buildLoanNotes(currentRequest.notes, currentRequest.id, currentRequest.createdAt),
      }),
    })

    const approved = await completeLoanRequestReview(id, claimed.token, (current) => ({
      ...current,
      status: 'approved',
      reviewedAt,
      reviewedBy,
      contactId,
      loanId: loan._id,
    }))

    return NextResponse.json(approved)
  } catch (caughtError) {
    await releaseLoanRequestReview(id, claimed.token)
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to review request', 400)
  }
}
