import { apiRequest } from '@/lib/client-api'
import { getOrCreateCachedRequest } from '@/lib/request-cache'
import { buildPathWithQuery, buildQueryString } from '@/lib/request-query'
import type { LoanRecord } from '@/lib/types/lending'
import { PaginatedResponse } from '@/types'

const loanListRequests = new Map<string, Promise<PaginatedResponse<LoanRecord> | LoanRecord[]>>()

export function getLoan(loanId: string) {
  return apiRequest<LoanRecord>(`/api/loans/${loanId}`)
}

type LoanRecordFilters = {
  status?: string
  borrowerId?: string
  search?: string
  page?: number
  itemsPerPage?: number
}

export function listLoanRecords(filters: LoanRecordFilters = {}) {
  const requestPath = buildPathWithQuery('/api/loans', buildQueryString(filters))
  return getOrCreateCachedRequest(
    loanListRequests,
    requestPath,
    () => apiRequest<PaginatedResponse<LoanRecord>>(requestPath),
  ) as Promise<PaginatedResponse<LoanRecord>>
}

export function listLoansByBorrowerId(borrowerId: string) {
  const requestPath = `/api/borrowers/${borrowerId}/loans`
  return getOrCreateCachedRequest(
    loanListRequests,
    requestPath,
    () => apiRequest<LoanRecord[]>(requestPath),
  ) as Promise<LoanRecord[]>
}

export function deleteLoan(loanId: string) {
  return apiRequest<void>(`/api/loans/${loanId}`, {
    method: 'DELETE',
  })
}
