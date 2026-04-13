'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type WheelEvent } from 'react'
import { buildPaymentDays, paymentDayOptions } from '@/lib/loan-schedule'
import { apiRequest } from '@/lib/client-api'
import type { Contact, Loan, LoanSchedulePreset, PaymentFrequency } from '@/lib/types'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function LoanForm() {
  const preventWheelValueChange = (event: WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur()
  }

  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [error, setError] = useState('')
  const [contactError, setContactError] = useState('')
  const [success, setSuccess] = useState('')
  const [creatingContact, setCreatingContact] = useState(false)
  const [contactEmailTouched, setContactEmailTouched] = useState(false)
  const [contactEmailFocused, setContactEmailFocused] = useState(false)
  const [form, setForm] = useState({
    contactId: '',
    principal: '5000',
    gives: '2',
    paymentFrequency: 'twice_monthly' as PaymentFrequency,
    firstDay: '15',
    secondDay: 'month_end',
    preset: '15_month_end' as LoanSchedulePreset,
    firstPaymentDate: '',
    notes: '',
  })
  const [contactDraft, setContactDraft] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  })

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const rows = await apiRequest<Contact[]>('/api/contacts')
        setContacts(rows)
        setForm((current) => ({ ...current, contactId: current.contactId || rows[0]?._id || '' }))
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load borrowers')
      } finally {
        setLoadingContacts(false)
      }
    }

    void loadContacts()
  }, [])

  const paymentDays = useMemo(
    () => buildPaymentDays(form.paymentFrequency, form.firstDay, form.secondDay, form.preset),
    [form.firstDay, form.paymentFrequency, form.preset, form.secondDay],
  )
  const contactEmailValue = contactDraft.email.trim()
  const showContactEmailValidation = contactEmailTouched && !contactEmailFocused
  const contactEmailHasFormatError =
    showContactEmailValidation && contactEmailValue.length > 0 && !isValidEmail(contactEmailValue)
  const contactEmailIsValid = showContactEmailValidation && contactEmailValue.length > 0 && isValidEmail(contactEmailValue)

  const handleCreateContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedDraft = {
      firstName: contactDraft.firstName.trim(),
      lastName: contactDraft.lastName.trim(),
      email: contactDraft.email.trim(),
      phone: contactDraft.phone.trim(),
      notes: contactDraft.notes.trim(),
    }

    if (!trimmedDraft.firstName || !trimmedDraft.lastName) {
      setContactError('Borrower first and last name are required.')
      return
    }

    if (!trimmedDraft.email || !trimmedDraft.phone) {
      setContactError('Borrower email and phone are required.')
      return
    }

    if (trimmedDraft.email && !isValidEmail(trimmedDraft.email)) {
      return
    }

    setCreatingContact(true)
    setContactError('')
    setError('')
    setSuccess('')

    try {
      const contact = await apiRequest<Contact>('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(trimmedDraft),
      })

      setContacts((current) => [contact, ...current])
      setForm((current) => ({ ...current, contactId: contact._id }))
      setContactDraft({ firstName: '', lastName: '', email: '', phone: '', notes: '' })
      setContactEmailTouched(false)
      setContactEmailFocused(false)
      setSuccess(`Borrower ${contact.firstName} ${contact.lastName} added.`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create borrower')
    } finally {
      setCreatingContact(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    try {
      const loan = await apiRequest<Loan>('/api/lendings', {
        method: 'POST',
        body: JSON.stringify({
          contactId: form.contactId,
          principal: Number(form.principal),
          gives: Number(form.gives),
          paymentFrequency: form.paymentFrequency,
          paymentDays,
          firstPaymentDate: form.firstPaymentDate,
          notes: form.notes,
        }),
      })

      router.push(`/loans/${loan._id}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create loan')
    }
  }

  return (
    <div className="grid two">
      <section className="card panel stack">
        <div>
          <div className="eyebrow">New loan</div>
          <h1 className="section-title title-offset">Create a lending schedule</h1>
          <p className="muted">
            Freeze the interest rate, lock the payment dates, and generate the full table immediately.
          </p>
          <div className="actions-offset">
            <Link href="/calculator" className="button-ghost">Open calculator first</Link>
          </div>
        </div>

        {error ? <div className="notice danger">{error}</div> : null}
        {success ? <div className="notice">{success}</div> : null}

        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="contact">Borrower</label>
            <select
              id="contact"
              value={form.contactId}
              onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}
              disabled={loadingContacts}
              required
            >
              <option value="">Select borrower</option>
              {contacts.map((contact) => (
                <option key={contact._id} value={contact._id}>
                  {contact.firstName} {contact.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid two">
            <div className="field">
              <label htmlFor="principal">Loan amount</label>
              <input
                id="principal"
                className="input-no-spinner"
                type="number"
                min="1"
                onWheel={preventWheelValueChange}
                value={form.principal}
                onChange={(event) => setForm((current) => ({ ...current, principal: event.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="gives">Number of gives</label>
              <input
                id="gives"
                className="input-no-spinner"
                type="number"
                min="1"
                onWheel={preventWheelValueChange}
                value={form.gives}
                onChange={(event) => setForm((current) => ({ ...current, gives: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="paymentFrequency">Payment frequency</label>
            <select
              id="paymentFrequency"
              value={form.paymentFrequency}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  paymentFrequency: event.target.value as PaymentFrequency,
                }))
              }
            >
              <option value="monthly">Monthly</option>
              <option value="twice_monthly">Twice monthly</option>
            </select>
          </div>

          {form.paymentFrequency === 'twice_monthly' ? (
            <>
              <div className="field">
                <label htmlFor="preset">Schedule preset</label>
                <select
                  id="preset"
                  value={form.preset}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      preset: event.target.value as LoanSchedulePreset,
                    }))
                  }
                >
                  <option value="15_month_end">15th + month end</option>
                  <option value="5_20">5th + 20th</option>
                  <option value="custom">Custom dates</option>
                </select>
              </div>

              {form.preset === 'custom' ? (
                <div className="grid two">
                  <div className="field">
                    <label htmlFor="firstDay">First payment day</label>
                    <select
                      id="firstDay"
                      value={form.firstDay}
                      onChange={(event) => setForm((current) => ({ ...current, firstDay: event.target.value }))}
                    >
                      {paymentDayOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === 'month_end' ? 'Month end' : `${option}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="secondDay">Second payment day</label>
                    <select
                      id="secondDay"
                      value={form.secondDay}
                      onChange={(event) => setForm((current) => ({ ...current, secondDay: event.target.value }))}
                    >
                      {paymentDayOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === 'month_end' ? 'Month end' : `${option}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="field">
              <label htmlFor="monthlyDay">Monthly payment day</label>
              <select
                id="monthlyDay"
                value={form.firstDay}
                onChange={(event) => setForm((current) => ({ ...current, firstDay: event.target.value }))}
              >
                {paymentDayOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'month_end' ? 'Month end' : `${option}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="firstPaymentDate">First payment date</label>
            <input
              id="firstPaymentDate"
              type="date"
              value={form.firstPaymentDate}
              onChange={(event) => setForm((current) => ({ ...current, firstPaymentDate: event.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Optional notes for the borrower or agreement."
            />
          </div>

          <button className="button" type="submit">Generate schedule</button>
        </form>
      </section>

      <section className="card panel stack">
        <div>
          <div className="eyebrow">Borrower intake</div>
          <h2 className="section-title title-offset">Create a borrower record</h2>
          <p className="muted">Use the existing contacts entity in the API and assign the new loan immediately.</p>
        </div>

        {contactError ? <div className="notice danger">{contactError}</div> : null}

        <form className="stack" onSubmit={handleCreateContact}>
          <div className="grid two">
            <div className="field">
              <label htmlFor="borrowerFirstName">First name</label>
              <input
                id="borrowerFirstName"
                value={contactDraft.firstName}
                onChange={(event) => {
                  setContactError('')
                  setContactDraft((current) => ({ ...current, firstName: event.target.value }))
                }}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="borrowerLastName">Last name</label>
              <input
                id="borrowerLastName"
                value={contactDraft.lastName}
                onChange={(event) => {
                  setContactError('')
                  setContactDraft((current) => ({ ...current, lastName: event.target.value }))
                }}
                required
              />
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label htmlFor="borrowerEmail">Email</label>
              <input
                id="borrowerEmail"
                type="email"
                autoComplete="email"
                placeholder="julian@example.com"
                value={contactDraft.email}
                className={`loan-form__input${contactEmailHasFormatError ? ' loan-form__input--dirty' : ''}${contactEmailIsValid ? ' loan-form__input--valid' : ''}`}
                aria-invalid={contactEmailHasFormatError}
                onFocus={() => setContactEmailFocused(true)}
                onBlur={() => {
                  setContactEmailFocused(false)
                  setContactEmailTouched(true)
                }}
                onChange={(event) => {
                  setContactError('')
                  setContactDraft((current) => ({ ...current, email: event.target.value }))
                }}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="borrowerPhone">Phone</label>
              <input
                id="borrowerPhone"
                value={contactDraft.phone}
                onChange={(event) => {
                  setContactError('')
                  setContactDraft((current) => ({ ...current, phone: event.target.value }))
                }}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="borrowerNotes">Notes</label>
            <textarea
              id="borrowerNotes"
              value={contactDraft.notes}
              onChange={(event) => {
                setContactError('')
                setContactDraft((current) => ({ ...current, notes: event.target.value }))
              }}
            />
          </div>

          <button className="button-secondary" type="submit" disabled={creatingContact}>
            {creatingContact ? 'Saving borrower...' : 'Add borrower'}
          </button>
        </form>
      </section>
    </div>
  )
}
