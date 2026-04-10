import Link from 'next/link'
import { LoanRequestForm } from '@/components/loan-request-form'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Sign in' },
  { href: '/register', label: 'Register' },
]

const infoCards = [
  {
    title: 'What to prepare',
    body: 'Bring the amount you need, your preferred cadence, and at least one reliable contact method before you submit.',
  },
  {
    title: 'Review window',
    body: 'Submitted requests land in the lender queue immediately so they can be reviewed and converted into an active loan.',
  },
  {
    title: 'Protected follow-up',
    body: 'Only the public intake is open. Approval and repayment tracking stay inside the secured FiMana workspace.',
  },
]

export default function RequestLoanPage() {
  return (
    <div className="landing-homepage request-homepage">
      <header className="landing-homepage__header">
        <div className="page-wrap landing-homepage__container landing-homepage__headerContainer">
          <Link href="/" className="landing-homepage__brand" aria-label="FiMana Lending home">
            FiMana Lending
          </Link>

          <nav className="landing-homepage__nav" aria-label="Primary">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="landing-homepage__navLink">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="landing-homepage__headerActions">
            <span className="landing-homepage__signIn">Public intake</span>
            <Link href="/register" className="landing-homepage__createAccount">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-homepage__main">
        <div className="page-wrap landing-homepage__container">
          <section className="landing-homepage__hero request-homepage__hero">
            <div className="landing-homepage__copy request-homepage__copy">
              <div className="landing-homepage__eyebrow">Loan request</div>

              <h1 className="landing-homepage__title request-homepage__title">
                <span>Start your</span>
                <span>application</span>
                <span>
                  with <em>FiMana</em>
                </span>
                <span className="landing-homepage__titleAccent">Lending.</span>
              </h1>

              <p className="landing-homepage__body request-homepage__body">
                Share the amount you need, the repayment rhythm you prefer, and how to reach you. Approved requests move
                directly into the lender workspace for review, scheduling, and follow-up.
              </p>

              <div className="landing-homepage__actions request-homepage__actions">
                <Link href="/login" className="landing-homepage__button landing-homepage__button--primary">
                  Lender sign in
                </Link>
                <Link href="/" className="landing-homepage__button landing-homepage__button--secondary">
                  Back to landing
                </Link>
              </div>

              <div className="request-homepage__highlights" aria-label="Request details">
                {infoCards.map((card) => (
                  <article key={card.title} className="request-homepage__highlightCard">
                    <span className="request-homepage__highlightTitle">{card.title}</span>
                    <p>{card.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="landing-homepage__visual request-homepage__visual">
              <section className="request-homepage__panel">
                <div className="request-homepage__panelTop">
                  <div className="landing-homepage__eyebrow request-homepage__panelEyebrow">Public intake</div>
                  <h2 className="request-homepage__panelTitle">Request a loan</h2>
                  <p className="request-homepage__panelBody">
                    Complete the form below and the lender can review your request inside the protected FiMana lending
                    workspace.
                  </p>
                </div>

                <LoanRequestForm />
              </section>
            </div>
          </section>
        </div>
      </main>

      <footer className="landing-homepage__footer">
        <div className="page-wrap landing-homepage__container landing-homepage__footerContainer">
          <div className="landing-homepage__footerBrand">
            <strong>FiMana Lending</strong>
            <span>Public requests feed directly into the lender&apos;s secured review queue.</span>
          </div>

          <nav className="landing-homepage__footerNav" aria-label="Footer">
            <Link href="/" className="landing-homepage__footerLink landing-homepage__footerLink--emphasized">
              Home
            </Link>
            <Link href="/login" className="landing-homepage__footerLink">
              Sign in
            </Link>
            <Link href="/register" className="landing-homepage__footerLink">
              Register
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
