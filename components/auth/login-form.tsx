'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button, Input } from '@/components/shared/forms'
import { ApiRequestError } from '@/lib/client-api'
import { login } from '@/services/auth'
import { classNames } from '@/utils/class-names'

interface LoginFormState {
  identifier: string
  password: string
}

type LoginFormErrors = Partial<Record<keyof LoginFormState, string>>

const initialFormState: LoginFormState = {
  identifier: '',
  password: '',
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateLoginForm(form: LoginFormState) {
  const errors: LoginFormErrors = {}
  const identifier = form.identifier.trim()

  if (!identifier) {
    errors.identifier = 'Enter your email address or username.'
  } else if (/\s/.test(identifier)) {
    errors.identifier = 'Email or username cannot include spaces.'
  } else if (identifier.includes('@') && !isLikelyEmail(identifier)) {
    errors.identifier = 'Enter a valid email address or use your username.'
  }

  if (!form.password) {
    errors.password = 'Enter your password.'
  }

  return errors
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser } = useAuth()
  const [form, setForm] = useState<LoginFormState>(initialFormState)
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({})
  const [error, setError] = useState('')
  const [invalidCredentials, setInvalidCredentials] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const nextPath = searchParams.get('next')
  const destination = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard'

  const updateField = (field: keyof LoginFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
    setInvalidCredentials(false)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setInvalidCredentials(false)

    const nextErrors = validateLoginForm(form)
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setSubmitting(true)

    try {
      const payload = await login(form)
      setUser(payload.user)
      router.push(destination)
    } catch (caughtError) {
      if (caughtError instanceof ApiRequestError && caughtError.status === 401) {
        setInvalidCredentials(true)
        setError('The email, username, or password you entered does not match our records.')
      } else {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="signin-form" onSubmit={handleSubmit} noValidate>
      <Input
        id="loginIdentifier"
        label="Email or username"
        autoComplete="username"
        className="signin-form__field"
        error={fieldErrors.identifier}
        hint="Use the admin identity assigned to your lending workspace."
        inputClassName={classNames(
          'signin-form__control',
          form.identifier.trim() && 'signin-form__control--dirty',
          invalidCredentials && 'signin-form__control--invalid',
        )}
        value={form.identifier}
        onChange={(event) => updateField('identifier', event.target.value)}
        placeholder="admin@company.com"
      />

      <Input
        id="loginPassword"
        label="Password"
        type="password"
        autoComplete="current-password"
        className="signin-form__field"
        error={fieldErrors.password}
        inputClassName={classNames(
          'signin-form__control',
          form.password && 'signin-form__control--dirty',
          invalidCredentials && 'signin-form__control--invalid',
        )}
        value={form.password}
        onChange={(event) => updateField('password', event.target.value)}
        placeholder="Enter password"
      />

      {error ? (
        <div className="notice danger signin-form__notice" role="alert">
          {error}
        </div>
      ) : null}

      <Button className="signin-form__submit" type="submit" disabled={submitting} fullWidth>
        <span>{submitting ? 'Signing in...' : 'Sign in to FiMana'}</span>
        <span className="signin-form__submitArrow" aria-hidden="true">-&gt;</span>
      </Button>
    </form>
  )
}
