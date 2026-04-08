'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { apiRequest } from '@/lib/client-api'
import type { User } from '@/lib/types'

export function RegisterForm() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const payload = await apiRequest<{ user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...form, appCode: 'fimana-lending' }),
      })

      setUser(payload.user)
      router.push('/dashboard')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="grid two">
        <div className="field">
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            value={form.firstName}
            onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            value={form.lastName}
            onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          required
          minLength={8}
        />
      </div>

      {error ? <div className="notice danger">{error}</div> : null}

      <button className="button" type="submit" disabled={submitting}>
        {submitting ? 'Creating account...' : 'Create account'}
      </button>

      <div className="muted" style={{ fontSize: '0.95rem' }}>
        Already registered? <Link href="/login" style={{ color: 'var(--accent-strong)' }}>Go to sign in</Link>
      </div>
    </form>
  )
}
