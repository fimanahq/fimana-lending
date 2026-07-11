'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Dialog } from '@/components/shared'
import { Button, Input } from '@/components/shared/forms'
import { ApiRequestError } from '@/lib/client-api'
import { normalizePhilippineMobileNumber } from '@/lib/phone'
import { login, register as registerAccount } from '@/services/auth'
import { classNames } from '@/utils/class-names'
import styles from './login-form.module.css'

interface LoginFormState {
  identifier: string
  password: string
}

interface RegisterFormState {
  firstName: string
  lastName: string
  mobileNumber: string
  email: string
  password: string
  confirmPassword: string
}

type LoginFormErrors = Partial<Record<keyof LoginFormState, string>>
type RegisterFormErrors = Partial<Record<keyof RegisterFormState, string>>

const initialLoginFormState: LoginFormState = {
  identifier: '',
  password: '',
}

const initialRegisterFormState: RegisterFormState = {
  firstName: '',
  lastName: '',
  mobileNumber: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateLoginForm(form: LoginFormState) {
  const errors: LoginFormErrors = {}
  const identifier = form.identifier.trim()

  if (!identifier) {
    errors.identifier = 'Enter your email address.'
  } else if (/\s/.test(identifier)) {
    errors.identifier = 'Email cannot include spaces.'
  } else if (!isLikelyEmail(identifier)) {
    errors.identifier = 'Enter a valid email address.'
  }

  if (!form.password) {
    errors.password = 'Enter your password.'
  }

  return errors
}

function validateRegisterForm(form: RegisterFormState) {
  const errors: RegisterFormErrors = {}
  const email = form.email.trim()
  const mobileNumber = normalizePhilippineMobileNumber(form.mobileNumber)

  if (!form.firstName.trim()) {
    errors.firstName = 'Enter your first name.'
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Enter your last name.'
  }

  if (!email) {
    errors.email = 'Enter your email address.'
  } else if (!isLikelyEmail(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!form.mobileNumber.trim()) {
    errors.mobileNumber = 'Enter your mobile number.'
  } else if (!mobileNumber) {
    errors.mobileNumber = 'Use a valid Philippine mobile number.'
  }

  if (form.password.length < 8) {
    errors.password = 'Use at least 8 characters.'
  } else if (form.password.length > 72) {
    errors.password = 'Use 72 characters or fewer.'
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const { setUser } = useAuth()
  const [loginForm, setLoginForm] = useState<LoginFormState>(initialLoginFormState)
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(initialRegisterFormState)
  const [loginErrors, setLoginErrors] = useState<LoginFormErrors>({})
  const [registerErrors, setRegisterErrors] = useState<RegisterFormErrors>({})
  const [registerOpen, setRegisterOpen] = useState(false)
  const [error, setError] = useState(() => {
    const authError = searchParams.get('authError')
    if (authError?.startsWith('google')) {
      return 'Google sign-in could not be completed. Please try again.'
    }

    return ''
  })
  const [registerError, setRegisterError] = useState('')
  const [invalidCredentials, setInvalidCredentials] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [registering, setRegistering] = useState(false)
  const nextPath = searchParams.get('next')
  const destination = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard'
  const googleHref = '/api/auth/google'

  const updateLoginField = (field: keyof LoginFormState, value: string) => {
    setLoginForm((current) => ({ ...current, [field]: value }))
    setLoginErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
    setInvalidCredentials(false)
  }

  const updateRegisterField = (field: keyof RegisterFormState, value: string) => {
    setRegisterForm((current) => ({ ...current, [field]: value }))
    setRegisterErrors((current) => ({ ...current, [field]: undefined }))
    setRegisterError('')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setInvalidCredentials(false)

    const nextErrors = validateLoginForm(loginForm)
    if (Object.keys(nextErrors).length > 0) {
      setLoginErrors(nextErrors)
      return
    }

    setSubmitting(true)

    try {
      const payload = await login(loginForm)
      setUser(payload.user)
      window.location.replace(!payload.user.emailVerified
        ? '/verify-email'
        : payload.user.accountTypeSelectionRequired
          ? '/select-account-type'
          : payload.user.accountType === 'borrower' ? '/portal' : destination)
    } catch (caughtError) {
      if (caughtError instanceof ApiRequestError && caughtError.status === 401) {
        setInvalidCredentials(true)
        setError('The email or password you entered does not match our records.')
      } else {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRegisterError('')

    const nextErrors = validateRegisterForm(registerForm)
    if (Object.keys(nextErrors).length > 0) {
      setRegisterErrors(nextErrors)
      return
    }

    setRegistering(true)

    try {
      const mobileNumber = normalizePhilippineMobileNumber(registerForm.mobileNumber)
      const payload = await registerAccount({
        email: registerForm.email,
        mobileNumber,
        password: registerForm.password,
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
      })
      setUser(payload.user)
      window.location.replace(payload.verificationEmailSent
        ? '/verify-email'
        : '/verify-email?delivery=failed')
    } catch (caughtError) {
      setRegisterError(caughtError instanceof Error ? caughtError.message : 'Unable to create account')
    } finally {
      setRegistering(false)
    }
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          id="loginIdentifier"
          label="Email"
          autoComplete="username"
          className={styles.field}
          error={loginErrors.identifier}
          hint="Use the email address for your FiMana account."
          inputClassName={classNames(
            styles.control,
            loginForm.identifier.trim() && styles.controlDirty,
            invalidCredentials && styles.controlInvalid,
          )}
          value={loginForm.identifier}
          onChange={(event) => updateLoginField('identifier', event.target.value)}
          placeholder="borrower@example.com"
        />

        <Input
          id="loginPassword"
          label="Password"
          type="password"
          autoComplete="current-password"
          className={styles.field}
          error={loginErrors.password}
          inputClassName={classNames(
            styles.control,
            loginForm.password && styles.controlDirty,
            invalidCredentials && styles.controlInvalid,
          )}
          value={loginForm.password}
          onChange={(event) => updateLoginField('password', event.target.value)}
          placeholder="Enter password"
        />

        {error ? (
          <div className={classNames('notice danger', styles.notice)} role="alert">
            {error}
          </div>
        ) : null}

        <Button className={styles.submit} type="submit" disabled={submitting} fullWidth>
          <span>{submitting ? 'Signing in...' : 'Sign in to FiMana'}</span>
          <span className={styles.submitArrow} aria-hidden="true">-&gt;</span>
        </Button>

        <a className={styles.google} href={googleHref}>
          <span className={styles.googleIcon} aria-hidden="true">
            G
          </span>
          <span>Continue with Google</span>
        </a>

        <div className={styles.registerPrompt}>
          <span>New to FiMana?</span>
          <button type="button" onClick={() => setRegisterOpen(true)}>
            Create account
          </button>
        </div>
      </form>

      <Dialog
        id="account-register-dialog"
        open={registerOpen}
        title="Create your FiMana account"
        description="Verify your email, then choose whether you are joining as a borrower or lender."
        onClose={() => {
          if (!registering) {
            setRegisterOpen(false)
          }
        }}
        className={styles.registerDialog}
      >
        <form className={styles.registerModalForm} onSubmit={handleRegister} noValidate>
          <div className={styles.nameGrid}>
            <Input
              id="registerFirstName"
              label="First name"
              autoComplete="given-name"
              className={styles.field}
              error={registerErrors.firstName}
              inputClassName={styles.control}
              maxLength={120}
              value={registerForm.firstName}
              onChange={(event) => updateRegisterField('firstName', event.target.value)}
              placeholder="Mara"
            />
            <Input
              id="registerLastName"
              label="Last name"
              autoComplete="family-name"
              className={styles.field}
              error={registerErrors.lastName}
              inputClassName={styles.control}
              maxLength={120}
              value={registerForm.lastName}
              onChange={(event) => updateRegisterField('lastName', event.target.value)}
              placeholder="Santos"
            />
          </div>

          <Input
            id="registerMobileNumber"
            label="Mobile number"
            autoComplete="tel"
            inputMode="tel"
            className={styles.field}
            error={registerErrors.mobileNumber}
            inputClassName={styles.control}
            maxLength={40}
            value={registerForm.mobileNumber}
            onChange={(event) => updateRegisterField('mobileNumber', event.target.value)}
            placeholder="+63 912 345 6789"
          />

          <Input
            id="registerEmail"
            label="Email"
            autoComplete="email"
            inputMode="email"
            className={styles.field}
            error={registerErrors.email}
            inputClassName={styles.control}
            maxLength={320}
            value={registerForm.email}
            onChange={(event) => updateRegisterField('email', event.target.value)}
            placeholder="borrower@example.com"
          />

          <Input
            id="registerPassword"
            label="Password"
            type="password"
            autoComplete="new-password"
            className={styles.field}
            error={registerErrors.password}
            inputClassName={styles.control}
            maxLength={72}
            value={registerForm.password}
            onChange={(event) => updateRegisterField('password', event.target.value)}
            placeholder="Use at least 8 characters"
          />

          <Input
            id="registerConfirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            className={styles.field}
            error={registerErrors.confirmPassword}
            inputClassName={styles.control}
            maxLength={72}
            value={registerForm.confirmPassword}
            onChange={(event) => updateRegisterField('confirmPassword', event.target.value)}
            placeholder="Re-enter password"
          />

          {registerError ? (
            <div className={classNames('notice danger', styles.notice)} role="alert">
              {registerError}
            </div>
          ) : null}

          <Button className={styles.submit} type="submit" disabled={registering} fullWidth>
            <span>{registering ? 'Creating account...' : 'Create FiMana account'}</span>
            <span className={styles.submitArrow} aria-hidden="true">-&gt;</span>
          </Button>
        </form>
      </Dialog>
    </>
  )
}
