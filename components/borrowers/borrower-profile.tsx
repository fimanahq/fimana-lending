'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Dialog,
  ErrorState,
  LoadingState,
  PageContainer,
  ProtectedLink as Link,
  TableShell,
} from '@/components/shared'
import { BorrowerForm } from '@/components/borrowers/borrower-form'
import { EditIcon } from '@/components/shared/table-icons'
import { formatCurrency, formatDate } from '@/lib/format'
import { buildLoanDetailPath } from '@/lib/loan-navigation'
import { getStatusClassName } from '@/lib/status'
import type { Borrower, LoanRecord, LoanStatus } from '@/lib/types/lending'
import { getBorrower, listLoansByBorrowerId } from '@/services'
import borrowerStyles from './borrowers.module.css'

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

function hasPositiveCurrencyTotal(totals: Record<string, number>) {
  return Object.values(totals).some((amount) => amount > 0)
}

function formatLoanStatus(status: LoanStatus) {
  return status.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}

function formatLoanNextDue(loan: LoanRecord) {
  if (loan.status === 'completed') {
    return 'Completed'
  }

  if (loan.status === 'defaulted') {
    return 'Defaulted'
  }

  if (loan.nextDueDate) {
    return formatDate(loan.nextDueDate)
  }

  return 'Not scheduled'
}

function getCollectedProfitAmountMinor(loan: LoanRecord) {
  return loan.balances.interestPaidAmountMinor + (loan.balances.penaltyPaidAmountMinor ?? 0)
}

function getDefaultLossAmountMinor(loan: LoanRecord) {
  return loan.status === 'defaulted' ? loan.lossAmountMinor ?? loan.balances.principalOutstandingAmountMinor : 0
}

function getNetDefaultLossAmountMinor(loan: LoanRecord) {
  if (loan.status !== 'defaulted') {
    return 0
  }

  return Math.max(0, getDefaultLossAmountMinor(loan) - getCollectedProfitAmountMinor(loan))
}

export function BorrowerProfile({ borrowerId }: BorrowerProfileProps) {
  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [borrowerLoans, setBorrowerLoans] = useState<LoanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)

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
  const defaultedLoans = borrowerLoans.filter((loan) => loan.status === 'defaulted')
  const activeLoansCount = activeLoans.length
  const hasDefaultedLoans = defaultedLoans.length > 0
  const borrowerCurrency = borrowerLoans[0]?.loanProduct.currency || 'PHP'
  const principalTotals = sumByCurrency(borrowerLoans, (loan) => loan.principalAmountMinor)
  const collectedProfitTotals = sumByCurrency(borrowerLoans, getCollectedProfitAmountMinor)
  const defaultedPrincipalTotals = sumByCurrency(defaultedLoans, getDefaultLossAmountMinor)
  const netDefaultLossTotals = sumByCurrency(defaultedLoans, getNetDefaultLossAmountMinor)
  const netCollectedProfitTotals = Object.fromEntries(
    Object.entries(collectedProfitTotals).map(([currency, collectedProfitMinor]) => [
      currency,
      collectedProfitMinor - (defaultedPrincipalTotals[currency] ?? 0),
    ]),
  )
  const projectedProfitTotals = sumByCurrency(activeLoans, (loan) => loan.totalProfitAmountMinor ?? loan.totalInterestAmountMinor)
  const showProjectedProfit = hasPositiveCurrencyTotal(projectedProfitTotals)
  const outstandingTotals = sumByCurrency(borrowerLoans, (loan) => loan.balances.totalOutstandingAmountMinor)

  return (
    <PageContainer>
      <div className="inline-actions">
        <Link href="/borrowers" className="button-secondary">Back to borrowers</Link>
        <Link href="/loan-applications/new" className="button">New application</Link>
      </div>
      <div className={borrowerStyles.profileGrid}>
        <Card
          title="Borrower Profile"
          actions={(
            <div className="inline-actions">
              <Badge tone={borrower.status === 'active' ? 'success' : 'warning'}>{borrower.status}</Badge>
              {hasDefaultedLoans ? (
                <Badge tone="danger">
                  {defaultedLoans.length} defaulted loan{defaultedLoans.length === 1 ? '' : 's'}
                </Badge>
              ) : null}
              <button
                type="button"
                className="button-ghost table-action-icon"
                aria-label={`Edit borrower ${borrowerName}`}
                title="Edit borrower"
                onClick={() => setEditDialogOpen(true)}
              >
                <EditIcon />
              </button>
            </div>
          )}
        >
          <div className={borrowerStyles.profileCard}>
            <div className={borrowerStyles.hero}>
              <h2 className={borrowerStyles.name}>{borrowerName}</h2>
            </div>

            <div className={borrowerStyles.facts}>
              <div className={borrowerStyles.fact}>
                <span>Borrower Number</span>
                <strong>{borrower.borrowerNumber}</strong>
              </div>
              <div className={borrowerStyles.fact}>
                <span>Email</span>
                <strong>{borrower.email || 'Not set'}</strong>
              </div>
              <div className={borrowerStyles.fact}>
                <span>Phone</span>
                <strong>{borrower.contactNumber || 'Not set'}</strong>
              </div>
              <div className={borrowerStyles.fact}>
                <span>Monthly Income</span>
                <strong>{borrower.income !== null ? formatCurrency(borrower.income, borrowerCurrency) : 'Not set'}</strong>
              </div>
            </div>

            <div className={borrowerStyles.notes}>
              <span>Notes</span>
              <p>{borrower.notes || 'No notes recorded for this borrower yet.'}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Loan history" description={`${borrowerName} lending activity.`}>
        {borrowerLoans.length === 0 ? (
          <p className="muted">No issued loans yet.</p>
        ) : (
          <div className="stack">
            <section className={borrowerStyles.summaryGrid} aria-label={`${borrowerName} loan history summary`}>
              <Card className={borrowerStyles.summaryCard} title="Loans">
                <strong>{borrowerLoans.length}</strong>
                <span className="muted">{activeLoansCount} active</span>
              </Card>
              <Card className={borrowerStyles.summaryCard} title="Principal issued">
                {renderCurrencyTotals(principalTotals)}
                <span className="muted">Across all borrower loans</span>
              </Card>
              <Card className={borrowerStyles.summaryCard} title="Collected profit">
                {renderCurrencyTotals(collectedProfitTotals)}
                <span className="muted">Paid interest and penalties; not reduced by write-offs</span>
              </Card>
              {hasDefaultedLoans ? (
                <>
                  <Card className={borrowerStyles.summaryCard} title="Net collected profit">
                    {renderCurrencyTotals(netCollectedProfitTotals)}
                    <span className="muted">Collected profit less defaulted principal</span>
                  </Card>
                  <Card className={borrowerStyles.summaryCard} title="Net default loss">
                    {renderCurrencyTotals(netDefaultLossTotals)}
                    <span className="muted">Defaulted principal less profit collected on defaulted loans</span>
                  </Card>
                </>
              ) : null}
              {showProjectedProfit ? (
                <Card className={borrowerStyles.summaryCard} title="Projected profit">
                  {renderCurrencyTotals(projectedProfitTotals)}
                  <span className="muted">Expected interest and penalties on active loans only</span>
                </Card>
              ) : null}
              <Card className={borrowerStyles.summaryCard} title="Outstanding balance">
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
                    <th>Projected profit</th>
                    <th>Profit collected</th>
                    {hasDefaultedLoans ? <th>Net default loss</th> : null}
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
                        <Link
                          href={buildLoanDetailPath(loan.id, `/borrowers/${borrowerId}`)}
                          className="data-card__titleLink"
                        >
                          {loan.loanNumber}
                        </Link>
                        <div className="muted micro-copy">Issued {formatDate(loan.createdAt)}</div>
                      </td>
                      <td>{formatMinorCurrency(loan.principalAmountMinor, loan.loanProduct.currency)}</td>
                      <td>{formatMinorCurrency(loan.totalProfitAmountMinor ?? loan.totalInterestAmountMinor, loan.loanProduct.currency)}</td>
                      <td>{formatMinorCurrency(getCollectedProfitAmountMinor(loan), loan.loanProduct.currency)}</td>
                      {hasDefaultedLoans ? (
                        <td>{loan.status === 'defaulted' ? formatMinorCurrency(getNetDefaultLossAmountMinor(loan), loan.loanProduct.currency) : '-'}</td>
                      ) : null}
                      <td>{formatMinorCurrency(loan.balances.totalPaidAmountMinor, loan.loanProduct.currency)}</td>
                      <td>{formatMinorCurrency(loan.balances.totalOutstandingAmountMinor, loan.loanProduct.currency)}</td>
                      <td>{formatLoanNextDue(loan)}</td>
                      <td><span className={getStatusClassName(loan.status)}>{formatLoanStatus(loan.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </div>
        )}
      </Card>

      <Dialog
        open={editDialogOpen}
        title="Edit borrower"
        description="Update borrower details without changing loan contracts."
        className={borrowerStyles.editDialog}
        onClose={() => setEditDialogOpen(false)}
      >
        <BorrowerForm
          mode="edit"
          borrower={borrower}
          onSaved={(updated) => {
            setBorrower(updated)
            setEditDialogOpen(false)
          }}
        />
      </Dialog>
    </PageContainer>
  )
}
