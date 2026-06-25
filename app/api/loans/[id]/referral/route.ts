import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const body = await request.json()
    const loan = await authorizedBackendRequest(`/loans/${id}/referral`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return NextResponse.json(loan)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to apply referral reward'
    return jsonError(message, message === 'Loan not found' ? 404 : 400)
  }
}
