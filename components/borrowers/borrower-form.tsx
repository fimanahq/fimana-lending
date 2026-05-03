'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ErrorBanner, Input, Textarea } from '@/components/shared'
import type { Borrower } from '@/lib/types'
import { createBorrower, updateBorrower, type CreateBorrowerInput } from '@/services'

interface BorrowerFormProps {
  mode: 'create' | 'edit'
  borrower?: Borrower
  onSaved?: (borrower: Borrower) => void
}

interface BorrowerFormState {
  fullName: string
  email: string
  contactNumber: string
  notes: string
}

type BorrowerFormErrors = Partial<Record<keyof BorrowerFormState, string>>

const emptyForm: BorrowerFormState = {
  email: '',
  fullName: '',
  notes: '',
  contactNumber: '',
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getInitialForm(borrower?: Borrower): BorrowerFormState {
  if (!borrower) {
    return emptyForm
  }

  return {
    email: borrower.email || '',
    fullName: borrower.fullName,
    notes: borrower.notes || '',
    contactNumber: borrower.contactNumber || '',
  }
}

function trimForm(form: BorrowerFormState): CreateBorrowerInput {
  return {
    email: form.email.trim(),
    fullName: form.fullName.trim(),
    notes: form.notes.trim(),
    contactNumber: form.contactNumber.trim(),
  }
}

function validateForm(form: BorrowerFormState) {
  const nextErrors: BorrowerFormErrors = {}
  const trimmed = trimForm(form)

  if (!trimmed.fullName) {
    nextErrors.fullName = 'Borrower name is required.'
  }

  if (trimmed.email && !isValidEmail(trimmed.email)) {
    nextErrors.email = 'Enter a valid email address.'
  }

  if (!trimmed.email && !trimmed.contactNumber) {
    nextErrors.contactNumber = 'Provide an email address or phone number.'
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
      let saved: Borrower

      if (mode === 'create') {
        saved = await createBorrower(payload)
      } else {
        if (!borrower) {
          throw new Error('Borrower record is required before saving edits.')
        }

        saved = await updateBorrower(borrower.id, payload)
      }

      onSaved?.(saved)

      if (mode === 'create') {
        router.push(`/borrowers/${saved.id}`)
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

      <Input
        id={`${mode}-borrower-full-name`}
        label="Borrower name"
        value={form.fullName}
        error={errors.fullName}
        autoComplete="name"
        onChange={(event) => updateField('fullName', event.target.value)}
        required
      />

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
          type="email"
        />
        <Input
          id={`${mode}-borrower-phone`}
          label="Phone"
          value={form.contactNumber}
          error={errors.contactNumber}
          autoComplete="tel"
          onChange={(event) => updateField('contactNumber', event.target.value)}
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
