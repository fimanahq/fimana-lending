import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { Borrower } from '@/lib/types'
import { PaginatedResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const page = searchParams.get('page')
    const itemsPerPage = searchParams.get('itemsPerPage')
    const search = searchParams.get('search')?.trim()

    const isPaginatedRequest = Boolean(page || itemsPerPage || search)

    if (!isPaginatedRequest) {
      const borrowers = await authorizedBackendRequest<Borrower[]>('/borrowers')
      return NextResponse.json(borrowers)
    }

    const backendSearchParams = new URLSearchParams()

    backendSearchParams.set('page', page ?? '1')
    backendSearchParams.set('itemsPerPage', itemsPerPage ?? '10')

    if (search) {
      backendSearchParams.set('search', search)
    }

    const borrowers = await authorizedBackendRequest<PaginatedResponse<Borrower>>(
      `/borrowers/paginated?${backendSearchParams.toString()}`,
    )

    return NextResponse.json(borrowers)
  } catch (caughtError) {
    return jsonError(
      caughtError instanceof Error ? caughtError.message : 'Unable to load borrowers',
      401,
    )
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
    return jsonError(
      caughtError instanceof Error ? caughtError.message : 'Unable to create borrower',
      400,
    )
  }
}