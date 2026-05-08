'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { EditIcon, DeleteIcon } from '@/components/shared/table-icons'
import { LoanAdjustmentDialog, LoanPaymentDialog } from '@/components/payments'
import {
  Button,
  Card,
  ConfirmationDialog,
  DataTable,
  Dialog,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Input,
  LoadingState,
  SearchableSelect,
  TableShell,
} from '@/components/shared'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { LoanPaymentHistory, LoanPaymentMethod, LoanRecord } from '@/lib/types'
import { deleteLoanPayment, getLoan, getLoanPaymentDetail, updateLoanPayment } from '@/services'

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

function formatPaymentMethod(value: string) {
  return value
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

function getPaymentStatusClassName(status: LoanPaymentHistory['status']) {
  return status === 'posted' ? 'status-active' : 'status-cancelled'
}

function toAmountMinor(amount: string) {
  const parsed = Number(amount)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed * 100)
}

const paymentMethodOptions: Array<{ value: LoanPaymentMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'ewallet', label: 'E-wallet' },
  { value: 'internal_offset', label: 'Internal offset' },
]

export function LoanDetail({ loanId }: LoanDetailProps) {
  const [loan, setLoan] = useState<LoanRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)
  const [payments, setPayments] = useState<LoanPaymentHistory[]>([])
  const [selectedPayment, setSelectedPayment] = useState<LoanPaymentHistory | null>(null)
  const [deletePaymentId, setDeletePaymentId] = useState('')
  const [deletingPayment, setDeletingPayment] = useState(false)
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<LoanPaymentMethod>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [submittingPaymentEdit, setSubmittingPaymentEdit] = useState(false)
  const [paymentActionError, setPaymentActionError] = useState('')

  useEffect(() => {
    const loadLoan = async () => {
      setLoading(true)
      setError('')

      try {
        const [loanRecord, paymentDetail] = await Promise.all([
          getLoan(loanId),
          getLoanPaymentDetail(loanId),
        ])
        setLoan(loanRecord)
        setPayments(paymentDetail.payments)
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
  const overallProfitAmountMinor = loan.balances.interestPaidAmountMinor + loan.balances.interestOutstandingAmountMinor
  const overallProfitPercentage = loan.principalAmountMinor > 0
    ? (overallProfitAmountMinor / loan.principalAmountMinor) * 100
    : 0
  const canPostPayment = loan.status === 'active' && loan.balances.totalOutstandingAmountMinor > 0
  const canAdjustInterest = loan.status === 'active' && loan.balances.totalOutstandingAmountMinor > 0

  const openEditPaymentDialog = (payment: LoanPaymentHistory) => {
    setSelectedPayment(payment)
    setPaymentDate(payment.paymentDate.slice(0, 10))
    setPaymentAmount((payment.amountMinor / 100).toFixed(2))
    setPaymentMethod(payment.method)
    setPaymentReference(payment.referenceNo)
    setPaymentActionError('')
  }

  const handlePaymentEdit = async () => {
    if (!selectedPayment) {
      return
    }

    const amountMinor = toAmountMinor(paymentAmount)
    if (!amountMinor || amountMinor <= 0) {
      setPaymentActionError('Enter a payment amount greater than 0')
      return
    }

    setSubmittingPaymentEdit(true)
    setPaymentActionError('')
    try {
      const response = await updateLoanPayment(loanId, selectedPayment.id, {
        paymentDate,
        amountMinor,
        method: paymentMethod,
        referenceNo: paymentReference.trim() || undefined,
      })
      setLoan(response.loan)
      setPayments(response.payments)
      setSelectedPayment(null)
    } catch (caughtError) {
      setPaymentActionError(caughtError instanceof Error ? caughtError.message : 'Unable to update payment')
    } finally {
      setSubmittingPaymentEdit(false)
    }
  }

  const handleDeletePayment = async () => {
    if (!deletePaymentId) {
      return
    }

    setDeletingPayment(true)
    setPaymentActionError('')
    try {
      const response = await deleteLoanPayment(loanId, deletePaymentId)
      setLoan(response.loan)
      setPayments(response.payments)
      setDeletePaymentId('')
    } catch (caughtError) {
      setPaymentActionError(caughtError instanceof Error ? caughtError.message : 'Unable to delete payment')
    } finally {
      setDeletingPayment(false)
    }
  }

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
            <span className="muted">Overall Profit</span>
            <strong>{formatMinorCurrency(overallProfitAmountMinor, currency)}</strong>
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

      <TableShell label={`${loan.loanNumber} payment history`}>
        <DataTable>
          <thead>
            <tr>
              <th>Date</th>
              <th>Receipt</th>
              <th>Method</th>
              <th>Allocated</th>
              <th>Unallocated</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">No payments have been posted yet.</td>
              </tr>
            ) : (
              payments.map((payment) => {
                const allocatedAmountMinor = payment.allocations.reduce((sum, allocation) => sum + allocation.totalAmountMinor, 0)
                return (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td>
                      <strong>{payment.receiptNumber}</strong>
                      <div className="muted">{payment.referenceNo || 'No reference'}</div>
                    </td>
                    <td>{formatPaymentMethod(payment.method)}</td>
                    <td>{formatMinorCurrency(allocatedAmountMinor, currency)}</td>
                    <td>{formatMinorCurrency(payment.unallocatedAmountMinor, currency)}</td>
                    <td>{formatMinorCurrency(payment.amountMinor, currency)}</td>
                    <td><span className={getPaymentStatusClassName(payment.status)}>{payment.status}</span></td>
                    <td>
                      <div className="loan-schedule__actions">
                        <button
                          type="button"
                          className="button-ghost table-action-icon"
                          aria-label={`Edit payment ${payment.receiptNumber}`}
                          title="Edit payment"
                          onClick={() => openEditPaymentDialog(payment)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="button-ghost table-action-icon"
                          aria-label={`Delete payment ${payment.receiptNumber}`}
                          title="Delete payment"
                          onClick={() => setDeletePaymentId(payment.id)}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </DataTable>
      </TableShell>

      <LoanPaymentDialog
        open={paymentDialogOpen}
        loanId={loanId}
        loanLabel={`${loan.borrower.displayName} · ${loan.loanNumber}`}
        onClose={() => setPaymentDialogOpen(false)}
        onPaymentPosted={async (updatedLoan) => {
          setLoan(updatedLoan)
          const paymentDetail = await getLoanPaymentDetail(loanId)
          setPayments(paymentDetail.payments)
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

      <Dialog
        id="loan-edit-payment-dialog"
        open={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        title="Edit payment"
      >
        <div className="stack">
          {paymentActionError ? <ErrorBanner title="Unable to update payment" message={paymentActionError} /> : null}
          <div className="grid two">
            <Input
              id="edit-payment-date"
              label="Payment date"
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
            <Input
              id="edit-payment-amount"
              label="Amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
            />
            <SearchableSelect
              id="edit-payment-method"
              label="Method"
              options={paymentMethodOptions}
              value={paymentMethod}
              onChange={(nextValue) => setPaymentMethod(nextValue as LoanPaymentMethod)}
            />
            <Input
              id="edit-payment-reference"
              label="Reference number"
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="inline-actions">
            <Button onClick={() => void handlePaymentEdit()} disabled={submittingPaymentEdit}>
              {submittingPaymentEdit ? 'Saving…' : 'Save changes'}
            </Button>
            <Button variant="secondary" onClick={() => setSelectedPayment(null)} disabled={submittingPaymentEdit}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmationDialog
        open={Boolean(deletePaymentId)}
        title="Delete payment"
        message="Are you sure you want to delete this payment? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        confirmDisabled={deletingPayment}
        onConfirm={() => void handleDeletePayment()}
        onClose={() => setDeletePaymentId('')}
      />
    </div>
  )
}
