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
  const [savingDateId, setSavingDateId] = useState<string | null>(null)
  const [paymentDateDrafts, setPaymentDateDrafts] = useState<Record<string, string>>({})

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

  const handlePaymentDateSave = async (installmentId: string) => {
    if (!loan) {
      return
    }

    const installment = loan.installments.find((row) => row._id === installmentId)
    const paymentDate = paymentDateDrafts[installmentId]

    if (!installment) {
      return
    }

    setSavingDateId(installmentId)
    setActionError('')
    setActionMessage('')

    try {
      const updated = await apiRequest<Loan>(`/api/lendings/${loanId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          installments: loan.installments.map((row) =>
            row._id === installmentId
              ? {
                ...row,
                paidAt: paymentDate ? toInstallmentDateISOString(paymentDate) : null,
              }
              : row,
          ),
        }),
      })

      setLoan(updated)
      setActionMessage(
        paymentDate
          ? `Payment date updated for installment #${installment.sequence}.`
          : `Payment date cleared for installment #${installment.sequence}.`,
      )
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to update payment date')
    } finally {
      setSavingDateId(null)
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
                      disabled={savingDateId === installment._id}
                      aria-label={`Payment date for installment ${installment.sequence}`}
                    />
                    <div className="loan-schedule__dateMeta muted">
                      {paymentDateDrafts[installment._id] ? 'Actual payment date' : 'Not paid yet'}
                    </div>
                  </td>
                  <td className="loan-schedule__actionCell">
                    <div className="loan-schedule__actions">
                      <button
                        type="button"
                        className="button-ghost loan-schedule__saveButton"
                        disabled={
                          savingDateId === installment._id
                          || paymentDateDrafts[installment._id] === toDateInputValue(installment.paidAt)
                        }
                        onClick={() => handlePaymentDateSave(installment._id)}
                      >
                        {savingDateId === installment._id ? 'Saving...' : 'Save date'}
                      </button>
                      {installment.status === 'paid' ? (
                        <span className="muted">Collected</span>
                      ) : (
                        <button
                          type="button"
                          className="button-ghost"
                          disabled={collectingId === installment._id}
                          onClick={() => handleCollect(installment._id, installment.totalPayment)}
                        >
                          {collectingId === installment._id ? 'Saving...' : 'Mark paid'}
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
