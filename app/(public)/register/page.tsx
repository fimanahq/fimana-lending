import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/components/auth/register-form'
import { REFRESH_COOKIE_NAME } from '@/lib/constants'

export default async function RegisterPage() {
  const cookieStore = await cookies()
  if (cookieStore.get(REFRESH_COOKIE_NAME)?.value) {
    redirect('/')
  }

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <aside className="auth-hero">
          <div className="eyebrow" style={{ background: 'rgba(255,255,255,0.16)', color: 'white' }}>FiMana Loan</div>
          <h1 className="display-title" style={{ marginTop: '1rem' }}>
            Register the right app, then start lending with policy-first defaults.
          </h1>
          <p style={{ maxWidth: 420, color: 'rgba(255,255,255,0.8)' }}>
            Accounts created here are tagged for `fimana-loan` and can be extended to other FiMana apps later.
          </p>
          <Link href="/login" className="button-secondary">Already have an account?</Link>
        </aside>

        <section className="auth-body stack">
          <div>
            <div className="eyebrow">Create account</div>
            <h2 className="section-title" style={{ marginTop: '0.8rem' }}>Set up your workspace</h2>
          </div>
          <RegisterForm />
        </section>
      </div>
    </div>
  )
}
