import type { User } from '@/lib/types'

export function hasLendingAccess(user: Pick<User, 'enabledApps'> | null | undefined) {
  return Boolean(user?.enabledApps.includes('fimana-lending'))
}
