import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, backendErrorResponse } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { LoanApplication } from '@/lib/types/lending'

export async function GET() {
  try {
    const applications = await authorizedBackendRequest<LoanApplication[]>('/borrower-portal/applications')
    return NextResponse.json(applications)
  } catch (error) {
    return backendErrorResponse(error, 'Unable to load borrower applications', 500)
  }
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody<Record<string, unknown>>(request)
  if (!body) {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
  }

  try {
    const application = await authorizedBackendRequest<LoanApplication>('/borrower-portal/applications', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    return backendErrorResponse(error, 'Unable to submit borrower application', 400)
  }
}
