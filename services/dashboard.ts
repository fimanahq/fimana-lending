import { apiRequest } from '@/lib/client-api'
import type { DashboardMonthlyProfitDetailResponse, DashboardMonthlyProfitResponse } from '@/lib/types/lending'

export function getDashboardMonthlyProfit(year: number) {
  return apiRequest<DashboardMonthlyProfitResponse>(`/api/dashboard/profit-by-month?year=${encodeURIComponent(year)}`)
}

export function getDashboardMonthlyProfitDetails(year: number, month: number) {
  const query = new URLSearchParams({
    year: String(year),
    month: String(month),
  })
  return apiRequest<DashboardMonthlyProfitDetailResponse>(`/api/dashboard/profit-by-month/details?${query.toString()}`)
}
