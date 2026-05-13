import Link from 'next/link'
import { PublicSiteFooter } from '@/components/public-site-footer'
import { PublicSiteHeader } from '@/components/public-site-header'

export default function RequestLoanPage() {
  return (
    <div className="request-homepage">
      <PublicSiteHeader
        headerClassName="request-homepage__topbar"
        innerClassName="request-homepage__topbarInner"
        brandClassName="request-homepage__brand"
      />

      <main className="request-homepage__main">
        <div className="request-homepage__layout">
          <section className="request-homepage__editorial">
            <div className="request-homepage__eyebrow">Loan application</div>

            <h1 className="request-homepage__title">
              Use Your Lender's <span>Request Link.</span>
            </h1>

            <p className="request-homepage__lede">
              Public applications now use lender-specific links so your submission reaches the right lending workspace.
            </p>
          </section>

          <section className="request-homepage__formColumn">
            <div className="request-homepage__formCard">
              <div className="stack">
                <div className="notice">
                  Ask your lender for their public request link.
                </div>
                <Link href="/" className="button-secondary">
                  Back to home
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicSiteFooter footerClassName="request-homepage__footer" />
    </div>
  )
}
