export type UserAppCode = 'fimana-lending' | 'fimana-web'
export const settingsCurrencyValues = ['PHP', 'USD', 'EUR'] as const
export type SettingsCurrency = (typeof settingsCurrencyValues)[number]
export type PaymentFrequency = 'monthly' | 'semi_monthly'

export interface ApiErrorPayload {
  message: string
  errorCode?: string
  availableAmountMinor?: number
  requiredAmountMinor?: number
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
  ownerLoanMobileNumber?: string | null
  excludeOwnerLoanInterestFromProfit?: boolean
  includeLoanPaymentsInTreasuryByDefault: boolean
  treasuryAccountId: string | null
  createdAt: string | Date
  updatedAt?: string | Date
}

export interface TreasuryAccount {
  id: string
  name: string
  type: string
  currency: SettingsCurrency
  balance: number
  balanceMinor: number
  createdAt: string | Date
  updatedAt?: string | Date
}

export interface Treasury {
  isConfigured: boolean
  account: TreasuryAccount | null
}

export type TreasuryMovementDirection = 'in' | 'out'

export type TreasuryMovementType = 'lending_disbursement' | 'lending_payment' | 'treasury_interest_earned'

export interface TreasuryMovement {
  id: string
  accountId: string
  type: TreasuryMovementType
  direction: TreasuryMovementDirection
  amount: number
  amountMinor: number
  signedAmount: number
  signedAmountMinor: number
  description: string
  occurredAt: string | Date
  reversalOfTransactionId?: string
  reversedByTransactionId?: string
  createdAt: string | Date
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
