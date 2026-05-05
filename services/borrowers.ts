import { apiRequest } from '@/lib/client-api'
import type { Borrower } from '@/lib/types'

export interface CreateBorrowerInput {
  fullName: string
  email?: string
  contactNumber?: string
  notes?: string
}

export type UpdateBorrowerInput = CreateBorrowerInput

export function listBorrowers() {
  return apiRequest<Borrower[]>('/api/borrowers')
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
