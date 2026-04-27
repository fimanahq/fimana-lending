import { apiRequest } from '@/lib/client-api'
import type { Loan, PaymentFrequency } from '@/lib/types'

export interface CreateLoanInput {
  contactId: string
  principal: number
  gives: number
  paymentFrequency: PaymentFrequency
  paymentDays: string[]
  firstPaymentDate: string
  notes?: string
}

export interface CollectInstallmentInput {
  paidAmount: number
  paidAt?: string
}

export interface UpdateInstallmentPaymentInput {
  totalPayment: number
  paidAt?: string
}

export function listLoans() {
  return apiRequest<Loan[]>('/api/lendings')
}

export function getLoan(loanId: string) {
  return apiRequest<Loan>(`/api/lendings/${loanId}`)
}

export function createLoan(input: CreateLoanInput) {
  return apiRequest<Loan>('/api/lendings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function deleteLoan(loanId: string) {
  return apiRequest<{ _id: string }>(`/api/lendings/${loanId}`, {
    method: 'DELETE',
  })
}

export function collectLoanInstallment(
  loanId: string,
  installmentId: string,
  input: CollectInstallmentInput,
) {
  return apiRequest<Loan>(`/api/lendings/${loanId}/installments/${installmentId}/collect`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function updateLoanInstallmentPayment(
  loanId: string,
  installmentId: string,
  input: UpdateInstallmentPaymentInput,
) {
  return apiRequest<Loan>(`/api/lendings/${loanId}/installments/${installmentId}/update-amount`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
