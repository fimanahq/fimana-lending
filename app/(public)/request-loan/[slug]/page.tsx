import { LoanApplicationIntakeForm } from '@/components/loan-application-intake-form'
import { PublicSiteFooter } from '@/components/public-site-footer'
import { PublicSiteHeader } from '@/components/public-site-header'

const editorialImageUrl = '/images/request-loan-minimal-office.png'

interface RequestLoanPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function RequestLoanPage({ params }: RequestLoanPageProps) {
  const { slug } = await params

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
              Complete Your <span>Loan Application.</span>
            </h1>

            <p className="request-homepage__lede">
              Apply online and complete your loan application in a few simple steps.
            </p>

            <div className="request-homepage__imageCard">
              <img
                src={editorialImageUrl}
                alt="Luxury minimalist office interior with warm wooden accents and soft sunlight."
                className="request-homepage__image"
              />

              <div className="request-homepage__statusCard">
                <div className="request-homepage__statusIcon" aria-hidden="true">
                  <span />
                  <span />
                </div>
                <div>
                  <strong>Secure Loan Application</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="request-homepage__formColumn">
            <div className="request-homepage__formCard">
              <LoanApplicationIntakeForm publicLoanRequestSlug={slug} />
            </div>
          </section>
        </div>
      </main>

      <PublicSiteFooter footerClassName="request-homepage__footer" />
    </div>
  )
}
