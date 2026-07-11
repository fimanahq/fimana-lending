'use client'

import { BriefcaseBusiness, CircleUserRound } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/shared/forms'
import type { AccountType } from '@/services/auth'
import { selectAccountType } from '@/services/auth'
import styles from './account-type-selection.module.css'

interface AccountTypeSelectionProps {
  email: string
}

const accountTypes: Array<{
  value: AccountType
  title: string
  description: string
  destination: string
  icon: typeof BriefcaseBusiness
}> = [
  {
    value: 'borrower',
    title: 'Borrower',
    description: 'Track your applications, linked loans, balances, and upcoming due dates.',
    destination: 'Borrower Portal',
    icon: CircleUserRound,
  },
  {
    value: 'lender',
    title: 'Lender',
    description: 'Manage borrowers, applications, active loans, collections, and portfolio performance.',
    destination: 'Lending workspace',
    icon: BriefcaseBusiness,
  },
]

export function AccountTypeSelection({ email }: AccountTypeSelectionProps) {
  const { setUser } = useAuth()
  const [selected, setSelected] = useState<AccountType | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) {
      setError('Choose how you will use FiMana.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const payload = await selectAccountType(selected)
      setUser(payload.user)
      window.location.replace(selected === 'borrower' ? '/portal' : '/dashboard')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save account type')
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <div className={styles.heading}>
        <span className={styles.kicker}>Email verified</span>
        <h1>How will you use FiMana?</h1>
        <p>Choose once for <strong>{email}</strong>. Account-type changes require support.</p>
      </div>

      <div className={styles.options} role="radiogroup" aria-label="Account type">
        {accountTypes.map((option) => {
          const Icon = option.icon
          const active = selected === option.value

          return (
            <label className={active ? `${styles.option} ${styles.optionActive}` : styles.option} key={option.value}>
              <input
                type="radio"
                name="accountType"
                value={option.value}
                checked={active}
                disabled={submitting}
                onChange={() => {
                  setSelected(option.value)
                  setError('')
                }}
              />
              <span className={styles.icon} aria-hidden="true"><Icon strokeWidth={1.8} /></span>
              <span className={styles.optionCopy}>
                <strong>{option.title}</strong>
                <span>{option.description}</span>
                <small>Continue to {option.destination}</small>
              </span>
              <span className={styles.radioMark} aria-hidden="true" />
            </label>
          )
        })}
      </div>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      <Button type="submit" fullWidth disabled={!selected || submitting}>
        {submitting ? 'Saving account type...' : selected ? `Continue as ${selected}` : 'Choose an account type'}
      </Button>
    </form>
  )
}
