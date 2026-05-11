'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  PageContainer,
  TableShell,
} from '@/components/shared'
import { BorrowerForm } from '@/components/borrowers/borrower-form'
import { formatCurrency, formatDate } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { Borrower, LoanRecord } from '@/lib/types'
import { getBorrower, listLoansByBorrowerId } from '@/services'

interface BorrowerProfileProps {
  borrowerId: string
}

function getBorrowerName(borrower: Borrower) {
  return borrower.fullName.trim() || 'Unnamed borrower'
}

function formatMinorCurrency(valueMinor: number, currency = 'PHP') {
  return formatCurrency(valueMinor / 100, currency)
}

function sumByCurrency(
  loans: LoanRecord[],
  selector: (loan: LoanRecord) => number,
) {
  return loans.reduce<Record<string, number>>((totals, loan) => {
    const currency = loan.loanProduct.currency || 'PHP'
    totals[currency] = (totals[currency] ?? 0) + selector(loan)
    return totals
  }, {})
}

function renderCurrencyTotals(totals: Record<string, number>) {
  return Object.entries(totals).map(([currency, amount]) => (
    <strong key={currency}>{formatMinorCurrency(amount, currency)}</strong>
  ))
}

export function BorrowerProfile({ borrowerId }: BorrowerProfileProps) {
  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [borrowerLoans, setBorrowerLoans] = useState<LoanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [borrowerRow, loanRows] = await Promise.all([
        getBorrower(borrowerId),
        listLoansByBorrowerId(borrowerId),
      ])

      setBorrower(borrowerRow)
      setBorrowerLoans(loanRows)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load borrower profile')
    } finally {
      setLoading(false)
    }
  }, [borrowerId])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  if (loading) {
    return (
      <PageContainer>
        <LoadingState title="Loading borrower profile" description="Fetching borrower details and loan history." />
      </PageContainer>
    )
  }

  if (error || !borrower) {
    return (
      <PageContainer>
        <ErrorState
          title="Unable to load borrower profile"
          description={error || 'Borrower record was not found.'}
          action={<Button variant="secondary" onClick={() => void loadProfile()}>Retry</Button>}
        />
      </PageContainer>
    )
  }

  const borrowerName = getBorrowerName(borrower)
  const activeLoans = borrowerLoans.filter((loan) => loan.status === 'active')
  const activeLoansCount = activeLoans.length
  const borrowerCurrency = borrowerLoans[0]?.loanProduct.currency || 'PHP'
  const principalTotals = sumByCurrency(borrowerLoans, (loan) => loan.principalAmountMinor)
  const collectedInterestTotals = sumByCurrency(borrowerLoans, (loan) => loan.balances.interestPaidAmountMinor)
  const projectedInterestTotals = sumByCurrency(activeLoans, (loan) => loan.totalInterestAmountMinor)
  const outstandingTotals = sumByCurrency(borrowerLoans, (loan) => loan.balances.totalOutstandingAmountMinor)

  return (
    <PageContainer>
      <div className="inline-actions">
        <Link href="/borrowers" className="button-secondary">Back to borrowers</Link>
        <Link href="/loan-applications/new" className="button">New application</Link>
      </div>

      {message ? <div className="notice">{message}</div> : null}

      <div className="borrower-profile-grid">
        <Card
          title="Profile"
          description="Borrower contact details used by lending workflows."
          actions={<Badge tone={borrower.status === 'active' ? 'success' : 'warning'}>{borrower.status}</Badge>}
        >
          <dl className="borrower-detail-list">
            <div>
              <dt>Borrower number</dt>
              <dd>{borrower.borrowerNumber}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{borrower.email || 'Not set'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{borrower.contactNumber || 'Not set'}</dd>
            </div>
            <div>
              <dt>Monthly Income</dt>
              <dd>{borrower.income !== null ? formatCurrency(borrower.income, borrowerCurrency) : 'Not set'}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{borrower.notes || 'No notes'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Edit borrower" description="Update borrower details without changing loan contracts.">
          <BorrowerForm
            mode="edit"
            borrower={borrower}
            onSaved={(updated) => {
              setBorrower(updated)
              setMessage('Borrower profile updated.')
            }}
          />
        </Card>
      </div>

      <Card title="Loan history" description={`${borrowerName} lending activity.`}>
        {borrowerLoans.length === 0 ? (
          <p className="muted">No issued loans yet.</p>
        ) : (
          <div className="stack">
            <section className="borrower-summary-grid" aria-label={`${borrowerName} loan history summary`}>
              <Card className="borrower-summary-card" title="Loans">
                <strong>{borrowerLoans.length}</strong>
                <span className="muted">{activeLoansCount} active</span>
              </Card>
              <Card className="borrower-summary-card" title="Principal issued">
                {renderCurrencyTotals(principalTotals)}
                <span className="muted">Across all borrower loans</span>
              </Card>
              <Card className="borrower-summary-card" title="Collected interest">
                {renderCurrencyTotals(collectedInterestTotals)}
                <span className="muted">Paid interest on all loans</span>
              </Card>
              <Card className="borrower-summary-card" title="Projected interest">
                {renderCurrencyTotals(projectedInterestTotals)}
                <span className="muted">Expected interest on active loans only</span>
              </Card>
              <Card className="borrower-summary-card" title="Outstanding balance">
                {renderCurrencyTotals(outstandingTotals)}
                <span className="muted">Remaining borrower exposure</span>
              </Card>
            </section>

            <TableShell label={`${borrowerName} loan history`}>
              <table>
                <thead>
                  <tr>
                    <th>Loan</th>
                    <th>Principal</th>
                    <th>Projected interest</th>
                    <th>Interest collected</th>
                    <th>Total paid</th>
                    <th>Outstanding</th>
                    <th>Next due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowerLoans.map((loan, index) => (
                    <tr key={`${loan.id ?? loan.loanNumber ?? 'loan'}-${loan.createdAt}-${index}`}>
                      <td>
                        <Link href={`/loans/${loan.id}`} className="data-card__titleLink">{loan.loanNumber}</Link>
                        <div className="muted micro-copy">Issued {formatDate(loan.createdAt)}</div>
                      </td>
                      <td>{formatMinorCurrency(loan.principalAmountMinor, loan.loanProduct.currency)}</td>
                      <td>{formatMinorCurrency(loan.totalInterestAmountMinor, loan.loanProduct.currency)}</td>
                      <td>{formatMinorCurrency(loan.balances.interestPaidAmountMinor, loan.loanProduct.currency)}</td>
                      <td>{formatMinorCurrency(loan.balances.totalPaidAmountMinor, loan.loanProduct.currency)}</td>
                      <td>{formatMinorCurrency(loan.balances.totalOutstandingAmountMinor, loan.loanProduct.currency)}</td>
                      <td>{loan.nextDueDate ? formatDate(loan.nextDueDate) : 'Complete'}</td>
                      <td><span className={getStatusClassName(loan.status)}>{loan.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </div>
        )}
      </Card>
    </PageContainer>
  )
}
