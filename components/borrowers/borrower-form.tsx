'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ErrorBanner, Input, Textarea, useToast } from '@/components/shared'
import type { Borrower } from '@/lib/types/lending'
import { createBorrower, updateBorrower } from '@/services'
import { CreateBorrowerInput } from '@/types'

interface BorrowerFormProps {
  mode: 'create' | 'edit'
  borrower?: Borrower
  onSaved?: (borrower: Borrower) => void
}

interface BorrowerFormState {
  firstName: string
  lastName: string
  email: string
  contactNumber: string
  income: string
  notes: string
  addressLine1: string
  addressLine2: string
  addressCity: string
  addressProvince: string
  addressPostalCode: string
}

type BorrowerFormErrors = Partial<Record<keyof BorrowerFormState, string>>

const emptyForm: BorrowerFormState = {
  email: '',
  firstName: '',
  income: '',
  lastName: '',
  notes: '',
  contactNumber: '',
  addressLine1: '',
  addressLine2: '',
  addressCity: '',
  addressProvince: '',
  addressPostalCode: '',
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getInitialForm(borrower?: Borrower): BorrowerFormState {
  if (!borrower) {
    return emptyForm
  }

  const nameParts = borrower.fullName.split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ')

  return {
    email: borrower.email || '',
    firstName,
    income: borrower.income !== null && borrower.income !== undefined ? String(borrower.income) : '',
    lastName,
    notes: borrower.notes || '',
    contactNumber: borrower.contactNumber || '',
    addressLine1: borrower.addressDetails?.line1 ?? '',
    addressLine2: borrower.addressDetails?.line2 ?? '',
    addressCity: borrower.addressDetails?.city ?? '',
    addressProvince: borrower.addressDetails?.province ?? '',
    addressPostalCode: borrower.addressDetails?.postalCode ?? '',
  }
}

function parseIncome(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function getAddressDetails(form: BorrowerFormState) {
  const addressDetails = {
    line1: form.addressLine1.trim(),
    line2: form.addressLine2.trim(),
    city: form.addressCity.trim(),
    province: form.addressProvince.trim(),
    postalCode: form.addressPostalCode.trim() || undefined,
  }

  return Object.values(addressDetails).some(Boolean) ? addressDetails : null
}

function trimForm(form: BorrowerFormState): CreateBorrowerInput {
  const firstName = form.firstName.trim()
  const lastName = form.lastName.trim()
  const fullName = `${firstName} ${lastName}`.trim()
  const income = parseIncome(form.income)

  return {
    email: form.email.trim(),
    fullName,
    income: income === null ? null : income,
    notes: form.notes.trim(),
    contactNumber: form.contactNumber.trim(),
    addressDetails: getAddressDetails(form),
  }
}

function validateForm(form: BorrowerFormState) {
  const nextErrors: BorrowerFormErrors = {}
  const trimmed = trimForm(form)

  if (!trimmed.fullName) {
    nextErrors.firstName = 'Borrower name is required.'
  }

  if (trimmed.email && !isValidEmail(trimmed.email)) {
    nextErrors.email = 'Enter a valid email address.'
  }

  if (!trimmed.email && !trimmed.contactNumber) {
    nextErrors.contactNumber = 'Provide an email address or phone number.'
  }

  if (trimmed.income !== undefined && trimmed.income !== null && (!Number.isFinite(trimmed.income) || trimmed.income < 0)) {
    nextErrors.income = 'Monthly income must be zero or greater.'
  }

  if (trimmed.addressDetails) {
    if (!trimmed.addressDetails.line1) {
      nextErrors.addressLine1 = 'Street address is required when providing an address.'
    }
    if (!trimmed.addressDetails.line2) {
      nextErrors.addressLine2 = 'Barangay or district is required when providing an address.'
    }
    if (!trimmed.addressDetails.city) {
      nextErrors.addressCity = 'City or municipality is required when providing an address.'
    }
    if (!trimmed.addressDetails.province) {
      nextErrors.addressProvince = 'Province is required when providing an address.'
    }
    if (trimmed.addressDetails.postalCode && !/^\d{4}$/.test(trimmed.addressDetails.postalCode)) {
      nextErrors.addressPostalCode = 'Postal code must be 4 digits.'
    }
  }

  return nextErrors
}

export function BorrowerForm({ borrower, mode, onSaved }: BorrowerFormProps) {
  const router = useRouter()
  const { dismiss, loading, update } = useToast()
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
    const toastId = loading(mode === 'create' ? 'Adding borrower...' : 'Saving borrower...')

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
      update(toastId, mode === 'create' ? 'Borrower added.' : 'Borrower updated.', { tone: 'success', title: 'Success' })

      if (mode === 'create') {
        router.push(`/borrowers/${saved.id}`)
      }
    } catch (caughtError) {
      dismiss(toastId)
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

      <Input
        id={`${mode}-borrower-income`}
        label="Monthly Income"
        value={form.income}
        error={errors.income}
        inputMode="decimal"
        min="0"
        onChange={(event) => updateField('income', event.target.value)}
        placeholder="0.00"
        type="number"
      />

      <div className="stack">
        <div>
          <strong>Address</strong>
          <div className="muted">Optional. If entered, provide the full address.</div>
        </div>
        <div className="grid two">
          <Input
            id={`${mode}-borrower-address-line1`}
            label="Street Address"
            value={form.addressLine1}
            error={errors.addressLine1}
            autoComplete="address-line1"
            placeholder="House no., street, building, unit"
            onChange={(event) => updateField('addressLine1', event.target.value)}
          />
          <Input
            id={`${mode}-borrower-address-line2`}
            label="Barangay or District"
            value={form.addressLine2}
            error={errors.addressLine2}
            autoComplete="address-line2"
            placeholder="e.g., Barangay San Antonio"
            onChange={(event) => updateField('addressLine2', event.target.value)}
          />
        </div>
        <div className="grid two">
          <Input
            id={`${mode}-borrower-address-city`}
            label="City or Municipality"
            value={form.addressCity}
            error={errors.addressCity}
            autoComplete="address-level2"
            onChange={(event) => updateField('addressCity', event.target.value)}
          />
          <Input
            id={`${mode}-borrower-address-province`}
            label="Province"
            value={form.addressProvince}
            error={errors.addressProvince}
            autoComplete="address-level1"
            onChange={(event) => updateField('addressProvince', event.target.value)}
          />
        </div>
        <Input
          id={`${mode}-borrower-address-postal-code`}
          label="Postal Code"
          value={form.addressPostalCode}
          error={errors.addressPostalCode}
          autoComplete="postal-code"
          inputMode="numeric"
          maxLength={4}
          placeholder="Optional"
          onChange={(event) => updateField('addressPostalCode', event.target.value.replace(/\D/g, '').slice(0, 4))}
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
