'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { apiRequest } from '@/lib/client-api'
import type { User } from '@/lib/types'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser } = useAuth()
  const emailInputRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailIsValid, setEmailIsValid] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const nextPath = searchParams.get('next')
  const destination = nextPath && nextPath.startsWith('/') ? nextPath : '/dashboard'
  const emailIsDirty = email.trim().length > 0

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!event.currentTarget.reportValidity()) {
      setEmailIsValid(emailInputRef.current?.validity.valid ?? false)
      return
    }

    setSubmitting(true)

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
    <form className="signin-form" onSubmit={handleSubmit}>
      <div className="signin-form__field">
        <label htmlFor="email">Work Email</label>
        <div
          className={`signin-form__inputShell${
            emailIsDirty ? ' signin-form__inputShell--dirty' : ''
          }${
            emailIsDirty ? (emailIsValid ? ' signin-form__inputShell--valid' : ' signin-form__inputShell--invalid') : ''
          }`}
        >
          <span className="signin-form__icon signin-form__icon--at" aria-hidden="true">@</span>
          <input
            ref={emailInputRef}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setEmailIsValid(event.currentTarget.validity.valid)
            }}
            aria-invalid={emailIsDirty && !emailIsValid}
            required
          />
        </div>
        {emailIsDirty && !emailIsValid ? <p className="signin-form__fieldError">Enter a valid email address</p> : null}
      </div>

      <div className="signin-form__field">
        <div className="signin-form__fieldRow">
          <label htmlFor="password">Password</label>
        </div>
        <div className="signin-form__inputShell">
          <span className="signin-form__icon signin-form__icon--lock" aria-hidden="true" />
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
      </div>

      {error ? <div className="notice danger signin-form__notice">{error}</div> : null}

      <button className="signin-form__submit" type="submit" disabled={submitting}>
        <span>{submitting ? 'Signing in...' : 'Sign in to FiMana'}</span>
        <span className="signin-form__submitArrow" aria-hidden="true">→</span>
      </button>
    </form>
  )
}
