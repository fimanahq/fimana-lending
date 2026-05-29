export type UserAppCode = 'fimana-lending' | 'fimana-web'
export const settingsCurrencyValues = ['PHP', 'USD', 'EUR'] as const
export type SettingsCurrency = (typeof settingsCurrencyValues)[number]
export type PaymentFrequency = 'monthly' | 'semi_monthly'

export interface ApiErrorPayload {
  message: string
}

export interface Settings {
  _id: string
  userId: string
  defaultCurrency: SettingsCurrency
  startOfMonth: number
  accountsCellMode: boolean
  transactionsCellMode: boolean
  startingCapital: number
  defaultPenaltyRateBps: number
  publicLoanRequestSlug: string | null
  createdAt: string | Date
  updatedAt?: string | Date
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  signupSource?: UserAppCode | null
  enabledApps: UserAppCode[]
  createdAt: string
  updatedAt: string
}

export interface Contact {
  _id: string
  userId: string
  firstName: string
  lastName: string
  phone?: string
  email?: string
  notes?: string
  isArchived: boolean
}
