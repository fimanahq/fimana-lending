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
    <div className="auth-shell">
      <div className="card auth-card">
        <aside className="auth-hero">
          <div className="eyebrow" style={{ background: 'rgba(255,255,255,0.16)', color: 'white' }}>FiMana Loan</div>
          <h1 className="display-title" style={{ marginTop: '1rem' }}>
            Sign in and work the next cutoff with precision.
          </h1>
          <p style={{ maxWidth: 420, color: 'rgba(255,255,255,0.8)' }}>
            Access borrower records, payment schedules, equal amortization tables, and upcoming reminders.
          </p>
          <div className="inline-actions" style={{ marginTop: '1rem' }}>
            <Link href="/register" className="button-secondary">Create a loan workspace</Link>
            <Link href="/request-loan" className="button-secondary">Request a loan</Link>
          </div>
        </aside>

        <section className="auth-body stack">
          <div>
            <div className="eyebrow">Secure access</div>
            <h2 className="section-title" style={{ marginTop: '0.8rem' }}>Welcome back</h2>
          </div>
          <LoginForm />
        </section>
      </div>
    </div>
  )
}
