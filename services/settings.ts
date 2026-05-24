import { apiRequest } from '@/lib/client-api'
import type { Settings, SettingsCurrency } from '@/lib/types/shared'

export interface UpdateSettingsInput {
  defaultCurrency?: SettingsCurrency
  startingCapital?: number
  publicLoanRequestSlug?: string | null
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
