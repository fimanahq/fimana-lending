import { apiRequest } from '@/lib/client-api'
import type { Treasury, TreasuryMovement } from '@/lib/types/shared'

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

export function getTreasury() {
  return apiRequest<Treasury>('/api/treasury')
}

export function updateTreasury(input: UpdateTreasuryInput) {
  return apiRequest<Treasury>('/api/treasury', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function getTreasuryMovements() {
  return apiRequest<TreasuryMovement[]>('/api/treasury/movements')
}

export function createTreasuryPosting(input: CreateTreasuryPostingInput) {
  return apiRequest<TreasuryMovement>('/api/treasury/postings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
