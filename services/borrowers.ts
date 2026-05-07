import { apiRequest } from '@/lib/client-api'
import type { Borrower } from '@/lib/types'
import { PaginatedResponse } from '@/types'
import { CreateBorrowerInput, ListBorrowersParams, UpdateBorrowerInput } from '@/types'

const borrowerListRequests = new Map<string, Promise<PaginatedResponse<Borrower> | Borrower[]>>()

export function listBorrowersPaginated(params: ListBorrowersParams = {}) {
  const searchParams = new URLSearchParams()

  searchParams.set('page', String(params.page ?? 1))
  searchParams.set('itemsPerPage', String(params.itemsPerPage ?? 10))

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim())
  }

  const requestPath = `/api/borrowers?${searchParams.toString()}`
  const inflightRequest = borrowerListRequests.get(requestPath)

  if (inflightRequest) {
    return inflightRequest as Promise<PaginatedResponse<Borrower>>
  }

  const request = apiRequest<PaginatedResponse<Borrower>>(requestPath)
    .finally(() => {
      borrowerListRequests.delete(requestPath)
    })

  borrowerListRequests.set(requestPath, request)

  return request
}

export function listLoanBorrowers() {
  const requestPath = '/api/borrowers'
  const inflightRequest = borrowerListRequests.get(requestPath)

  if (inflightRequest) {
    return inflightRequest as Promise<Borrower[]>
  }

  const request = apiRequest<Borrower[]>(requestPath)
    .finally(() => {
      borrowerListRequests.delete(requestPath)
    })

  borrowerListRequests.set(requestPath, request)

  return request
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
