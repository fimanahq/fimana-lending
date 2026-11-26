import { apiRequest } from '@/lib/client-api'
import type { DashboardMonthlyProfitDetailResponse, DashboardMonthlyProfitResponse } from '@/lib/types/lending'

const monthlyProfitRequests = new Map<number, Promise<DashboardMonthlyProfitResponse>>()

export function getDashboardMonthlyProfit(year: number) {
  const inFlight = monthlyProfitRequests.get(year)
  if (inFlight) {
    return inFlight
  }

  const request = apiRequest<DashboardMonthlyProfitResponse>(`/api/dashboard/profit-by-month?year=${encodeURIComponent(year)}`)
  monthlyProfitRequests.set(year, request)
  const clearRequest = () => {
    if (monthlyProfitRequests.get(year) === request) {
      monthlyProfitRequests.delete(year)
    }
  }
  void request.then(clearRequest, clearRequest)
  return request
}

export function getDashboardMonthlyProfitDetails(year: number, month: number) {
  const query = new URLSearchParams({
    year: String(year),
    month: String(month),
  })
  return apiRequest<DashboardMonthlyProfitDetailResponse>(`/api/dashboard/profit-by-month/details?${query.toString()}`)
}
