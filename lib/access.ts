import type { User } from '@/lib/types/shared'

type AccessUser = Pick<User, 'accountType' | 'enabledApps' | 'role'>

export function hasLoanAppAccess(user: AccessUser | null | undefined) {
  return Boolean(user && user.accountType === 'lender' && user.enabledApps.includes('fimana-lending'))
}

export function hasBorrowerPortalAccess(user: AccessUser | null | undefined) {
  return user?.accountType === 'borrower'
}

export function shouldDefaultAdminToLender(user: AccessUser | null | undefined) {
  return Boolean(
    user
    && user.role === 'admin'
    && user.accountType === 'borrower'
    && user.enabledApps.includes('fimana-lending'),
  )
}

export function getPostAuthDestination(user: AccessUser, fallback = '/dashboard') {
  if (hasLoanAppAccess(user)) {
    return fallback
  }

  if (hasBorrowerPortalAccess(user)) {
    return '/portal'
  }

  return fallback
}

export function hasFiManaSessionAccess(
  user: AccessUser | null | undefined,
) {
  return hasLoanAppAccess(user) || hasBorrowerPortalAccess(user)
}
