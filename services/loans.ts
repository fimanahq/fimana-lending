import { apiRequest } from '@/lib/client-api'
import type { LoanRecord } from '@/lib/types'
import { PaginatedResponse } from '@/types'

export function getLoan(loanId: string) {
  return apiRequest<LoanRecord>(`/api/loans/${loanId}`)
}

type LoanRecordFilters = {
  status?: string
  borrowerId?: string
  page?: number
  itemsPerPage?: number
}

function buildQueryParams(filters: LoanRecordFilters) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })

  return params.toString()
}

export function listLoanRecords(filters: LoanRecordFilters = {}) {
  const query = buildQueryParams(filters)

  return apiRequest<PaginatedResponse<LoanRecord>>(
    `/api/loans${query ? `?${query}` : ''}`,
  )
}

export function listLoansByBorrowerId(borrowerId: string) {
  return apiRequest<LoanRecord[]>(`/api/borrowers/${borrowerId}/loans`)
}

export function postLoan(input: Record<string, unknown>) {
  return apiRequest<LoanRecord>('/api/loans', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function deleteLoan(loanId: string) {
  return apiRequest<void>(`/api/loans/${loanId}`, {
    method: 'DELETE',
  })
}
