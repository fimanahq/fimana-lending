'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { formatCurrency } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { Loan } from '@/lib/types'
import { deleteLoan, listLoans } from '@/services'

type LoansListScope = 'active' | 'all'

interface LoansListProps {
  scope?: LoansListScope
}

export function LoansList({ scope = 'all' }: LoansListProps) {
  const router = useRouter()
  const [loans, setLoans] = useState<Loan[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const visibleLoans = scope === 'active' ? loans.filter((loan) => loan.status === 'active') : loans

  useEffect(() => {
    const load = async () => {
      try {
        setLoans(await listLoans())
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load loans')
      }
    }

    void load()
  }, [])

  const openLoanDetail = (loanId: string) => {
    router.push(`/loans/${loanId}`)
  }

  const stopRowNavigation = (event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  const handleDelete = async (loan: Loan, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    const borrowerName = loan.borrower?.fullName || 'this borrower'
    const confirmed = window.confirm(`Delete the issued loan for ${borrowerName}? This cannot be undone.`)

    if (!confirmed) {
      return
    }

    setDeletingId(loan._id)
    setError('')
    setMessage('')

    try {
      await deleteLoan(loan._id)

      setLoans((current) => current.filter((currentLoan) => currentLoan._id !== loan._id))
      setMessage(`Deleted the loan for ${borrowerName}.`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to delete loan')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="stack">
      <section className="card panel">
        <div className="row-between-center">
          <div>
            <div className="eyebrow">Loan roster</div>
            <h1 className="section-title title-offset">
              {scope === 'active' ? 'Active loans' : 'Issued loans'}
            </h1>
            <p className="muted">
              {scope === 'active'
                ? 'Open borrower obligations, totals, schedules, and collection status.'
                : 'Borrowers, totals, schedules, and collection status.'}
            </p>
          </div>
          <Link href="/loans/new" className="button">Create loan</Link>
        </div>
      </section>

      {message ? <div className="notice">{message}</div> : null}
      {error ? <div className="notice danger">{error}</div> : null}

      <section className="card panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Principal</th>
              <th>Interest Rate</th>
              <th>Total Interest</th>
              <th>Total Payment</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleLoans.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  {scope === 'active' ? 'No active loans yet.' : 'No issued loans yet.'}
                </td>
              </tr>
            ) : (
              visibleLoans.map((loan) => (
                <tr
                  key={loan._id}
                  className="table-row-link"
                  tabIndex={0}
                  role="link"
                  aria-label={`Open loan details for ${loan.borrower?.fullName || 'Borrower'}`}
                  onClick={() => openLoanDetail(loan._id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openLoanDetail(loan._id)
                    }
                  }}
                >
                  <td>
                    <span className="data-card__titleLink">
                      {loan.borrower?.fullName || 'Borrower'}
                    </span>
                  </td>
                  <td>{formatCurrency(loan.principal, loan.currency)}</td>
                  <td>{loan.interestRate}% / cutoff</td>
                  <td>{formatCurrency(loan.totalInterest, loan.currency)}</td>
                  <td>{formatCurrency(loan.totalPayment, loan.currency)}</td>
                  <td><span className={getStatusClassName(loan.status)}>{loan.status}</span></td>
                  <td className="loans-list__actionCell">
                    <button
                      type="button"
                      className="button-ghost loans-list__deleteButton"
                      disabled={deletingId === loan._id}
                      onClick={(event) => void handleDelete(loan, event)}
                      onKeyDown={stopRowNavigation}
                      aria-label={`Delete loan for ${loan.borrower?.fullName || 'Borrower'}`}
                    >
                      {deletingId === loan._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
