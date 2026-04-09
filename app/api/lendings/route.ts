import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { Loan } from '@/lib/types'

export async function GET() {
  try {
    const loans = await authorizedBackendRequest<Loan[]>('/lendings')
    return NextResponse.json(loans)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load loans', 401)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }

    const loan = await authorizedBackendRequest<Loan>('/lendings', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return NextResponse.json(loan, { status: 201 })
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to create loan', 400)
  }
}
