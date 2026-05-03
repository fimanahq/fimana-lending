import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const loans = await authorizedBackendRequest(`/borrowers/${id}/loans`)
    return NextResponse.json(loans)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unable to load borrower loans'
    return jsonError(message, 400)
  }
}
