'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { apiRequest } from '@/lib/client-api'
import type { User } from '@/lib/types'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const nextPath = searchParams.get('next')
  const destination = nextPath && nextPath.startsWith('/') ? nextPath : '/dashboard'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const payload = await apiRequest<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      setUser(payload.user)
      router.push(destination)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-form__field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="login-form__field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error ? <div className="notice danger">{error}</div> : null}

      <div className="login-form__meta">
        <span>Protected workspace session</span>
        <span>{destination === '/dashboard' ? 'Direct dashboard access' : `Next: ${destination}`}</span>
      </div>

      <button className="login-form__submit" type="submit" disabled={submitting}>
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>

      <div className="login-form__footer">
        <span className="muted">New to the lending app?</span>
        <Link href="/register">Create an account</Link>
      </div>
    </form>
  )
}
