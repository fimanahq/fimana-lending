import type { User } from '@/lib/types/shared'

export function hasLoanAppAccess(user: Pick<User, 'accountType' | 'enabledApps'> | null | undefined) {
  return Boolean(user && user.accountType === 'lender' && user.enabledApps.includes('fimana-lending'))
}

export function hasBorrowerPortalAccess(user: Pick<User, 'accountType'> | null | undefined) {
  return user?.accountType === 'borrower'
}

export function requiresAccountTypeSelection(
  user: Pick<User, 'accountType' | 'accountTypeSelectionRequired'> | null | undefined,
) {
  return Boolean(user?.accountTypeSelectionRequired && user.accountType === null)
}

export function hasFiManaSessionAccess(
  user: Pick<User, 'accountType' | 'accountTypeSelectionRequired' | 'enabledApps'> | null | undefined,
) {
  return hasLoanAppAccess(user) || hasBorrowerPortalAccess(user) || requiresAccountTypeSelection(user)
}
