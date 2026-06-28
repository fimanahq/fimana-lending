import { NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import type { DashboardMonthlyProfitResponse } from '@/lib/types/lending'

export async function GET(request: Request) {
  const year = new URL(request.url).searchParams.get('year') ?? ''

  try {
    const result = await authorizedBackendRequest<DashboardMonthlyProfitResponse>(
      `/loans/dashboard/profit-by-month?year=${encodeURIComponent(year)}`,
    )
    return NextResponse.json(result)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load monthly profit', 400)
  }
}
