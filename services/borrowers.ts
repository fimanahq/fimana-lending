import { apiRequest } from '@/lib/client-api'
import { getOrCreateCachedRequest } from '@/lib/request-cache'
import { buildPathWithQuery, buildQueryString } from '@/lib/request-query'
import type { Borrower } from '@/lib/types/lending'
import { PaginatedResponse } from '@/types'
import { CreateBorrowerInput, ListBorrowersParams, UpdateBorrowerInput } from '@/types'

const borrowerListRequests = new Map<string, Promise<PaginatedResponse<Borrower> | Borrower[]>>()

export function listBorrowersPaginated(params: ListBorrowersParams = {}) {
  const requestPath = buildPathWithQuery('/api/borrowers', buildQueryString({
    page: params.page ?? 1,
    itemsPerPage: params.itemsPerPage ?? 10,
    search: params.search?.trim(),
  }))
  return getOrCreateCachedRequest(
    borrowerListRequests,
    requestPath,
    () => apiRequest<PaginatedResponse<Borrower>>(requestPath),
  ) as Promise<PaginatedResponse<Borrower>>
}

export function listLoanBorrowers() {
  const requestPath = '/api/borrowers'
  return getOrCreateCachedRequest(
    borrowerListRequests,
    requestPath,
    () => apiRequest<Borrower[]>(requestPath),
  ) as Promise<Borrower[]>
}

export function getBorrower(borrowerId: string) {
  return apiRequest<Borrower>(`/api/borrowers/${borrowerId}`)
}

export function createBorrower(input: CreateBorrowerInput) {
  return apiRequest<Borrower>('/api/borrowers', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateBorrower(borrowerId: string, input: UpdateBorrowerInput) {
  return apiRequest<Borrower>(`/api/borrowers/${borrowerId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
