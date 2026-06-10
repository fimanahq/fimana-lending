import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { LoginForm } from '@/components/auth/login-form'
import { PublicSiteFooter } from '@/components/public-site-footer'
import { PublicSiteHeader } from '@/components/public-site-header'
import { hasLoanAppAccess } from '@/lib/access'
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/constants'
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
  const user = await getSessionUser()

  if (user && hasLoanAppAccess(user)) {
    redirect(destination)
  }

  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value

  if (!hasTransientRefreshError && !user && !accessToken && refreshToken) {
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
              <span>Admin workspace</span>
            </div>

            <h1 className="signin-page__title">
              FiMana Lending <span>admin access.</span>
            </h1>

            <p className="signin-page__lede">
              Review applications, payment activity, borrower profiles, and portfolio analytics from one secured lending workspace.
            </p>
          </div>
        </section>

        <section className="signin-page__panelColumn">
          <div className="signin-page__panelIntro">
            <h2>Sign in to continue</h2>
            <p>Use your admin email or username. Successful sign-in returns you to the page you requested.</p>
          </div>

          <div className="signin-page__panelCard">
            <LoginForm />
          </div>

          <div className="signin-page__trustGrid" aria-label="Security details">
            <div className="signin-page__trustItem">
              <span className="signin-page__trustIcon signin-page__trustIcon--shield" aria-hidden="true">
                <span />
              </span>
              <span>Protected operations routes</span>
            </div>
            <div className="signin-page__trustItem">
              <span className="signin-page__trustIcon signin-page__trustIcon--check" aria-hidden="true">
                <span />
              </span>
              <span>Session-based access</span>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter footerClassName="signin-page__footer" />
    </div>
  )
}
