import { NextResponse } from 'next/server'
import { authorizedBackendRequest, backendErrorResponse } from '@/lib/server/backend'
import type { BorrowerPortalSummary } from '@/lib/types/borrower-portal'

export async function GET() {
  try {
    const summary = await authorizedBackendRequest<BorrowerPortalSummary>('/borrower-portal/summary')
    return NextResponse.json(summary)
  } catch (error) {
    return backendErrorResponse(error, 'Unable to load borrower portal summary', 500)
  }
}
