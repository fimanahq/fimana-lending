'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/client-api'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { Loan } from '@/lib/types'

function toDateInputValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

function toInstallmentDateISOString(value: string) {
  return new Date(`${value}T12:00:00.000Z`).toISOString()
}

export function LoanScheduleDetail({ loanId }: { loanId: string }) {
  const [loan, setLoan] = useState<Loan | null>(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [collectingId, setCollectingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [paymentDateDrafts, setPaymentDateDrafts] = useState<Record<string, string>>({})
  const [paymentAmountDrafts, setPaymentAmountDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      try {
        setLoan(await apiRequest<Loan>(`/api/lendings/${loanId}`))
      } catch (caughtError) {
        setLoadError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan schedule')
      }
    }

    void load()
  }, [loanId])

  useEffect(() => {
    if (!loan) {
      return
    }

    setPaymentDateDrafts(
      Object.fromEntries(
        loan.installments.map((installment) => [installment._id, toDateInputValue(installment.paidAt)]),
      ),
    )

    setPaymentAmountDrafts(
      Object.fromEntries(
        loan.installments.map((installment) => [installment._id, String(installment.totalPayment)]),
      ),
    )
  }, [loan])

  const handleCollect = async (installmentId: string, amount: number) => {
    const paymentDate = paymentDateDrafts[installmentId]

    setCollectingId(installmentId)
    setActionError('')
    setActionMessage('')

    try {
      const updated = await apiRequest<Loan>(`/api/lendings/${loanId}/installments/${installmentId}/collect`, {
        method: 'PATCH',
        body: JSON.stringify({
          paidAmount: amount,
          ...(paymentDate ? { paidAt: toInstallmentDateISOString(paymentDate) } : {}),
        }),
      })

      setLoan(updated)
      setActionMessage('Installment collection updated.')
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to collect installment')
    } finally {
      setCollectingId(null)
    }
  }

  const handleSave = async (installmentId: string) => {
    if (!loan) {
      return
    }

    const installment = loan.installments.find((row) => row._id === installmentId)
    const paymentDate = paymentDateDrafts[installmentId]
    const newAmount = paymentAmountDrafts[installmentId]

    if (!installment) {
      return
    }

    const parsedAmount = Number(newAmount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setActionError('Payment amount must be a valid positive number')
      return
    }

    setSavingId(installmentId)
    setActionError('')
    setActionMessage('')

    try {
      const updated = await apiRequest<Loan>(
        `/api/lendings/${loanId}/installments/${installmentId}/update-amount`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            totalPayment: parsedAmount,
            ...(paymentDate ? { paidAt: toInstallmentDateISOString(paymentDate) } : {}),
          }),
        },
      )

      setLoan(updated)
      setActionMessage(`Payment saved for installment #${installment.sequence}.`)
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to save payment')
      // Restore the original amount on error
      setPaymentAmountDrafts((current) => ({
        ...current,
        [installmentId]: String(installment.totalPayment),
      }))
    } finally {
      setSavingId(null)
    }
  }

  if (loadError) {
    return <div className="notice danger">{loadError}</div>
  }

  if (!loan) {
    return <div className="card panel muted">Loading loan schedule...</div>
  }

  return (
    <div className="stack">
      {actionError ? <div className="notice danger">{actionError}</div> : null}
      {actionMessage ? <div className="notice">{actionMessage}</div> : null}

      <section className="card panel">
        <div className="row-between-start title-offset-sm">
          <div>
            <div className="eyebrow">Schedule detail</div>
            <h1 className="section-title title-offset">{loan.borrower?.fullName || 'Borrower'} loan schedule</h1>
            <p className="muted">
              {loan.paymentFrequency === 'monthly'
                ? `Monthly on ${loan.paymentDays.map(formatPaymentDay).join(', ')}`
                : `Twice monthly on ${loan.paymentDays.map(formatPaymentDay).join(' and ')}`}
            </p>
          </div>
          <div className="inline-actions">
            <Link href={`/loans/${loanId}`} className="button-ghost">Back to loan detail</Link>
          </div>
        </div>
      </section>

      <section className="card panel">
        <div className="section-title">Loan schedule details</div>
        <p className="muted">Generated cutoff dates stay fixed here. Use payment date to capture when the borrower actually paid.</p>

        <div className="table-wrap table-offset">
          <table>
            <thead>
              <tr>
                <th>Cutoff</th>
                <th>Beginning Balance</th>
                <th>Interest</th>
                <th>Principal Paid</th>
                <th>Ending Balance</th>
                <th>Total Payment</th>
                <th>Status</th>
                <th>Payment Date</th>
                <th>Payment Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loan.installments.map((installment) => (
                <tr key={installment._id}>
                  <td>
                    #{installment.sequence}
                    <div className="muted">{formatDate(installment.dueDate)}</div>
                  </td>
                  <td>{formatCurrency(installment.beginningBalance, loan.currency)}</td>
                  <td>{formatCurrency(installment.interest, loan.currency)}</td>
                  <td>{formatCurrency(installment.principalPaid, loan.currency)}</td>
                  <td>{formatCurrency(installment.endingBalance, loan.currency)}</td>
                  <td>{formatCurrency(installment.totalPayment, loan.currency)}</td>
                  <td>
                    <span className={getStatusClassName(installment.status)}>{installment.status}</span>
                  </td>
                  <td className="loan-schedule__dateCell">
                    <input
                      className="loan-schedule__dateInput"
                      type="date"
                      value={paymentDateDrafts[installment._id] || ''}
                      onChange={(event) =>
                        setPaymentDateDrafts((current) => ({
                          ...current,
                          [installment._id]: event.target.value,
                        }))
                      }
                      disabled={savingId === installment._id}
                      aria-label={`Payment date for installment ${installment.sequence}`}
                    />
                    <div className="loan-schedule__dateMeta muted">
                      {paymentDateDrafts[installment._id] ? 'Actual payment date' : 'Not paid yet'}
                    </div>
                  </td>
                  <td className="loan-schedule__amountCell">
                    <input
                      className="loan-schedule__amountInput"
                      type="number"
                      step="0.01"
                      value={paymentAmountDrafts[installment._id] || ''}
                      onChange={(event) =>
                        setPaymentAmountDrafts((current) => ({
                          ...current,
                          [installment._id]: event.target.value,
                        }))
                      }
                      disabled={savingId === installment._id}
                      aria-label={`Payment amount for installment ${installment.sequence}`}
                    />
                    <div className="loan-schedule__amountMeta muted">
                      {loan.currency}
                    </div>
                  </td>
                  <td className="loan-schedule__actionCell">
                    <div className="loan-schedule__actions">
                      <button
                        type="button"
                        className="button-ghost loan-schedule__iconButton"
                        disabled={
                          savingId === installment._id
                          || (paymentDateDrafts[installment._id] === toDateInputValue(installment.paidAt)
                          && String(installment.totalPayment) === paymentAmountDrafts[installment._id])
                        }
                        onClick={() => handleSave(installment._id)}
                        title={savingId === installment._id ? 'Saving...' : 'Save'}
                        aria-label={`Save payment for installment ${installment.sequence}`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                          <polyline points="17 21 17 13 7 13 7 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                          <polyline points="7 3 7 8 15 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {installment.status === 'paid' ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="loan-schedule__collectedIcon">
                          <path
                            d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <polyline points="22 4 12 14.01 9 11.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <button
                          type="button"
                          className="button-ghost loan-schedule__iconButton"
                          disabled={collectingId === installment._id}
                          onClick={() => handleCollect(installment._id, installment.totalPayment)}
                          title={collectingId === installment._id ? 'Saving...' : 'Mark paid'}
                          aria-label={`Mark installment ${installment.sequence} as paid`}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="1" fill="currentColor" />
                            <path d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22z" fill="none" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M12 5v7l4 2.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
