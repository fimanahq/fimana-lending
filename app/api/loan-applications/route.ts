import { NextRequest, NextResponse } from 'next/server'
import {
  getDraftLoanApplicationPayload,
  isDraftLoanApplicationPayload,
} from '@/lib/loan-application-draft'
import { buildPathWithQuery } from '@/lib/request-query'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { LoanApplication } from '@/lib/types'

// export async function GET() {
//   try {
//     const applications = await authorizedBackendRequest<LoanApplication[]>('/loan-applications')
//     return NextResponse.json(applications)
//   } catch (caughtError) {
//     return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan applications', 401)
//   }
// }
export async function GET(request: NextRequest) {
  try {
    const applications = await authorizedBackendRequest(
      buildPathWithQuery('/loan-applications', request.nextUrl.searchParams.toString()),
    )

    return NextResponse.json(applications)
  } catch (caughtError) {
    return jsonError(
      caughtError instanceof Error ? caughtError.message : 'Unable to load loan applications',
      401,
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody<Record<string, unknown>>(request)
  if (!body) {
    return jsonError('Invalid request body', 400)
  }

  if (isDraftLoanApplicationPayload(body)) {
    try {
      const application = await authorizedBackendRequest<LoanApplication>('/loan-applications/submitted', {
        method: 'POST',
        body: JSON.stringify(getDraftLoanApplicationPayload(body)),
      })

      return NextResponse.json(application, { status: 201 })
    } catch (caughtError) {
      return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to create loan application', 400)
    }
  }

  return jsonError('Use a lender-specific request link to submit a public loan application', 400)
}
