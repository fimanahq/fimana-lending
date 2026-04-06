import Link from 'next/link'

const lendingSteps = [
  {
    title: 'Borrower submits a request',
    copy: 'Collect the amount, preferred schedule, and contact details from a clean public page.',
  },
  {
    title: 'You review it inside FiMana',
    copy: 'Open the protected request queue, confirm the payment rhythm, and approve only the ready borrowers.',
  },
  {
    title: 'FiMana creates the loan',
    copy: 'Approved requests become a borrower record and a generated schedule in the internal workspace.',
  },
]

export default function LandingPage() {
  return (
    <div className="landing-shell">
      <div className="page-wrap stack">
        <section className="landing-hero card panel">
          <div className="eyebrow">FiMana Loan</div>
          <h1 className="display-title" style={{ marginTop: '0.9rem', maxWidth: 860 }}>
            Let borrowers request a loan publicly, then approve the right deals inside your protected workspace.
          </h1>
          <p className="muted" style={{ fontSize: '1.05rem', maxWidth: 720 }}>
            Give applicants a simple intake page, keep approval decisions in your account, and turn approved requests
            into borrower records plus amortization schedules.
          </p>

          <div className="inline-actions" style={{ marginTop: '1rem' }}>
            <Link href="/request-loan" className="button">Request a loan</Link>
            <Link href="/login" className="button-secondary">Sign in</Link>
            <Link href="/dashboard" className="button-ghost">Open workspace</Link>
          </div>
        </section>

        <section className="grid three">
          <article className="card panel">
            <div className="eyebrow">Public intake</div>
            <h2 className="section-title" style={{ marginTop: '0.7rem' }}>Capture real borrower demand</h2>
            <p className="muted">Applicants can send their preferred amount, cutoff cadence, and first payment date.</p>
          </article>
          <article className="card panel">
            <div className="eyebrow">Internal control</div>
            <h2 className="section-title" style={{ marginTop: '0.7rem' }}>Approve inside your account</h2>
            <p className="muted">Only signed-in workspace users can convert a request into an issued loan.</p>
          </article>
          <article className="card panel">
            <div className="eyebrow">Operational follow-through</div>
            <h2 className="section-title" style={{ marginTop: '0.7rem' }}>Stay on top of collections</h2>
            <p className="muted">Approved loans flow into the borrower roster, schedule table, and reminders.</p>
          </article>
        </section>

        <section className="card panel stack">
          <div>
            <div className="eyebrow">Workflow</div>
            <h2 className="section-title" style={{ marginTop: '0.7rem' }}>Three steps from inquiry to approval</h2>
          </div>

          <div className="grid three">
            {lendingSteps.map((step, index) => (
              <article key={step.title} className="feature-card">
                <div className="eyebrow">Step {index + 1}</div>
                <h3 className="section-title" style={{ marginTop: '0.7rem' }}>{step.title}</h3>
                <p className="muted">{step.copy}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
