import { apiRequest } from '@/lib/client-api'
import type {
  LoanAdjustmentDetail,
  LoanAdjustmentPostResponse,
  LoanPaymentDetail,
  LoanPaymentPostResponse,
  LoanPaymentQueueItem,
  PostLoanAdjustmentInput,
  PostLoanPaymentInput,
  UpdateLoanAdjustmentInput,
  UpdateLoanPaymentInput,
} from '@/lib/types'

export function listLoanPaymentQueue() {
  return apiRequest<LoanPaymentQueueItem[]>('/api/loan-payments')
}

export function getLoanPaymentDetail(loanId: string) {
  return apiRequest<LoanPaymentDetail>(`/api/loans/${loanId}/payments`)
}

export function getLoanAdjustmentDetail(loanId: string) {
  return apiRequest<LoanAdjustmentDetail>(`/api/loans/${loanId}/adjustments`)
}

export function postLoanPayment(loanId: string, input: PostLoanPaymentInput) {
  return apiRequest<LoanPaymentPostResponse>(`/api/loans/${loanId}/payments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function postLoanAdjustment(loanId: string, input: PostLoanAdjustmentInput) {
  return apiRequest<LoanAdjustmentPostResponse>(`/api/loans/${loanId}/adjustments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateLoanAdjustment(loanId: string, adjustmentId: string, input: UpdateLoanAdjustmentInput) {
  return apiRequest<LoanAdjustmentPostResponse>(`/api/loans/${loanId}/adjustments/${adjustmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteLoanAdjustment(loanId: string, adjustmentId: string) {
  return apiRequest<LoanAdjustmentPostResponse>(`/api/loans/${loanId}/adjustments/${adjustmentId}`, {
    method: 'DELETE',
  })
}

export function updateLoanPayment(loanId: string, paymentId: string, input: UpdateLoanPaymentInput) {
  return apiRequest<LoanPaymentPostResponse>(`/api/loans/${loanId}/payments/${paymentId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteLoanPayment(loanId: string, paymentId: string) {
  return apiRequest<LoanPaymentPostResponse>(`/api/loans/${loanId}/payments/${paymentId}`, {
    method: 'DELETE',
  })
}
