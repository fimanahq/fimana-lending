'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/client-api'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import type { Loan } from '@/lib/types'

export function LoanDetail({ loanId }: { loanId: string }) {
  const [loan, setLoan] = useState<Loan | null>(null)
  const [error, setError] = useState('')
  const [collectingId, setCollectingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoan(await apiRequest<Loan>(`/api/lendings/${loanId}`))
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan')
      }
    }

    void load()
  }, [loanId])

  const handleCollect = async (installmentId: string, amount: number) => {
    setCollectingId(installmentId)
    setError('')

    try {
      const updated = await apiRequest<Loan>(`/api/lendings/${loanId}/installments/${installmentId}/collect`, {
        method: 'PATCH',
        body: JSON.stringify({ paidAmount: amount }),
      })

      setLoan(updated)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to collect installment')
    } finally {
      setCollectingId(null)
    }
  }

  if (error) {
    return <div className="notice danger">{error}</div>
  }

  if (!loan) {
    return <div className="card panel muted">Loading loan details...</div>
  }

  return (
    <div className="stack">
      <section className="card panel">
        <div className="eyebrow">Loan detail</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.85rem' }}>
          <div>
            <h1 className="section-title">{loan.borrower?.fullName || 'Borrower'}</h1>
            <p className="muted">
              {loan.paymentFrequency === 'monthly'
                ? `Monthly on ${loan.paymentDays.map(formatPaymentDay).join(', ')}`
                : `Twice monthly on ${loan.paymentDays.map(formatPaymentDay).join(' and ')}`}
            </p>
            <p className="muted">First payment date: {formatDate(loan.firstPaymentDate)}</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className={`status-pill ${loan.status === 'completed' ? '' : 'pending'}`}>{loan.status}</div>
            <div style={{ marginTop: '0.6rem' }}>{formatCurrency(loan.totalPayment, loan.currency)} total</div>
          </div>
        </div>
      </section>

      <section className="summary-grid">
        <div className="card summary-stat">
          <span className="muted">Principal</span>
          <strong>{formatCurrency(loan.principal, loan.currency)}</strong>
        </div>
        <div className="card summary-stat">
          <span className="muted">Interest total</span>
          <strong>{formatCurrency(loan.totalInterest, loan.currency)}</strong>
        </div>
        <div className="card summary-stat">
          <span className="muted">Rate</span>
          <strong>{loan.interestRate}%</strong>
        </div>
      </section>

      <section className="grid two">
        <div className="card panel">
          <div className="section-title">Borrower profile</div>
          <div className="stack" style={{ marginTop: '0.9rem' }}>
            <div><strong>Email:</strong> {loan.borrower?.email || 'Not set'}</div>
            <div><strong>Phone:</strong> {loan.borrower?.phone || 'Not set'}</div>
            <div><strong>Notes:</strong> {loan.notes || 'No notes'}</div>
          </div>
        </div>

        <div className="card panel">
          <div className="section-title">Upcoming reminders</div>
          <div className="stack" style={{ marginTop: '0.9rem' }}>
            {loan.reminders.filter((reminder) => reminder.status === 'pending').map((reminder) => (
              <div key={reminder._id} className="card panel" style={{ boxShadow: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading), sans-serif' }}>
                      Installment #{reminder.installmentSequence}
                    </div>
                    <div className="muted">{formatDate(reminder.scheduledAt)} via {reminder.channel}</div>
                  </div>
                  <span className="status-pill pending">{reminder.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card panel">
        <div className="section-title">Loan schedule table</div>
        <div className="table-wrap" style={{ marginTop: '1rem' }}>
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
                <th>Collect</th>
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
                  <td><span className={`status-pill ${installment.status}`}>{installment.status}</span></td>
                  <td>
                    {installment.status === 'paid' ? (
                      <span className="muted">Collected</span>
                    ) : (
                      <button
                        className="button-ghost"
                        disabled={collectingId === installment._id}
                        onClick={() => handleCollect(installment._id, installment.totalPayment)}
                      >
                        {collectingId === installment._id ? 'Saving...' : 'Mark paid'}
                      </button>
                    )}
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
