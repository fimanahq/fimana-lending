import { NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'

export async function GET() {
  try {
    const queue = await authorizedBackendRequest('/loan-payments')
    return NextResponse.json(queue)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load payment queue', 401)
  }
}
