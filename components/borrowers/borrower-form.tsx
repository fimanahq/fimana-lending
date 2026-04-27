'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ErrorBanner, Input, Textarea } from '@/components/shared'
import type { Contact } from '@/lib/types'
import { createBorrower, updateBorrower, type CreateBorrowerInput } from '@/services'

interface BorrowerFormProps {
  mode: 'create' | 'edit'
  borrower?: Contact
  onSaved?: (borrower: Contact) => void
}

interface BorrowerFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
}

type BorrowerFormErrors = Partial<Record<keyof BorrowerFormState, string>>

const emptyForm: BorrowerFormState = {
  email: '',
  firstName: '',
  lastName: '',
  notes: '',
  phone: '',
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getInitialForm(borrower?: Contact): BorrowerFormState {
  if (!borrower) {
    return emptyForm
  }

  return {
    email: borrower.email || '',
    firstName: borrower.firstName,
    lastName: borrower.lastName,
    notes: borrower.notes || '',
    phone: borrower.phone || '',
  }
}

function trimForm(form: BorrowerFormState): CreateBorrowerInput {
  return {
    email: form.email.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    notes: form.notes.trim(),
    phone: form.phone.trim(),
  }
}

function validateForm(form: BorrowerFormState) {
  const nextErrors: BorrowerFormErrors = {}
  const trimmed = trimForm(form)

  if (!trimmed.firstName) {
    nextErrors.firstName = 'First name is required.'
  }

  if (!trimmed.lastName) {
    nextErrors.lastName = 'Last name is required.'
  }

  if (!trimmed.email) {
    nextErrors.email = 'Email is required.'
  } else if (!isValidEmail(trimmed.email)) {
    nextErrors.email = 'Enter a valid email address.'
  }

  if (!trimmed.phone) {
    nextErrors.phone = 'Phone is required.'
  }

  return nextErrors
}

export function BorrowerForm({ borrower, mode, onSaved }: BorrowerFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<BorrowerFormState>(() => getInitialForm(borrower))
  const [errors, setErrors] = useState<BorrowerFormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  const submitLabel = mode === 'create' ? 'Add borrower' : 'Save borrower'
  const savingLabel = mode === 'create' ? 'Adding borrower...' : 'Saving borrower...'
  const hasChanges = useMemo(() => {
    if (mode === 'create') {
      return Object.values(form).some((value) => value.trim().length > 0)
    }

    const initial = getInitialForm(borrower)
    return Object.entries(form).some(([key, value]) => initial[key as keyof BorrowerFormState] !== value)
  }, [borrower, form, mode])

  const updateField = (field: keyof BorrowerFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError('')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateForm(form)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    setSubmitError('')

    try {
      const payload = trimForm(form)
      let saved: Contact

      if (mode === 'create') {
        saved = await createBorrower(payload)
      } else {
        if (!borrower) {
          throw new Error('Borrower record is required before saving edits.')
        }

        saved = await updateBorrower(borrower._id, payload)
      }

      onSaved?.(saved)

      if (mode === 'create') {
        router.push(`/borrowers/${saved._id}`)
      }
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Unable to save borrower')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      {submitError ? (
        <ErrorBanner title="Borrower was not saved" message={submitError} />
      ) : null}

      <div className="grid two">
        <Input
          id={`${mode}-borrower-first-name`}
          label="First name"
          value={form.firstName}
          error={errors.firstName}
          autoComplete="given-name"
          onChange={(event) => updateField('firstName', event.target.value)}
          required
        />
        <Input
          id={`${mode}-borrower-last-name`}
          label="Last name"
          value={form.lastName}
          error={errors.lastName}
          autoComplete="family-name"
          onChange={(event) => updateField('lastName', event.target.value)}
          required
        />
      </div>

      <div className="grid two">
        <Input
          id={`${mode}-borrower-email`}
          label="Email"
          value={form.email}
          error={errors.email}
          autoComplete="email"
          inputMode="email"
          onChange={(event) => updateField('email', event.target.value)}
          placeholder="borrower@example.com"
          required
          type="email"
        />
        <Input
          id={`${mode}-borrower-phone`}
          label="Phone"
          value={form.phone}
          error={errors.phone}
          autoComplete="tel"
          onChange={(event) => updateField('phone', event.target.value)}
          required
          type="tel"
        />
      </div>

      <Textarea
        id={`${mode}-borrower-notes`}
        label="Notes"
        value={form.notes}
        onChange={(event) => updateField('notes', event.target.value)}
        placeholder="Optional borrower notes."
      />

      <div className="inline-actions">
        <Button type="submit" disabled={saving || (mode === 'edit' && !hasChanges)}>
          {saving ? savingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
