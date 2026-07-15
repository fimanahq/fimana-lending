import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { PublicSiteFooter } from '@/components/public-site-footer'
import { PublicSiteHeader } from '@/components/public-site-header'
import { API_BASE_URL } from '@/lib/constants'
import { authorizedBackendRequest, getSessionUser } from '@/lib/server/backend'
import type { LenderInvitation } from '@/lib/types/borrower-portal'

const editorialImageUrl = '/images/login-lending-dashboard-office.png'

interface JoinLenderPageProps {
  params: Promise<{
    slug: string
  }>
}

interface BackendEnvelope<T> {
  data: T
}

async function getInvitation(slug: string): Promise<LenderInvitation> {
  const response = await fetch(`${API_BASE_URL}/lender-invitations/${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    notFound()
  }

  const payload = await response.json() as BackendEnvelope<LenderInvitation>
  return payload.data
}

export default async function JoinLenderPage({ params }: JoinLenderPageProps) {
  const { slug } = await params
  const invitation = await getInvitation(slug)
  const user = await getSessionUser()

  if (user?.accountType === 'borrower') {
    await authorizedBackendRequest<LenderInvitation>('/borrower-portal/lender', {
      method: 'POST',
      body: JSON.stringify({ lenderSlug: invitation.slug }),
    })
    redirect(user.emailVerified ? '/portal' : '/verify-email')
  }

  if (user?.accountType === 'lender') {
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
          <Image
            src={editorialImageUrl}
            alt="Modern home office with lending dashboards open on devices."
            width={1536}
            height={1024}
            className="signin-page__editorialImage"
            priority
          />

          <div className="signin-page__editorialContent">
            <div className="signin-page__portalBadge">
              <span className="signin-page__portalBadgeIcon" aria-hidden="true" />
              <span>Lender invitation</span>
            </div>

            <h1 className="signin-page__title">
              Apply with <span>{invitation.displayName}.</span>
            </h1>

            <p className="signin-page__lede">
              Sign in or create your verified borrower account. This invitation automatically connects your application to the lender.
            </p>
          </div>
        </section>

        <section className="signin-page__panelColumn">
          <div className="signin-page__panelIntro">
            <h2>Continue to your invitation</h2>
          </div>

          <div className="signin-page__panelCard">
            <LoginForm lenderSlug={invitation.slug} lenderName={invitation.displayName} />
          </div>
        </section>
      </main>

      <PublicSiteFooter footerClassName="signin-page__footer" />
    </div>
  )
}
