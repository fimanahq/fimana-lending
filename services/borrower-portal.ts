import { apiRequest } from '@/lib/client-api'
import { REQUEST_LOAN_FETCH_TIMEOUT_MS } from '@/lib/fetch-timeout'
import type { ValidatedLoanApplicationInput } from '@/lib/loan-application-validation'
import type { BorrowerPortalSummary } from '@/lib/types/borrower-portal'
import type { LoanApplication, LoanRecord } from '@/lib/types/lending'

export type BorrowerPortalApplicationInput = ValidatedLoanApplicationInput & {
  publicLoanRequestSlug: string
}

export function getBorrowerPortalSummary() {
  return apiRequest<BorrowerPortalSummary>('/api/borrower-portal/summary')
}

export function listBorrowerPortalLoans() {
  return apiRequest<LoanRecord[]>('/api/borrower-portal/loans')
}

export function listBorrowerPortalApplications() {
  return apiRequest<LoanApplication[]>('/api/borrower-portal/applications')
}

export function createBorrowerPortalApplication(input: BorrowerPortalApplicationInput) {
  return apiRequest<LoanApplication>('/api/borrower-portal/applications', {
    method: 'POST',
    body: JSON.stringify(input),
    timeoutMs: REQUEST_LOAN_FETCH_TIMEOUT_MS,
  })
}
