import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString()

  try {
    const loans = await authorizedBackendRequest(
      `/loans${query ? `?${query}` : ''}`,
    )

    return NextResponse.json(loans)
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : 'Unable to load loans'

    return jsonError(message, 400)
  }
}
