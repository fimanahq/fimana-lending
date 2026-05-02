import { NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'

export async function GET() {
  try {
    const loans = await authorizedBackendRequest('/loans')
    return NextResponse.json(loans)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load loans', 401)
  }
}
