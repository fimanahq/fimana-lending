import { redirect } from 'next/navigation'
import { hasBorrowerPortalAccess, hasLoanAppAccess } from '@/lib/access'
import { getSessionUser } from '@/lib/server/backend'

export const dynamic = 'force-dynamic'

export default async function SelectAccountTypePage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.emailVerified) {
    redirect('/verify-email')
  }

  if (hasBorrowerPortalAccess(user)) {
    redirect('/portal')
  }

  if (hasLoanAppAccess(user)) {
    redirect('/dashboard')
  }

  redirect('/login')
}
