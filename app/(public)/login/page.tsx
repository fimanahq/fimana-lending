import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { PublicSiteFooter } from '@/components/public-site-footer'
import { PublicSiteHeader } from '@/components/public-site-header'
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/constants'

const editorialImageUrl =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDHeYrglbki121-NaocI6nGIPChuYrk9xr8DfcJEtb17hOwdNGfeuu5U2Usr6Ks0O_TwbyusZi9PUzgVItDA9Q3vzlblkjzLD6nWsOMgA9CIWBONnaDEX12cyih1-HPmPpk-p95O-mxVoFRH6sJCD5sw5rh4T3qCbTM1wz6DsVjJ3JZ1qRuRZWdbfVfw1i9_VDOZ12nwh7QvhxmsnkWjAVhg5_cZdldNoymcT9PWzHyfDSswQOXCM-nxRDtyGhdz3k3tgL8_TTP5t0'

interface LoginPageProps {
  searchParams?: Promise<{
    next?: string | string[]
  }>
}

function getSafeDestination(nextPath: string | string[] | undefined) {
  const path = Array.isArray(nextPath) ? nextPath[0] : nextPath
  return path && path.startsWith('/') && !path.startsWith('//') ? path : '/dashboard'
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies()
  const params = await searchParams
  const destination = getSafeDestination(params?.next)
  const hasSession =
    Boolean(cookieStore.get(ACCESS_COOKIE_NAME)?.value)
    || Boolean(cookieStore.get(REFRESH_COOKIE_NAME)?.value)

  if (hasSession) {
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
          <img
            src={editorialImageUrl}
            alt="Modern home office with lending dashboards open on devices."
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
