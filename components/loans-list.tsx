'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/client-api'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { Loan } from '@/lib/types'

export function LoansList() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoans(await apiRequest<Loan[]>('/api/lendings'))
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load loans')
      }
    }

    void load()
  }, [])

  return (
    <div className="stack">
      <section className="card panel">
        <div className="row-between-center">
          <div>
            <div className="eyebrow">Loan roster</div>
            <h1 className="section-title title-offset">Issued loans</h1>
            <p className="muted">Borrowers, totals, schedules, and collection status.</p>
          </div>
          <Link href="/loans/new" className="button">Create loan</Link>
        </div>
      </section>

      {error ? <div className="notice danger">{error}</div> : null}

      <section className="card panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Schedule</th>
              <th>First payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan._id}>
                <td>
                  <Link href={`/loans/${loan._id}`} className="data-card__titleLink">
                    {loan.borrower?.fullName || 'Borrower'}
                  </Link>
                </td>
                <td>{formatCurrency(loan.principal, loan.currency)}</td>
                <td>{loan.interestRate}% / cutoff</td>
                <td>{loan.paymentDays.map(formatPaymentDay).join(' and ')}</td>
                <td>{formatDate(loan.firstPaymentDate)}</td>
                <td><span className={getStatusClassName(loan.status)}>{loan.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
