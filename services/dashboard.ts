import { apiRequest } from '@/lib/client-api'
import type { DashboardMonthlyProfitResponse } from '@/lib/types/lending'

export function getDashboardMonthlyProfit(year: number) {
  return apiRequest<DashboardMonthlyProfitResponse>(`/api/dashboard/profit-by-month?year=${encodeURIComponent(year)}`)
}
