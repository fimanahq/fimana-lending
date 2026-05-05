'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LoanAdjustmentDialog, LoanPaymentDialog } from '@/components/payments'
import { Button, Card, EmptyState, ErrorState, LoadingState, TableShell } from '@/components/shared'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { LoanRecord } from '@/lib/types'
import { getLoan } from '@/services'

interface LoanDetailProps {
  loanId: string
}

function formatMinorCurrency(value: number, currency: string) {
  return formatCurrency(value / 100, currency)
}

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`
}

function formatLoanStatus(status: LoanRecord['status']) {
  return status.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}

function formatReleaseMethod(method?: LoanRecord['disbursement']['releaseMethod']) {
  if (!method) {
    return 'Not recorded'
  }

  return method
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

export function LoanDetail({ loanId }: LoanDetailProps) {
  const [loan, setLoan] = useState<LoanRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)

  useEffect(() => {
    const loadLoan = async () => {
      setLoading(true)
      setError('')

      try {
        setLoan(await getLoan(loanId))
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan')
      } finally {
        setLoading(false)
      }
    }

    void loadLoan()
  }, [loanId])

  if (loading) {
    return <LoadingState title="Loading loan" description="Fetching the loan record." />
  }

  if (error && !loan) {
    return (
      <ErrorState
        title="Unable to load loan"
        description={error}
        action={<Link href="/loan-applications" className="button-secondary">Back to applications</Link>}
      />
    )
  }

  if (!loan) {
    return (
      <EmptyState
        title="Loan not found"
        description="The loan record could not be found."
        action={<Link href="/loan-applications" className="button-secondary">Back to applications</Link>}
      />
    )
  }

  const currency = loan.loanProduct.currency || 'PHP'
  const schedule = loan.schedule ?? []
  const totalInterestAmountMinor = schedule.reduce((sum, row) => sum + row.scheduledInterestAmountMinor, 0)
  const overallProfitPercentage = loan.principalAmountMinor > 0
    ? (totalInterestAmountMinor / loan.principalAmountMinor) * 100
    : 0
  const canPostPayment = loan.status === 'active' && loan.balances.totalOutstandingAmountMinor > 0
  const canAdjustInterest = loan.status === 'active' && loan.balances.totalOutstandingAmountMinor > 0

  return (
    <div className="stack">
      <div className="inline-actions">
        <Button variant="secondary" onClick={() => setPaymentDialogOpen(true)} disabled={!canPostPayment}>Post payment</Button>
        <Button variant="secondary" onClick={() => setAdjustmentDialogOpen(true)} disabled={!canAdjustInterest}>Loan adjustment</Button>
        <Link href={`/loan-applications/${loan.loanApplicationId}`} className="button-secondary">View application</Link>
        <Link href="/loan-applications" className="button-ghost">Back to applications</Link>
      </div>

      {error ? (
        <ErrorState
          title="Loan loaded with warnings"
          description={error}
          action={<Button variant="secondary" onClick={() => window.location.reload()}>Reload</Button>}
        />
      ) : null}

      <Card
        title={loan.loanNumber}
        description={`Application ${loan.loanApplicationId}`}
        actions={<span className={getStatusClassName(loan.status)}>{formatLoanStatus(loan.status)}</span>}
      >
        <div className="application-summary-grid">
          <div className="data-card">
            <span className="muted">Principal</span>
            <strong>{formatMinorCurrency(loan.principalAmountMinor, currency)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Net disbursed</span>
            <strong>{formatMinorCurrency(loan.disbursedAmountMinor, currency)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Outstanding</span>
            <strong>{formatMinorCurrency(loan.balances.totalOutstandingAmountMinor, currency)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Overall Profit %</span>
            <strong>{formatPercentage(overallProfitPercentage)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Next due</span>
            <strong>{loan.nextDueDate ? formatDate(loan.nextDueDate) : 'Completed'}</strong>
          </div>
        </div>

        <div className="grid two">
          <div>
            <div className="muted">Borrower number</div>
            <strong>{loan.borrower.borrowerNumber}</strong>
          </div>
          <div>
            <div className="muted">Loan product</div>
            <strong>{loan.loanProduct.name}</strong>
          </div>
          <div>
            <div className="muted">Payment schedule</div>
            <strong>{loan.paymentFrequency === 'monthly' ? 'Monthly' : 'Semi-monthly'} on {loan.paymentDays.map(formatPaymentDay).join(' and ')}</strong>
          </div>
          <div>
            <div className="muted">Maturity date</div>
            <strong>{formatDate(loan.maturityDate)}</strong>
          </div>
        </div>
      </Card>

      <Card title="Disbursement" description="Recorded automatically during application approval for this MVP flow.">
        <div className="application-summary-grid">
          <div className="data-card">
            <span className="muted">Release amount</span>
            <strong>{formatMinorCurrency(loan.disbursement.releaseAmountMinor, currency)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Net released</span>
            <strong>{formatMinorCurrency(loan.disbursement.netReleasedAmountMinor, currency)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Release method</span>
            <strong>{formatReleaseMethod(loan.disbursement.releaseMethod)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Disbursed at</span>
            <strong>{loan.disbursement.disbursedAt ? formatDate(loan.disbursement.disbursedAt) : 'Not recorded'}</strong>
          </div>
        </div>

        <div className="grid two">
          <div>
            <div className="muted">Reference number</div>
            <strong>{loan.disbursement.referenceNo || 'Not provided'}</strong>
          </div>
          <div>
            <div className="muted">Deductions</div>
            <strong>{loan.disbursement.deductions.length}</strong>
          </div>
        </div>

        <div className="notice">
          {loan.disbursement.notes || 'No disbursement notes recorded.'}
        </div>
      </Card>

      <TableShell label={`${loan.loanNumber} repayment schedule`}>
        <table>
          <thead>
            <tr>
              <th>Installment</th>
              <th>Due date</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">No schedule rows generated.</td>
              </tr>
            ) : (
              schedule.map((row) => (
                <tr key={row.id}>
                  <td>#{row.sequence}</td>
                  <td>{formatDate(row.dueDate)}</td>
                  <td>{formatMinorCurrency(row.scheduledPrincipalAmountMinor, currency)}</td>
                  <td>{formatMinorCurrency(row.scheduledInterestAmountMinor, currency)}</td>
                  <td>{formatMinorCurrency(row.scheduledTotalAmountMinor, currency)}</td>
                  <td><span className={getStatusClassName(row.status)}>{row.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>

      <LoanPaymentDialog
        open={paymentDialogOpen}
        loanId={loanId}
        loanLabel={`${loan.borrower.displayName} · ${loan.loanNumber}`}
        onClose={() => setPaymentDialogOpen(false)}
        onPaymentPosted={async (updatedLoan) => {
          setLoan(updatedLoan)
        }}
      />

      <LoanAdjustmentDialog
        open={adjustmentDialogOpen}
        loanId={loanId}
        onClose={() => setAdjustmentDialogOpen(false)}
        onAdjustmentPosted={async (updatedLoan) => {
          setLoan(updatedLoan)
        }}
      />
    </div>
  )
}
