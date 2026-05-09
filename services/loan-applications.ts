import { apiRequest } from '@/lib/client-api'
import type { ValidatedLoanApplicationInput } from '@/lib/loan-application-validation'
import type { LoanApplicationDraftInput, LoanApplicationStatus, LoanApplication } from '@/lib/types'
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

function buildQueryParams(filters: LoanApplicationFilters) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })

  return params.toString()
}

export function listLoanApplications(filters: LoanApplicationFilters = {}) {
  const query = buildQueryParams(filters)
  const requestPath = `/api/loan-applications${query ? `?${query}` : ''}`
  const inflightRequest = loanApplicationListRequests.get(requestPath)

  if (inflightRequest) {
    return inflightRequest
  }

  const request = apiRequest<PaginatedResponse<LoanApplication>>(requestPath)
    .finally(() => {
      loanApplicationListRequests.delete(requestPath)
    })

  loanApplicationListRequests.set(requestPath, request)

  return request
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

export function createPublicLoanApplication(input: ValidatedLoanApplicationInput) {
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
