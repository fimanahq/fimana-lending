import { apiRequest } from '@/lib/client-api'
import type { LoanRecord } from '@/lib/types'
import { PaginatedResponse } from '@/types'

const loanListRequests = new Map<string, Promise<PaginatedResponse<LoanRecord> | LoanRecord[]>>()

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
  const requestPath = `/api/loans${query ? `?${query}` : ''}`
  const inflightRequest = loanListRequests.get(requestPath)

  if (inflightRequest) {
    return inflightRequest as Promise<PaginatedResponse<LoanRecord>>
  }

  const request = apiRequest<PaginatedResponse<LoanRecord>>(requestPath)
    .finally(() => {
      loanListRequests.delete(requestPath)
    })

  loanListRequests.set(requestPath, request)

  return request
}

export function listLoansByBorrowerId(borrowerId: string) {
  const requestPath = `/api/borrowers/${borrowerId}/loans`
  const inflightRequest = loanListRequests.get(requestPath)

  if (inflightRequest) {
    return inflightRequest as Promise<LoanRecord[]>
  }

  const request = apiRequest<LoanRecord[]>(requestPath)
    .finally(() => {
      loanListRequests.delete(requestPath)
    })

  loanListRequests.set(requestPath, request)

  return request
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
