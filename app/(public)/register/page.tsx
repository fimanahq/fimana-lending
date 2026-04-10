import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/components/auth/register-form'
import { REFRESH_COOKIE_NAME } from '@/lib/constants'

export default async function RegisterPage() {
  const cookieStore = await cookies()
  if (cookieStore.get(REFRESH_COOKIE_NAME)?.value) {
    redirect('/dashboard')
  }

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <aside className="auth-hero">
          <div className="eyebrow eyebrow-inverse">FiMana Lending</div>
          <h1 className="display-title title-offset">
            Register the right app, then start lending with policy-first defaults.
          </h1>
          <p className="auth-hero-copy">
            Accounts created here are tagged for `fimana-lending` and can be extended to other FiMana apps later.
          </p>
          <div className="inline-actions actions-offset">
            <Link href="/login" className="button-secondary">Already have an account?</Link>
            <Link href="/request-loan" className="button-secondary">Request a loan</Link>
          </div>
        </aside>

        <section className="auth-body stack">
          <div>
            <div className="eyebrow">Create account</div>
            <h2 className="section-title title-offset">Set up your workspace</h2>
          </div>
          <RegisterForm />
        </section>
      </div>
    </div>
  )
}
