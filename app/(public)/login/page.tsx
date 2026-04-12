import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { PublicSiteFooter } from '@/components/public-site-footer'
import { PublicSiteHeader } from '@/components/public-site-header'
import { REFRESH_COOKIE_NAME } from '@/lib/constants'

const editorialImageUrl =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDHeYrglbki121-NaocI6nGIPChuYrk9xr8DfcJEtb17hOwdNGfeuu5U2Usr6Ks0O_TwbyusZi9PUzgVItDA9Q3vzlblkjzLD6nWsOMgA9CIWBONnaDEX12cyih1-HPmPpk-p95O-mxVoFRH6sJCD5sw5rh4T3qCbTM1wz6DsVjJ3JZ1qRuRZWdbfVfw1i9_VDOZ12nwh7QvhxmsnkWjAVhg5_cZdldNoymcT9PWzHyfDSswQOXCM-nxRDtyGhdz3k3tgL8_TTP5t0'

export default async function LoginPage() {
  const cookieStore = await cookies()
  if (cookieStore.get(REFRESH_COOKIE_NAME)?.value) {
    redirect('/dashboard')
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
              <span>Secure financial portal</span>
            </div>

            <h1 className="signin-page__title">
              Sign in and work the <span>next cutoff</span> with precision.
            </h1>

            <p className="signin-page__lede">
              Access your curated ledger and streamline your lending workflow with editorial-grade tools.
            </p>
          </div>
        </section>

        <section className="signin-page__panelColumn">
          <div className="signin-page__panelIntro">
            <h2>Welcome Back</h2>
            <p>Manage your assets with FiMana&apos;s refined intelligence.</p>
          </div>

          <div className="signin-page__panelCard">
            <LoginForm />
          </div>
        </section>
      </main>

      <PublicSiteFooter footerClassName="signin-page__footer" />
    </div>
  )
}
