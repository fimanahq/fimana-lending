import { LoanRequestForm } from '@/components/loan-request-form'
import { PublicSiteFooter } from '@/components/public-site-footer'
import { PublicSiteHeader } from '@/components/public-site-header'

const editorialImageUrl =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAk2wKt3CmqISCd14AYUzSwmx7gj6IjhhLeqzWmaEHi5JlehlPgnwt4wbPpEV0pZN1V2xejPqTiGCKm8XLU44sjKeow1tuB4wNWYaVoOFO4SwVpC2R5Qg8Lr09YS0ux9ZjDl1L9M66OeoEKMuHUl8XRIDNOi5tIpqzM54YWFdgCjklspZMst5skXFyWoQ75-IS3H81oJsX-p5LD8UfXphRtM8SSSvptP3HDeoy3EJMOvXZOabRAcXxVS6HiCtnQ47ZrRzOVbhFknGc'

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
            <div className="request-homepage__eyebrow">Lending journey</div>

            <h1 className="request-homepage__title">
              Crafting Your <span>Financial Future.</span>
            </h1>

            <p className="request-homepage__lede">
              Complete your loan request below. Our curated approach ensures a bespoke lending experience tailored to
              your unique portfolio.
            </p>

            <div className="request-homepage__imageCard">
              <img
                src={editorialImageUrl}
                alt="Luxury minimalist office interior with warm wooden accents and soft sunlight."
                className="request-homepage__image"
              />
              <div className="request-homepage__imageOverlay" />

              <div className="request-homepage__statusCard">
                <div className="request-homepage__statusIcon" aria-hidden="true">
                  <span />
                  <span />
                </div>
                <div>
                  <strong>Secure Request</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="request-homepage__formColumn">
            <div className="request-homepage__formCard">
              <LoanRequestForm />
            </div>
          </section>
        </div>
      </main>

      <PublicSiteFooter footerClassName="request-homepage__footer" />
    </div>
  )
}
