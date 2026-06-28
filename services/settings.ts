import { apiRequest } from '@/lib/client-api'
import type { Settings, SettingsCurrency } from '@/lib/types/shared'

export interface UpdateSettingsInput {
  defaultCurrency?: SettingsCurrency
  startingCapital?: number
  defaultPenaltyRateBps?: number
  publicLoanRequestSlug?: string | null
  ownerLoanMobileNumber?: string | null
  excludeOwnerLoanInterestFromProfit?: boolean
  includeLoanPaymentsInTreasuryByDefault?: boolean
}

export function getSettings() {
  return apiRequest<Settings>('/api/settings/me')
}

export function updateSettings(input: UpdateSettingsInput) {
  return apiRequest<Settings>('/api/settings/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
