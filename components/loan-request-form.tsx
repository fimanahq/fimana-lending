'use client'

import { useMemo, useState } from 'react'
import { buildPaymentDays, paymentDayOptions } from '@/lib/loan-schedule'
import { apiRequest } from '@/lib/client-api'
import type { LoanRequest, LoanSchedulePreset, PaymentFrequency } from '@/lib/types'

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  principal: '5000',
  gives: '2',
  paymentFrequency: 'twice_monthly' as PaymentFrequency,
  firstDay: '15',
  secondDay: 'month_end',
  paymentPreset: '15_month_end' as LoanSchedulePreset,
  firstPaymentDate: '',
  notes: '',
}

export function LoanRequestForm() {
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<LoanRequest | null>(null)

  const paymentDays = useMemo(
    () => buildPaymentDays(form.paymentFrequency, form.firstDay, form.secondDay, form.paymentPreset),
    [form.firstDay, form.paymentFrequency, form.paymentPreset, form.secondDay],
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess(null)

    try {
      const created = await apiRequest<LoanRequest>('/api/loan-requests', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          principal: Number(form.principal),
          gives: Number(form.gives),
          paymentDays,
        }),
      })

      setSuccess(created)
      setForm(initialForm)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="request-loan-form" onSubmit={handleSubmit}>
      <div className="request-loan-form__grid">
        <div className="request-loan-form__field">
          <label htmlFor="requestFirstName">First name</label>
          <input
            id="requestFirstName"
            autoComplete="given-name"
            value={form.firstName}
            onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
            required
          />
        </div>
        <div className="request-loan-form__field">
          <label htmlFor="requestLastName">Last name</label>
          <input
            id="requestLastName"
            autoComplete="family-name"
            value={form.lastName}
            onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
            required
          />
        </div>
      </div>

      <div className="request-loan-form__grid">
        <div className="request-loan-form__field">
          <label htmlFor="requestEmail">Email</label>
          <input
            id="requestEmail"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </div>
        <div className="request-loan-form__field">
          <label htmlFor="requestPhone">Phone</label>
          <input
            id="requestPhone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
        </div>
      </div>

      <div className="request-loan-form__grid">
        <div className="request-loan-form__field">
          <label htmlFor="requestPrincipal">Requested amount</label>
          <input
            id="requestPrincipal"
            type="number"
            min="1"
            inputMode="decimal"
            value={form.principal}
            onChange={(event) => setForm((current) => ({ ...current, principal: event.target.value }))}
            required
          />
        </div>
        <div className="request-loan-form__field">
          <label htmlFor="requestGives">Number of gives</label>
          <input
            id="requestGives"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={form.gives}
            onChange={(event) => setForm((current) => ({ ...current, gives: event.target.value }))}
            required
          />
        </div>
      </div>

      <div className="request-loan-form__field">
        <label htmlFor="requestFrequency">Payment frequency</label>
        <select
          id="requestFrequency"
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
        <p className="request-loan-form__hint">Choose how often you expect to make payments.</p>
      </div>

      {form.paymentFrequency === 'twice_monthly' ? (
        <>
          <div className="request-loan-form__field">
            <label htmlFor="requestPreset">Schedule preset</label>
            <select
              id="requestPreset"
              value={form.paymentPreset}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  paymentPreset: event.target.value as LoanSchedulePreset,
                }))
              }
            >
              <option value="15_month_end">15th + month end</option>
              <option value="5_20">5th + 20th</option>
              <option value="custom">Custom dates</option>
            </select>
          </div>

          {form.paymentPreset === 'custom' ? (
            <div className="request-loan-form__grid">
              <div className="request-loan-form__field">
                <label htmlFor="requestFirstDay">First payment day</label>
                <select
                  id="requestFirstDay"
                  value={form.firstDay}
                  onChange={(event) => setForm((current) => ({ ...current, firstDay: event.target.value }))}
                >
                  {paymentDayOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'month_end' ? 'Month end' : option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="request-loan-form__field">
                <label htmlFor="requestSecondDay">Second payment day</label>
                <select
                  id="requestSecondDay"
                  value={form.secondDay}
                  onChange={(event) => setForm((current) => ({ ...current, secondDay: event.target.value }))}
                >
                  {paymentDayOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'month_end' ? 'Month end' : option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="request-loan-form__field">
          <label htmlFor="requestMonthlyDay">Monthly payment day</label>
          <select
            id="requestMonthlyDay"
            value={form.firstDay}
            onChange={(event) => setForm((current) => ({ ...current, firstDay: event.target.value }))}
          >
            {paymentDayOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'month_end' ? 'Month end' : option}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="request-loan-form__field">
        <label htmlFor="requestFirstPaymentDate">Preferred first payment date</label>
        <input
          id="requestFirstPaymentDate"
          type="date"
          value={form.firstPaymentDate}
          onChange={(event) => setForm((current) => ({ ...current, firstPaymentDate: event.target.value }))}
          required
        />
      </div>

      <div className="request-loan-form__field">
        <label htmlFor="requestNotes">Notes</label>
        <textarea
          id="requestNotes"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Tell the lender anything important about your request."
        />
      </div>

      <div className="request-loan-form__summary">
        <span className="request-loan-form__summaryLabel">Estimated cadence</span>
        <strong>{paymentDays.map((day) => (day === 'month_end' ? 'month end' : day)).join(' + ')}</strong>
        <p>Provide at least one contact method so the lender can follow up on your request.</p>
      </div>

      {error ? <div className="notice danger request-loan-form__notice">{error}</div> : null}
      {success ? (
        <div className="notice request-loan-form__notice">
          Request submitted for {success.firstName} {success.lastName}. Reference: {success.id}
        </div>
      ) : null}

      <button className="request-loan-form__submit" type="submit" disabled={submitting}>
        {submitting ? 'Submitting request...' : 'Submit request'}
      </button>
    </form>
  )
}
