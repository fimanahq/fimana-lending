import { apiRequest } from '@/lib/client-api'
import type { Borrower } from '@/lib/types'
import { PaginatedResponse } from '@/types'
import { CreateBorrowerInput, ListBorrowersParams, UpdateBorrowerInput } from '@/types'

export function listBorrowersPaginated(params: ListBorrowersParams = {}) {
  const searchParams = new URLSearchParams()

  searchParams.set('page', String(params.page ?? 1))
  searchParams.set('itemsPerPage', String(params.itemsPerPage ?? 10))

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim())
  }

  return apiRequest<PaginatedResponse<Borrower>>(
    `/api/borrowers?${searchParams.toString()}`,
  )
}

export function listLoanBorrowers() {
  return apiRequest<Borrower[]>('/api/borrowers')
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
