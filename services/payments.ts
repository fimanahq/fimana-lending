import { apiRequest } from '@/lib/client-api'
import type {
  LoanAdjustmentDetail,
  LoanAdjustmentPostResponse,
  LoanPaymentDetail,
  LoanPaymentPostResponse,
  LoanPaymentQueueItem,
  PostLoanAdjustmentInput,
  PostLoanPaymentInput,
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
