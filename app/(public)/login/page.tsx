import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { LoginForm } from '@/components/auth/login-form'
import { PublicSiteFooter } from '@/components/public-site-footer'
import { PublicSiteHeader } from '@/components/public-site-header'
import { hasBorrowerPortalAccess, hasLoanAppAccess } from '@/lib/access'
import { REFRESH_COOKIE_NAME } from '@/lib/constants'
import { isProtectedPath } from '@/lib/protected-routes'
import { getSessionUser } from '@/lib/server/backend'
import Image from 'next/image'

const editorialImageUrl = '/images/login-lending-dashboard-office.png'

interface LoginPageProps {
  searchParams?: Promise<{
    next?: string | string[]
    authError?: string | string[]
  }>
}

function getSafeDestination(nextPath: string | string[] | undefined) {
  const path = Array.isArray(nextPath) ? nextPath[0] : nextPath
  return path && path.startsWith('/') && !path.startsWith('//') && isProtectedPath(path) ? path : '/dashboard'
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies()
  const params = await searchParams
  const destination = getSafeDestination(params?.next)
  const authError = Array.isArray(params?.authError) ? params.authError[0] : params?.authError
  const hasTransientRefreshError = authError === 'refresh_unavailable'
  const user = hasTransientRefreshError ? null : await getSessionUser()

  if (user && hasLoanAppAccess(user)) {
    redirect(destination)
  }

  if (user && hasBorrowerPortalAccess(user)) {
    redirect(user.emailVerified ? '/portal' : '/verify-email')
  }

  if (user?.accountTypeSelectionRequired) {
    redirect(user.emailVerified ? '/select-account-type' : '/verify-email')
  }

  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value

  if (!hasTransientRefreshError && !user && refreshToken) {
    redirect(destination)
  }

  return (
    <div className="signin-page">
      <PublicSiteHeader
        headerClassName="signin-page__topbar"
        innerClassName="signin-page__topbarInner"
        brandClassName="signin-page__brand"
      />

      <main className="signin-page__main">
        <section className="signin-page__editorial">
          <div className="signin-page__editorialShade" />
          <Image
            src={editorialImageUrl}
            alt="Modern home office with lending dashboards open on devices."
            width={1536}
            height={1024}
            className="signin-page__editorialImage"
          />

          <div className="signin-page__editorialContent">
            <div className="signin-page__portalBadge">
              <span className="signin-page__portalBadgeIcon" aria-hidden="true" />
              <span>One secure account</span>
            </div>

            <h1 className="signin-page__title">
              Borrow. Lend. <span>Stay in control.</span>
            </h1>

            <p className="signin-page__lede">
              Choose the FiMana experience that matches your role after verifying your email.
            </p>
          </div>
        </section>

        <section className="signin-page__panelColumn">
          <div className="signin-page__panelIntro">
            <h2>Sign in to continue</h2>
            <p>Sign in to your FiMana account or create one, then choose the workspace that fits your role.</p>
          </div>

          <div className="signin-page__panelCard">
            <LoginForm />
          </div>

          <div className="signin-page__trustGrid" aria-label="Security details">
            <div className="signin-page__trustItem">
              <span className="signin-page__trustIcon signin-page__trustIcon--shield" aria-hidden="true">
                <span />
              </span>
              <span>Verified email identity</span>
            </div>
            <div className="signin-page__trustItem">
              <span className="signin-page__trustIcon signin-page__trustIcon--check" aria-hidden="true">
                <span />
              </span>
              <span>Role-based workspace access</span>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter footerClassName="signin-page__footer" />
    </div>
  )
}
