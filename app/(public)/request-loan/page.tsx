import Link from 'next/link'
import { LoanRequestForm } from '@/components/loan-request-form'

export default function RequestLoanPage() {
  return (
    <div className="auth-shell">
      <div className="card auth-card" style={{ alignItems: 'stretch' }}>
        <aside className="auth-hero">
          <div className="eyebrow" style={{ background: 'rgba(255,255,255,0.16)', color: 'white' }}>Loan request</div>
          <h1 className="display-title" style={{ marginTop: '1rem' }}>
            Tell FiMana what you need, and the lender can approve your request inside the workspace.
          </h1>
          <p style={{ maxWidth: 420, color: 'rgba(255,255,255,0.8)' }}>
            Share your requested amount, preferred payment cadence, and contact information. Approved requests move
            straight into the lender&apos;s internal loan system.
          </p>
          <div className="inline-actions" style={{ marginTop: '1rem' }}>
            <Link href="/" className="button-secondary">Back to landing</Link>
            <Link href="/login" className="button-secondary">Lender sign in</Link>
          </div>
        </aside>

        <section className="auth-body stack">
          <div>
            <div className="eyebrow">Public intake</div>
            <h2 className="section-title" style={{ marginTop: '0.8rem' }}>Request a loan</h2>
          </div>
          <LoanRequestForm />
        </section>
      </div>
    </div>
  )
}
