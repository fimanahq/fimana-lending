import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { REFRESH_COOKIE_NAME } from '@/lib/constants'

export default async function LoginPage() {
  const cookieStore = await cookies()
  if (cookieStore.get(REFRESH_COOKIE_NAME)?.value) {
    redirect('/dashboard')
  }

  return (
    <div className="landing-homepage login-homepage">
      <header className="landing-homepage__header">
        <div className="page-wrap landing-homepage__container landing-homepage__headerContainer">
          <Link href="/" className="landing-homepage__brand" aria-label="FiMana Lending home">
            FiMana Lending
          </Link>

          <nav className="landing-homepage__nav" aria-label="Primary">
            <Link href="/" className="landing-homepage__navLink">Home</Link>
            <Link href="/request-loan" className="landing-homepage__navLink">Request Loan</Link>
            <Link href="/register" className="landing-homepage__navLink">Register</Link>
          </nav>

          <div className="landing-homepage__headerActions">
            <span className="landing-homepage__signIn">Secure access</span>
            <Link href="/register" className="landing-homepage__createAccount">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-homepage__main">
        <div className="page-wrap landing-homepage__container">
          <section className="landing-homepage__hero login-homepage__hero">
            <div className="landing-homepage__copy login-homepage__copy">
              <div className="landing-homepage__eyebrow">Protected workspace</div>

              <h1 className="landing-homepage__title login-homepage__title">
                <span>Sign in to</span>
                <span>review due</span>
                <span>
                  dates, borrowers, and <em>collections</em>
                </span>
              </h1>

              <p className="landing-homepage__body login-homepage__body">
                Use your FiMana workspace account to continue approving requests, monitoring issued loans, and preparing the next cutoff with a single protected view.
              </p>

              <div className="landing-homepage__actions">
                <Link
                  href="/register"
                  className="landing-homepage__button landing-homepage__button--primary"
                >
                  Create account
                </Link>
                <Link
                  href="/request-loan"
                  className="landing-homepage__button landing-homepage__button--secondary"
                >
                  Public request form
                </Link>
              </div>

              <div className="login-homepage__stats">
                <article className="login-homepage__statCard">
                  <span className="login-homepage__statLabel">Workflow</span>
                  <strong className="login-homepage__statValue">Approval to collection</strong>
                  <p>Move from intake to active loan tracking without leaving the workspace.</p>
                </article>

                <article className="login-homepage__statCard login-homepage__statCard--soft">
                  <span className="login-homepage__statLabel">Access</span>
                  <strong className="login-homepage__statValue">Session-backed routes</strong>
                  <p>Protected pages stay behind authenticated cookies and internal API routes.</p>
                </article>
              </div>
            </div>

            <div className="landing-homepage__visual login-homepage__visual">
              <div className="login-homepage__panel">
                <div className="login-homepage__panelTop">
                  <div className="landing-homepage__eyebrow login-homepage__panelEyebrow">Welcome back</div>
                  <h2 className="login-homepage__panelTitle">Access the lending workspace</h2>
                  <p className="login-homepage__panelBody">
                    Enter your credentials to continue managing approvals, schedules, and borrower collections.
                  </p>
                </div>

                <LoginForm />
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="landing-homepage__footer">
        <div className="page-wrap landing-homepage__container landing-homepage__footerContainer">
          <div className="landing-homepage__footerBrand">
            <strong>FiMana Lending</strong>
            <span>Secure sign-in for the internal lending workspace.</span>
          </div>

          <nav className="landing-homepage__footerNav" aria-label="Footer">
            <Link href="/" className="landing-homepage__footerLink landing-homepage__footerLink--emphasized">
              Back to landing
            </Link>
            <Link href="/register" className="landing-homepage__footerLink">
              Register
            </Link>
            <Link href="/request-loan" className="landing-homepage__footerLink">
              Request loan
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
