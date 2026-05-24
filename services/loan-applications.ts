import { apiRequest } from '@/lib/client-api'
import type { ValidatedLoanApplicationInput } from '@/lib/loan-application-validation'
import { getOrCreateCachedRequest } from '@/lib/request-cache'
import { buildPathWithQuery, buildQueryString } from '@/lib/request-query'
import type {
  LoanApplication,
  LoanApplicationDraftInput,
  LoanApplicationStatus,
} from '@/lib/types/lending'
import { PaginatedResponse } from '@/types'

export type CreateLoanApplicationInput = LoanApplicationDraftInput
export type UpdateLoanApplicationDraftInput = Partial<LoanApplicationDraftInput>
export type UpdateLoanApplicationInput = Partial<LoanApplicationDraftInput>

// export function listLoanApplications() {
//   return apiRequest<LoanApplication[]>('/api/loan-applications')
// }

type LoanApplicationFilters = {
  status?: string
  search?: string
  page?: number
  itemsPerPage?: number,
}

const loanApplicationListRequests = new Map<string, Promise<PaginatedResponse<LoanApplication>>>()

export function listLoanApplications(filters: LoanApplicationFilters = {}) {
  const requestPath = buildPathWithQuery('/api/loan-applications', buildQueryString(filters))
  return getOrCreateCachedRequest(
    loanApplicationListRequests,
    requestPath,
    () => apiRequest<PaginatedResponse<LoanApplication>>(requestPath),
  )
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

export function createPublicLoanApplication(slug: string, input: ValidatedLoanApplicationInput) {
  return apiRequest<LoanApplication>(`/api/request-loan/${encodeURIComponent(slug)}`, {
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

export function updateLoanApplication(applicationId: string, input: UpdateLoanApplicationInput) {
  return apiRequest<LoanApplication>(`/api/loan-applications/${applicationId}`, {
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

export function undoLoanApplicationApproval(applicationId: string) {
  return apiRequest<LoanApplication>(`/api/loan-applications/${applicationId}/undo-approval`, {
    method: 'PATCH',
  })
}
