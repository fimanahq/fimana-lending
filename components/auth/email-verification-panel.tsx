'use client'

import { useEffect, useRef, useState } from 'react'
import { CircleAlert, LoaderCircle, MailCheck, Send } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/shared/forms'
import { getPostAuthDestination } from '@/lib/access'
import { confirmEmailVerification, resendEmailVerification } from '@/services/auth'
import styles from './email-verification-panel.module.css'

interface EmailVerificationPanelProps {
  token?: string
  email?: string
  deliveryFailed?: boolean
}

type VerificationState = 'idle' | 'confirming' | 'confirmed' | 'resending' | 'sent' | 'error'

export function EmailVerificationPanel({ token = '', email = '', deliveryFailed = false }: EmailVerificationPanelProps) {
  const { setUser } = useAuth()
  const [state, setState] = useState<VerificationState>(token ? 'confirming' : deliveryFailed ? 'error' : 'idle')
  const [message, setMessage] = useState(token
    ? 'Confirming your email address...'
    : deliveryFailed
      ? 'Your account was created, but the verification email could not be delivered.'
      : 'Check your email for the verification link.')
  const confirmingRef = useRef(false)

  useEffect(() => {
    if (!token || confirmingRef.current) {
      return
    }

    confirmingRef.current = true

    void (async () => {
      try {
        const payload = await confirmEmailVerification(token)
        setUser(payload.user)
        setState('confirmed')
        setMessage('Email verified. Redirecting to your account...')
        window.setTimeout(() => {
          window.location.replace(getPostAuthDestination(payload.user))
        }, 800)
      } catch (error) {
        setState('error')
        setMessage(error instanceof Error ? error.message : 'Unable to verify email. The link may have expired.')
      }
    })()
  }, [setUser, token])

  const handleResend = async () => {
    setState('resending')
    setMessage('Sending a new verification email...')

    try {
      const response = await resendEmailVerification()
      setState('sent')
      setMessage(response.message)
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Unable to resend verification email.')
    }
  }

  const busy = state === 'confirming' || state === 'resending'
  const StatusIcon = busy ? LoaderCircle : state === 'error' ? CircleAlert : state === 'confirmed' ? MailCheck : Send

  return (
    <div className={styles.card}>
      <div className={styles.icon} data-state={state} aria-hidden="true">
        <StatusIcon className={busy ? styles.spinning : undefined} strokeWidth={1.7} />
      </div>
      <div className={styles.eyebrow}>Secure account setup</div>
      <h1>{state === 'confirmed' ? 'Email verified' : 'Verify your email'}</h1>
      {email && !token ? <p>We sent a verification link to <strong>{email}</strong>.</p> : null}
      <p className={styles.message} role={state === 'error' ? 'alert' : 'status'}>{message}</p>

      {(!token || state === 'error') && email ? (
        <Button type="button" onClick={handleResend} disabled={busy} fullWidth>
          {state === 'resending' ? 'Sending...' : 'Resend verification email'}
        </Button>
      ) : null}

      {!email && (state === 'error' || (!token && state === 'idle')) ? (
        <a className="button-secondary" href="/login">Return to sign in</a>
      ) : null}
    </div>
  )
}
