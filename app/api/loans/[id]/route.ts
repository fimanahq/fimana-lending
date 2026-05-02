import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const loan = await authorizedBackendRequest(`/loans/${id}`)
    return NextResponse.json(loan)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to load loan'
    return jsonError(message, message === 'Loan not found' ? 404 : 400)
  }
}
