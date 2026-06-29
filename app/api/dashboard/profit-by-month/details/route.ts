import { NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import type { DashboardMonthlyProfitDetailResponse } from '@/lib/types/lending'

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const query = new URLSearchParams({
    year: searchParams.get('year') ?? '',
    month: searchParams.get('month') ?? '',
  })

  try {
    const result = await authorizedBackendRequest<DashboardMonthlyProfitDetailResponse>(
      `/loans/dashboard/profit-by-month/details?${query.toString()}`,
    )
    return NextResponse.json(result)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load monthly profit details', 400)
  }
}
