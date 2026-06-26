import { NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import type { TreasuryMovement } from '@/lib/types/shared'

export async function GET() {
  try {
    const movements = await authorizedBackendRequest<TreasuryMovement[]>('/treasury/movements')
    return NextResponse.json(movements)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load Treasury movements', 400)
  }
}
