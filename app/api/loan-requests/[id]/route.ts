import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, getSessionUser, jsonError } from '@/lib/server/backend'
import { getLoanRequest, updateLoanRequest } from '@/lib/server/loan-requests'
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

  const body = (await request.json().catch(() => null)) as { action?: string } | null
  const { id } = await context.params
  const currentRequest = await getLoanRequest(id)

  if (!currentRequest) {
    return jsonError('Loan request not found', 404)
  }

  if (currentRequest.status !== 'pending') {
    return jsonError('Only pending requests can be reviewed', 409)
  }

  const reviewedBy = `${user.firstName} ${user.lastName}`.trim()
  const reviewedAt = new Date().toISOString()

  if (body?.action === 'reject') {
    const rejected = await updateLoanRequest(id, (current) => ({
      ...current,
      status: 'rejected',
      reviewedAt,
      reviewedBy,
    }))

    return NextResponse.json(rejected)
  }

  if (body?.action !== 'approve') {
    return jsonError('Unsupported review action', 400)
  }

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
    await updateLoanRequest(id, (current) => ({ ...current, contactId }))
  }

  const loan = await authorizedBackendRequest<Loan>('/loans', {
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

  const approved = await updateLoanRequest(id, (current) => ({
    ...current,
    status: 'approved',
    reviewedAt,
    reviewedBy,
    contactId,
    loanId: loan._id,
  }))

  return NextResponse.json(approved)
}
