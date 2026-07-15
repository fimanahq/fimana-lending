import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, backendErrorResponse } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { LenderInvitation } from '@/lib/types/borrower-portal'

export async function POST(request: NextRequest) {
  const body = await readJsonBody<{ lenderSlug?: unknown }>(request)
  const lenderSlug = typeof body?.lenderSlug === 'string' ? body.lenderSlug.trim().toLowerCase() : ''
  if (!lenderSlug) {
    return NextResponse.json({ message: 'Lender invitation is required' }, { status: 400 })
  }

  try {
    const invitation = await authorizedBackendRequest<LenderInvitation>('/borrower-portal/lender', {
      method: 'POST',
      body: JSON.stringify({ lenderSlug }),
    })
    return NextResponse.json(invitation)
  } catch (error) {
    return backendErrorResponse(error, 'Unable to assign lender', 400)
  }
}
