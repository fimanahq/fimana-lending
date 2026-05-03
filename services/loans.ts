import { apiRequest } from '@/lib/client-api'
import type { LoanRecord, Loan } from '@/lib/types'
import { API_BASE_URL } from '@/lib/constants'

export function listLoans() {
  return apiRequest<Loan[]>('/api/lendings')
}

export function listLoanRecords() {
  return apiRequest<LoanRecord[]>('/api/loans')
}

export function getLoan(loanId: string) {
  return apiRequest<LoanRecord>(`/api/loans/${loanId}`)
}

export function listLoansByBorrowerId(borrowerId: string) {
  return apiRequest<LoanRecord[]>(`/api/borrowers/${borrowerId}/loans`)
}
