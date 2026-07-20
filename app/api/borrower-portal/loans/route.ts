import { NextResponse } from 'next/server'
import { authorizedBackendRequest, backendErrorResponse } from '@/lib/server/backend'
import type { LoanRecord } from '@/lib/types/lending'

export async function GET() {
  try {
    const loans = await authorizedBackendRequest<LoanRecord[]>('/borrower-portal/loans')
    return NextResponse.json(loans)
  } catch (error) {
    return backendErrorResponse(error, 'Unable to load borrower loans', 500)
  }
}
