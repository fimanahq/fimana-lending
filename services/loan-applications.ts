import { apiRequest } from '@/lib/client-api'
import type { LoanApplicationValidationInput } from '@/lib/loan-application-validation'
import type { LoanApplicationDraftInput, LoanApplicationStatus, LoanApplication } from '@/lib/types'

export type CreateLoanApplicationInput = LoanApplicationDraftInput
export type UpdateLoanApplicationDraftInput = Partial<LoanApplicationDraftInput>
export type LoanApplicationReviewAction = 'approve' | 'reject'

export function listLoanApplications() {
  return apiRequest<LoanApplication[]>('/api/loan-applications')
}

export function getLoanApplication(applicationId: string) {
  return apiRequest<LoanApplication>(`/api/loan-applications/${applicationId}`)
}

export function createLoanApplication(input: CreateLoanApplicationInput) {
  return apiRequest<LoanApplication>('/api/loan-applications', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function createPublicLoanApplication(input: LoanApplicationValidationInput) {
  return apiRequest<LoanApplication>('/api/loan-applications', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateLoanApplicationDraft(applicationId: string, input: UpdateLoanApplicationDraftInput) {
  return apiRequest<LoanApplication>(`/api/loan-applications/${applicationId}/draft`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function updateLoanApplicationStatus(
  applicationId: string,
  status: LoanApplicationStatus,
  reviewerRemarks?: string,
) {
  return apiRequest<LoanApplication>(`/api/loan-applications/${applicationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reviewerRemarks }),
  })
}

export function reviewLoanApplication(applicationId: string, action: LoanApplicationReviewAction) {
  return updateLoanApplicationStatus(applicationId, action === 'approve' ? 'approved' : 'rejected')
}
