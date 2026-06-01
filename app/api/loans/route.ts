import { NextRequest, NextResponse } from 'next/server'
import { buildPathWithQuery } from '@/lib/request-query'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'

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
