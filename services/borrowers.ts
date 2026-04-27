import { apiRequest } from '@/lib/client-api'
import type { Borrower, Contact } from '@/lib/types'

export interface CreateBorrowerInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes?: string
}

export type UpdateBorrowerInput = CreateBorrowerInput

export function listBorrowers() {
  return apiRequest<Contact[]>('/api/contacts')
}

export function listLendingBorrowers() {
  return apiRequest<Borrower[]>('/api/borrowers')
}

export function getBorrower(borrowerId: string) {
  return apiRequest<Contact>(`/api/contacts/${borrowerId}`)
}

export function createBorrower(input: CreateBorrowerInput) {
  return apiRequest<Contact>('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateBorrower(borrowerId: string, input: UpdateBorrowerInput) {
  return apiRequest<Contact>(`/api/contacts/${borrowerId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
