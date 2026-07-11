import { redirect } from 'next/navigation'
import { EmailVerificationPanel } from '@/components/auth/email-verification-panel'
import { PublicSiteFooter } from '@/components/public-site-footer'
import { PublicSiteHeader } from '@/components/public-site-header'
import { hasBorrowerPortalAccess, hasLoanAppAccess } from '@/lib/access'
import { getSessionUser } from '@/lib/server/backend'
import shellStyles from '@/components/auth/onboarding-shell.module.css'

export const dynamic = 'force-dynamic'

interface VerifyEmailPageProps {
  searchParams?: Promise<{
    token?: string | string[]
    delivery?: string | string[]
  }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token
  const delivery = Array.isArray(params?.delivery) ? params.delivery[0] : params?.delivery
  const user = await getSessionUser()

  if (!token && user?.emailVerified && hasBorrowerPortalAccess(user)) {
    redirect('/portal')
  }

  if (!token && user?.emailVerified && user.accountTypeSelectionRequired) {
    redirect('/select-account-type')
  }

  if (!token && user && hasLoanAppAccess(user)) {
    redirect('/dashboard')
  }

  return (
    <div className={shellStyles.page}>
      <PublicSiteHeader
        headerClassName={shellStyles.header}
      />

      <main className={shellStyles.main}>
        <EmailVerificationPanel
          token={token}
          email={user?.email}
          deliveryFailed={delivery === 'failed'}
        />
      </main>

      <PublicSiteFooter footerClassName={shellStyles.footer} />
    </div>
  )
}
