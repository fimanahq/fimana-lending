import Image from 'next/image'
import Link from 'next/link'
import { InstallAppButton } from '@/components/install-app-button'
import { PublicSiteFooter } from '@/components/public-site-footer'
import { PublicSiteHeader } from '@/components/public-site-header'

const HERO_IMAGE_URL = '/images/lending-home-office.png'

export default function LandingPage() {
  return (
    <div className="landing-homepage">
      <PublicSiteHeader
        headerClassName="landing-homepage__header"
        brandClassName="landing-homepage__brand"
        actions={
          <>
            <div className="landing-homepage__headerActions" data-node-id="2003:56">
              <Link href="/login" className="landing-homepage__signIn">
                Sign in
              </Link>
            </div>

            <details className="landing-homepage__mobileMenu">
              <summary className="landing-homepage__mobileMenuSummary" aria-label="Open account actions">
                <span className="landing-homepage__mobileMenuDots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </summary>

              <div className="landing-homepage__mobileMenuPanel">
                <Link href="/login" className="landing-homepage__mobileMenuLink">
                  Sign in
                </Link>
              </div>
            </details>
          </>
        }
      />

      <main className="landing-homepage__main">
        <div className="page-wrap landing-homepage__container">
          <section className="landing-homepage__hero" id="vision" data-node-id="2003:4">
            <div className="landing-homepage__copy" data-node-id="2003:17">
              <h1 className="landing-homepage__title" data-node-id="2003:20">
                <span>Start a loan application</span>
                <span>online with</span>
                <span>
                  <em>FiMana</em> <span className="landing-homepage__titleAccent">Lending.</span>
                </span>
              </h1>

              <p className="landing-homepage__body" data-node-id="2003:22">
                Complete your loan application online with a simple, guided process.
              </p>

              <div className="landing-homepage__actions" data-node-id="2003:24">
                <Link
                  href="/request-loan"
                  className="landing-homepage__button landing-homepage__button--primary"
                  data-node-id="2003:25"
                >
                  Loan application
                </Link>
                <InstallAppButton />
              </div>
            </div>

            <div className="landing-homepage__visual" id="lending-solutions" data-node-id="2003:5">
              <div className="landing-homepage__visualPlate" aria-hidden="true" data-node-id="2003:6" />
              <div className="landing-homepage__imageFrame" data-node-id="2003:7">
                <Image
                  src={HERO_IMAGE_URL}
                  alt="A sophisticated home office desk with a laptop, lamp, and wooden cabinetry."
                  className="landing-homepage__image"
                  width={552}
                  height={552}
                  priority
                  sizes="(max-width: 720px) calc(100vw - 40px), (max-width: 1120px) 552px, 552px"
                />
              </div>
            </div>
          </section>

          <div className="landing-homepage__separator" aria-hidden="true" data-node-id="2003:30" />

        </div>
      </main>

      <PublicSiteFooter footerClassName="landing-homepage__footer" />
    </div>
  )
}
