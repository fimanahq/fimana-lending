import { apiRequest } from '@/lib/client-api'
import type {
  LoanPaymentDetail,
  LoanPaymentPostResponse,
  LoanPaymentQueueItem,
  PostLoanPaymentInput,
} from '@/lib/types'

export function listLoanPaymentQueue() {
  return apiRequest<LoanPaymentQueueItem[]>('/api/loan-payments')
}

export function getLoanPaymentDetail(loanId: string) {
  return apiRequest<LoanPaymentDetail>(`/api/loans/${loanId}/payments`)
}

export function postLoanPayment(loanId: string, input: PostLoanPaymentInput) {
  return apiRequest<LoanPaymentPostResponse>(`/api/loans/${loanId}/payments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
