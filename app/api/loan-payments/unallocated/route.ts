import { NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'

export async function GET(request: Request) {
  try {
    const { search } = new URL(request.url)
    return NextResponse.json(await authorizedBackendRequest(`/loan-payments/unallocated${search}`))
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load unallocated payments', 400)
  }
}
