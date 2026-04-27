'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { Loan } from '@/lib/types'
import { collectLoanInstallment, getLoan, updateLoanInstallmentPayment } from '@/services'

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

export function LoanDetail({ loanId }: { loanId: string }) {
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
        setLoan(await getLoan(loanId))
      } catch (caughtError) {
        setLoadError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan')
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
      const updated = await collectLoanInstallment(loanId, installmentId, {
        paidAmount: amount,
        ...(paymentDate ? { paidAt: toInstallmentDateISOString(paymentDate) } : {}),
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
      const updated = await updateLoanInstallmentPayment(loanId, installmentId, {
        totalPayment: parsedAmount,
        ...(paymentDate ? { paidAt: toInstallmentDateISOString(paymentDate) } : {}),
      })

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
    return <div className="card panel muted">Loading loan details...</div>
  }

  return (
    <div className="stack">
      {actionError ? <div className="notice danger">{actionError}</div> : null}
      {actionMessage ? <div className="notice">{actionMessage}</div> : null}

      <section className="card panel">
        <div className="row-between-start title-offset">
          <div>
            <h1 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{loan.borrower?.fullName || 'Borrower'}</h1>
            <div style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
              <div><strong>Email:</strong> {loan.borrower?.email || 'Not set'}</div>
              <div><strong>Phone:</strong> {loan.borrower?.phone || 'Not set'}</div>
            </div>
          </div>

          <div className="text-right">
            <div className={getStatusClassName(loan.status)} style={{ fontSize: '0.875rem' }}>{loan.status}</div>
            <div className="detail-offset" style={{ fontSize: '1rem', marginTop: '0.25rem' }}>{formatCurrency(loan.totalPayment, loan.currency)}</div>
          </div>
        </div>
      </section>

      <section className="summary-grid" style={{ gap: '1rem' }}>
        <div className="card summary-stat" style={{ padding: '1rem' }}>
          <span className="muted" style={{ fontSize: '0.75rem' }}>Principal</span>
          <strong style={{ fontSize: '1.25rem' }}>{formatCurrency(loan.principal, loan.currency)}</strong>
        </div>
        <div className="card summary-stat" style={{ padding: '1rem' }}>
          <span className="muted" style={{ fontSize: '0.75rem' }}>Interest</span>
          <strong style={{ fontSize: '1.25rem' }}>{formatCurrency(loan.totalInterest, loan.currency)}</strong>
        </div>
        <div className="card summary-stat" style={{ padding: '1rem' }}>
          <span className="muted" style={{ fontSize: '0.75rem' }}>Rate</span>
          <strong style={{ fontSize: '1.25rem' }}>{loan.interestRate}%</strong>
        </div>
      </section>

      <section className="card panel">
        <div className="row-between-start title-offset-sm">
          <div>
            <div className="section-title" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Loan schedule</div>
            <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>Updates and full schedule available</p>
          </div>
          <Link href={`/loans/${loanId}/schedule`} className="button-ghost" style={{ fontSize: '0.875rem' }}>
            Full schedule
          </Link>
        </div>

        <div className="table-wrap table-offset" style={{ marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Cutoff</th>
                <th>Status</th>
                <th>Total Payment</th>
                <th>Payment Date</th>
                <th>Payment Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loan.installments.map((installment) => (
                <tr key={installment._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>#{installment.sequence}</span>
                      <span className="muted">{formatDate(installment.dueDate)}</span>
                    </div>
                  </td>
                  <td>
                    <span className={getStatusClassName(installment.status)}>{installment.status}</span>
                  </td>
                  <td>{formatCurrency(installment.totalPayment, loan.currency)}</td>
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

      <section className="grid two" style={{ gap: '1rem', marginTop: '1.5rem' }}>
        <div className="card panel" style={{ padding: '1rem' }}>
          <div className="section-title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Loan notes</div>
          <div style={{ fontSize: '0.875rem' }}>
            <div>{loan.notes || 'No notes'}</div>
          </div>
        </div>

        <div className="card panel" style={{ padding: '1rem' }}>
          <div className="section-title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Reminders</div>
          <div style={{ fontSize: '0.875rem' }}>
            {loan.reminders.filter((reminder) => reminder.status === 'pending').map((reminder) => (
              <div key={reminder._id} className="data-card" style={{ marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
                <div className="row-between-start">
                  <div>
                    <div className="data-card__title" style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                      #{ reminder.installmentSequence}
                    </div>
                    <div className="muted" style={{ fontSize: '0.75rem' }}>{formatDate(reminder.scheduledAt)} via {reminder.channel}</div>
                  </div>
                  <span className={getStatusClassName(reminder.status)} style={{ fontSize: '0.75rem' }}>{reminder.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
