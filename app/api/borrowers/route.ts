import { NextRequest, NextResponse } from 'next/server'
import { buildPathWithQuery, buildQueryString } from '@/lib/request-query'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { Borrower } from '@/lib/types/lending'
import { PaginatedResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const page = searchParams.get('page')
    const itemsPerPage = searchParams.get('itemsPerPage')
    const search = searchParams.get('search')?.trim()
    const hasDefaultedLoan = searchParams.get('hasDefaultedLoan')

    const isPaginatedRequest = Boolean(page || itemsPerPage || search || hasDefaultedLoan)

    if (!isPaginatedRequest) {
      const borrowers = await authorizedBackendRequest<Borrower[]>('/borrowers')
      return NextResponse.json(borrowers)
    }

    const borrowers = await authorizedBackendRequest<PaginatedResponse<Borrower>>(
      buildPathWithQuery('/borrowers/paginated', buildQueryString({
        page: page ?? '1',
        itemsPerPage: itemsPerPage ?? '10',
        search,
        hasDefaultedLoan,
      })),
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
