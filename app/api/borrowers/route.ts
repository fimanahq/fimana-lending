import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { Borrower } from '@/lib/types'

export async function GET() {
  try {
    const borrowers = await authorizedBackendRequest<Borrower[]>('/borrowers')
    return NextResponse.json(borrowers)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load borrowers', 401)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }

    const borrower = await authorizedBackendRequest<Borrower>('/borrowers', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    return NextResponse.json(borrower, { status: 201 })
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to create borrower', 400)
  }
}
