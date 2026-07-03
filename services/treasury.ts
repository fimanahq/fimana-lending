import { apiRequest } from '@/lib/client-api'
import type { LoanPaymentHistory } from '@/lib/types/lending'
import type { Treasury, TreasuryMovement, TreasuryMovementsPage } from '@/lib/types/shared'

export interface UpdateTreasuryInput {
  name?: string
  openingBalance?: number
}

export interface CreateTreasuryPostingInput {
  kind: 'interest_earned'
  amount: number
  occurredAt: string
  description?: string
}

export interface CreateTreasuryAdjustmentInput {
  direction: 'credit' | 'debit'
  amount: number
  occurredAt: string
  reason: string
}

export interface UnallocatedPaymentReview extends LoanPaymentHistory {
  loanNumber: string
}

export interface UnallocatedPaymentReviewPage {
  items: UnallocatedPaymentReview[]
  total: number
  page: number
  itemsPerPage: number
  totalPages: number
}

export function getTreasury() {
  return apiRequest<Treasury>('/api/treasury')
}

export function updateTreasury(input: UpdateTreasuryInput) {
  return apiRequest<Treasury>('/api/treasury', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function getTreasuryMovements(page = 1, itemsPerPage = 25) {
  return apiRequest<TreasuryMovementsPage>(`/api/treasury/movements?page=${page}&itemsPerPage=${itemsPerPage}`)
}

export function createTreasuryPosting(input: CreateTreasuryPostingInput) {
  return apiRequest<TreasuryMovement>('/api/treasury/postings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function reverseTreasuryInterest(transactionId: string, reason: string) {
  return apiRequest<TreasuryMovement>(`/api/treasury/postings/${transactionId}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function createTreasuryAdjustment(input: CreateTreasuryAdjustmentInput) {
  return apiRequest<TreasuryMovement>('/api/treasury/adjustments', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getUnallocatedPaymentReviews(page = 1, itemsPerPage = 20) {
  return apiRequest<UnallocatedPaymentReviewPage>(`/api/loan-payments/unallocated?page=${page}&itemsPerPage=${itemsPerPage}`)
}

export function classifyHistoricalExcessAsProfit(loanId: string, paymentId: string, creditTreasury: boolean) {
  return apiRequest<LoanPaymentHistory>(`/api/loans/${loanId}/payments/${paymentId}/excess-profit`, {
    method: 'POST',
    body: JSON.stringify({ creditTreasury }),
  })
}
