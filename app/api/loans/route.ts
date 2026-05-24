import { NextRequest, NextResponse } from 'next/server'
import { buildPathWithQuery } from '@/lib/request-query'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'

export async function GET(request: NextRequest) {
  try {
    const loans = await authorizedBackendRequest(
      buildPathWithQuery('/loans', request.nextUrl.searchParams.toString()),
    )

    return NextResponse.json(loans)
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : 'Unable to load loans'

    return jsonError(message, 400)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }

    const loan = await authorizedBackendRequest('/loans', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    return NextResponse.json(loan, { status: 201 })
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : 'Unable to create loan'

    return jsonError(message, 400)
  }
}
