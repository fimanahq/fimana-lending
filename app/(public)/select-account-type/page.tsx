import { redirect } from 'next/navigation'
import { AccountTypeSelection } from '@/components/auth/account-type-selection'
import { PublicSiteFooter } from '@/components/public-site-footer'
import { PublicSiteHeader } from '@/components/public-site-header'
import { hasBorrowerPortalAccess, hasLoanAppAccess } from '@/lib/access'
import { getSessionUser } from '@/lib/server/backend'
import shellStyles from '@/components/auth/onboarding-shell.module.css'

export const dynamic = 'force-dynamic'

export default async function SelectAccountTypePage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.emailVerified) {
    redirect('/verify-email')
  }

  if (!user.accountTypeSelectionRequired) {
    if (hasBorrowerPortalAccess(user)) {
      redirect('/portal')
    }

    if (hasLoanAppAccess(user)) {
      redirect('/dashboard')
    }

    redirect('/login')
  }

  return (
    <div className={shellStyles.page}>
      <PublicSiteHeader
        headerClassName={shellStyles.header}
      />
      <main className={shellStyles.main}>
        <AccountTypeSelection email={user.email} />
      </main>
      <PublicSiteFooter footerClassName={shellStyles.footer} />
    </div>
  )
}
