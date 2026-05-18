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
import type { LoanAdjustmentRecord, LoanPaymentHistory, LoanPaymentMethod, LoanRecord } from '@/lib/types'
import { getLoan } from '@/services/loans'
import {
  deleteLoanAdjustment,
  deleteLoanPayment,
  getLoanAdjustmentDetail,
  getLoanPaymentDetail,
  updateLoanAdjustment,
  updateLoanPayment,
} from '@/services/payments'
import styles from './loan-list.module.css'

interface LoanDetailProps {
  loanId: string
}

const PAYMENT_TOLERANCE_MINOR = 500

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

function getAdjustmentStatusClassName(status: LoanAdjustmentRecord['status']) {
  return status === 'posted' ? 'status-active' : 'status-cancelled'
}

const adjustmentTypeLabels: Record<LoanAdjustmentRecord['type'], string> = {
  payment_adjustment: 'Payment adjustment',
  balance_adjustment: 'Balance adjustment',
  schedule_adjustment: 'Schedule adjustment',
  rounding_adjustment: 'Rounding adjustment',
}

const adjustmentReasonLabels: Record<string, string> = {
  rounding_shortage_write_off: 'Rounding shortage write-off',
  rounding_overpayment_income: 'Rounding overpayment income',
}

function formatAdjustmentMeta(adjustment: LoanAdjustmentRecord) {
  const component = adjustment.component[0]?.toUpperCase() + adjustment.component.slice(1)
  return `${adjustmentTypeLabels[adjustment.type]} · ${component} ${adjustment.direction}${adjustment.isSystemGenerated ? ' · System' : ''}`
}

function toAmountMinor(amount: string) {
  const parsed = Number(amount)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed * 100)
}

function getPaymentAllocatedAmountMinor(payment: LoanPaymentHistory) {
  return payment.allocations.reduce((sum, allocation) => sum + allocation.totalAmountMinor, 0)
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
  const [adjustments, setAdjustments] = useState<LoanAdjustmentRecord[]>([])
  const [selectedPayment, setSelectedPayment] = useState<LoanPaymentHistory | null>(null)
  const [selectedAdjustment, setSelectedAdjustment] = useState<LoanAdjustmentRecord | null>(null)
  const [deletePaymentId, setDeletePaymentId] = useState('')
  const [deleteAdjustmentId, setDeleteAdjustmentId] = useState('')
  const [deletingPayment, setDeletingPayment] = useState(false)
  const [deletingAdjustment, setDeletingAdjustment] = useState(false)
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<LoanPaymentMethod>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [adjustmentDate, setAdjustmentDate] = useState('')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [submittingPaymentEdit, setSubmittingPaymentEdit] = useState(false)
  const [submittingAdjustmentEdit, setSubmittingAdjustmentEdit] = useState(false)
  const [paymentActionError, setPaymentActionError] = useState('')
  const [adjustmentActionError, setAdjustmentActionError] = useState('')

  useEffect(() => {
    const loadLoan = async () => {
      setLoading(true)
      setError('')

      try {
        const [loanRecord, paymentDetail, adjustmentDetail] = await Promise.all([
          getLoan(loanId),
          getLoanPaymentDetail(loanId),
          getLoanAdjustmentDetail(loanId),
        ])
        setLoan(loanRecord)
        setPayments(paymentDetail.payments)
        setAdjustments(adjustmentDetail.adjustments)
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
  const overallProfitAmountMinor = loan.totalInterestAmountMinor
  const overallProfitPercentage = loan.principalAmountMinor > 0
    ? (overallProfitAmountMinor / loan.principalAmountMinor) * 100
    : 0
  const canPostPayment = loan.status === 'active' && loan.balances.totalOutstandingAmountMinor > 0
  const canOpenLoanAdjustment = loan.status === 'active' || loan.status === 'completed'
  const editPaymentAmountMinor = toAmountMinor(paymentAmount)
  const selectedPaymentAllocatedAmountMinor = selectedPayment ? getPaymentAllocatedAmountMinor(selectedPayment) : 0
  const selectedPaymentRoundingIncomeMinor = selectedPayment
    ? adjustments
      .filter((adjustment) =>
        adjustment.relatedPaymentId === selectedPayment.id
        && adjustment.type === 'rounding_adjustment'
        && adjustment.direction === 'increase'
        && adjustment.reason === 'rounding_overpayment_income',
      )
      .reduce((sum, adjustment) => sum + adjustment.amountMinor, 0)
    : 0
  const editPaymentEffectiveRemainingBalanceMinor = selectedPayment
    ? loan.balances.totalOutstandingAmountMinor
      + selectedPaymentAllocatedAmountMinor
      + selectedPayment.unallocatedAmountMinor
      - selectedPaymentRoundingIncomeMinor
    : 0
  const editPaymentOverpaymentMinor = editPaymentAmountMinor && selectedPayment
    ? editPaymentAmountMinor - editPaymentEffectiveRemainingBalanceMinor
    : 0
  const editPaymentOpenRows = schedule.filter((row) => {
    if (row.outstandingTotalAmountMinor > 0) {
      return true
    }

    return selectedPayment?.allocations.some((allocation) => allocation.loanScheduleId === row.id) ?? false
  })
  const editPaymentNextRelevantBalanceMinor = selectedPayment
    ? editPaymentOpenRows[0]?.outstandingTotalAmountMinor
      ? editPaymentOpenRows[0].outstandingTotalAmountMinor + selectedPayment.allocations
        .filter((allocation) => allocation.loanScheduleId === editPaymentOpenRows[0]?.id)
        .reduce((sum, allocation) => sum + allocation.totalAmountMinor, 0)
      : editPaymentEffectiveRemainingBalanceMinor
    : 0
  const editPaymentRowShortageMinor = editPaymentAmountMinor && editPaymentAmountMinor < editPaymentNextRelevantBalanceMinor
    ? editPaymentNextRelevantBalanceMinor - editPaymentAmountMinor
    : 0
  const editPaymentFinalShortageMinor = editPaymentAmountMinor && editPaymentAmountMinor < editPaymentEffectiveRemainingBalanceMinor
    ? editPaymentEffectiveRemainingBalanceMinor - editPaymentAmountMinor
    : 0
  const editPaymentShortagePreviewMinor = editPaymentRowShortageMinor > 0 && editPaymentRowShortageMinor <= PAYMENT_TOLERANCE_MINOR
    ? editPaymentRowShortageMinor
    : editPaymentFinalShortageMinor > 0 && editPaymentFinalShortageMinor <= PAYMENT_TOLERANCE_MINOR
      ? editPaymentFinalShortageMinor
      : 0
  const hasLargeEditPaymentOverpayment = editPaymentOverpaymentMinor > PAYMENT_TOLERANCE_MINOR
  const editPaymentPreviewMessage = hasLargeEditPaymentOverpayment
    ? `Payment exceeds remaining balance by ${formatMinorCurrency(editPaymentOverpaymentMinor, currency)}. Please enter ${formatMinorCurrency(editPaymentEffectiveRemainingBalanceMinor + PAYMENT_TOLERANCE_MINOR, currency)} or less.`
    : editPaymentOverpaymentMinor > 0
      ? `${formatMinorCurrency(editPaymentOverpaymentMinor, currency)} excess will be recorded as rounding income.`
      : editPaymentShortagePreviewMinor > 0
        ? `${formatMinorCurrency(editPaymentShortagePreviewMinor, currency)} shortage will be waived from interest as a rounding adjustment.`
        : ''

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

    const effectiveRemainingBalanceMinor = loan.balances.totalOutstandingAmountMinor
      + getPaymentAllocatedAmountMinor(selectedPayment)
      + selectedPayment.unallocatedAmountMinor
      - adjustments
        .filter((adjustment) =>
          adjustment.relatedPaymentId === selectedPayment.id
          && adjustment.type === 'rounding_adjustment'
          && adjustment.direction === 'increase'
          && adjustment.reason === 'rounding_overpayment_income',
        )
        .reduce((sum, adjustment) => sum + adjustment.amountMinor, 0)
    const overpaymentMinor = amountMinor - effectiveRemainingBalanceMinor
    if (overpaymentMinor > PAYMENT_TOLERANCE_MINOR) {
      setPaymentActionError(`Payment exceeds remaining balance by ${formatMinorCurrency(overpaymentMinor, currency)}. Please enter ${formatMinorCurrency(effectiveRemainingBalanceMinor + PAYMENT_TOLERANCE_MINOR, currency)} or less.`)
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
      const adjustmentDetail = await getLoanAdjustmentDetail(loanId)
      setAdjustments(adjustmentDetail.adjustments)
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
      const adjustmentDetail = await getLoanAdjustmentDetail(loanId)
      setAdjustments(adjustmentDetail.adjustments)
      setDeletePaymentId('')
    } catch (caughtError) {
      setPaymentActionError(caughtError instanceof Error ? caughtError.message : 'Unable to delete payment')
    } finally {
      setDeletingPayment(false)
    }
  }

  const openEditAdjustmentDialog = (adjustment: LoanAdjustmentRecord) => {
    setSelectedAdjustment(adjustment)
    setAdjustmentDate(adjustment.adjustmentDate.slice(0, 10))
    setAdjustmentAmount((adjustment.amountMinor / 100).toFixed(2))
    setAdjustmentReason(adjustment.reason)
    setAdjustmentActionError('')
  }

  const handleAdjustmentEdit = async () => {
    if (!selectedAdjustment) {
      return
    }

    const amountMinor = toAmountMinor(adjustmentAmount)
    if (!amountMinor || amountMinor <= 0) {
      setAdjustmentActionError('Enter an adjustment amount greater than 0')
      return
    }

    if (!adjustmentReason.trim()) {
      setAdjustmentActionError('Enter a reason for the loan adjustment')
      return
    }

    setSubmittingAdjustmentEdit(true)
    setAdjustmentActionError('')
    try {
      const response = await updateLoanAdjustment(loanId, selectedAdjustment.id, {
        adjustmentDate,
        amountMinor,
        reason: adjustmentReason.trim(),
      })
      setLoan(response.loan)
      const adjustmentDetail = await getLoanAdjustmentDetail(loanId)
      setAdjustments(adjustmentDetail.adjustments)
      setSelectedAdjustment(null)
    } catch (caughtError) {
      setAdjustmentActionError(caughtError instanceof Error ? caughtError.message : 'Unable to update adjustment')
    } finally {
      setSubmittingAdjustmentEdit(false)
    }
  }

  const handleDeleteAdjustment = async () => {
    if (!deleteAdjustmentId) {
      return
    }

    setDeletingAdjustment(true)
    setAdjustmentActionError('')
    try {
      const response = await deleteLoanAdjustment(loanId, deleteAdjustmentId)
      setLoan(response.loan)
      const adjustmentDetail = await getLoanAdjustmentDetail(loanId)
      setAdjustments(adjustmentDetail.adjustments)
      setDeleteAdjustmentId('')
    } catch (caughtError) {
      setAdjustmentActionError(caughtError instanceof Error ? caughtError.message : 'Unable to delete adjustment')
    } finally {
      setDeletingAdjustment(false)
    }
  }

  return (
    <div className="stack">
      <div className="inline-actions">
        <Button variant="secondary" onClick={() => setPaymentDialogOpen(true)} disabled={!canPostPayment}>Post payment</Button>
        <Button variant="secondary" onClick={() => setAdjustmentDialogOpen(true)} disabled={!canOpenLoanAdjustment}>Loan adjustment</Button>
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

      {adjustmentActionError && !selectedAdjustment ? (
        <ErrorBanner title="Unable to update adjustment" message={adjustmentActionError} />
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
            <span className="muted">Interest Rate</span>
            <strong>{formatPercentage(loan.interestRate)}</strong>
          </div>
          <div className="data-card">
            <span className="muted">Next due</span>
            <strong>{loan.nextDueDate ? formatDate(loan.nextDueDate) : 'Completed'}</strong>
          </div>
        </div>

        <div className="grid two">
          <div>
            <div className="muted">Borrower</div>
            <strong>
              <Link href={`/borrowers/${loan.borrower.id}`} className="data-card__titleLink">
                {loan.borrower.displayName}
              </Link>
            </strong>
          </div>
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

      <TableShell
        label={`${loan.loanNumber} repayment schedule`}
        title="Installment schedule"
      >
        <table>
          <thead>
            <tr>
              <th>Installment</th>
              <th>Due date</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Total</th>
              <th>Applied</th>
              <th>Outstanding</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">No schedule rows generated.</td>
              </tr>
            ) : (
              schedule.map((row) => (
                <tr key={row.id}>
                  <td>#{row.sequence}</td>
                  <td>{formatDate(row.dueDate)}</td>
                  <td>{formatMinorCurrency(row.scheduledPrincipalAmountMinor, currency)}</td>
                  <td>{formatMinorCurrency(row.scheduledInterestAmountMinor, currency)}</td>
                  <td>{formatMinorCurrency(row.scheduledTotalAmountMinor, currency)}</td>
                  <td>{formatMinorCurrency(row.paidTotalAmountMinor, currency)}</td>
                  <td>{formatMinorCurrency(row.outstandingTotalAmountMinor, currency)}</td>
                  <td>{formatMinorCurrency(row.closingPrincipalBalanceMinor, currency)}</td>
                  <td><span className={getStatusClassName(row.status)}>{row.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>

      <TableShell label={`${loan.loanNumber} payment history`} title="Payment history">
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
                      <div className={styles.actions}>
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

      <TableShell label={`${loan.loanNumber} adjustment history`} title="Loan adjustment history">
        <DataTable>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reason</th>
              <th>Applied rows</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">No adjustments have been posted yet.</td>
              </tr>
            ) : (
              adjustments.map((adjustment) => {
                const principalAmountMinor = adjustment.allocations.reduce((sum, allocation) => sum + allocation.principalAmountMinor, 0)
                const interestAmountMinor = adjustment.allocations.reduce((sum, allocation) => sum + allocation.interestAmountMinor, 0)
                return (
                  <tr key={adjustment.id}>
                    <td>{formatDate(adjustment.adjustmentDate)}</td>
                    <td>
                      <strong>{adjustmentReasonLabels[adjustment.reason] ?? adjustment.reason}</strong>
                      <div className="muted">{formatAdjustmentMeta(adjustment)}</div>
                    </td>
                    <td>{adjustment.allocations.map((allocation) => `#${allocation.sequence}`).join(', ') || 'None'}</td>
                    <td>{formatMinorCurrency(principalAmountMinor, currency)}</td>
                    <td>{formatMinorCurrency(interestAmountMinor, currency)}</td>
                    <td>{formatMinorCurrency(adjustment.amountMinor, currency)}</td>
                    <td><span className={getAdjustmentStatusClassName(adjustment.status)}>{adjustment.status}</span></td>
                    <td>
                      {adjustment.isSystemGenerated ? (
                        <span className="muted">System</span>
                      ) : (
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className="button-ghost table-action-icon"
                            aria-label={`Edit adjustment ${adjustment.reason}`}
                            title="Edit adjustment"
                            onClick={() => openEditAdjustmentDialog(adjustment)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            className="button-ghost table-action-icon"
                            aria-label={`Delete adjustment ${adjustment.reason}`}
                            title="Delete adjustment"
                            onClick={() => setDeleteAdjustmentId(adjustment.id)}
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      )}
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
          const [paymentDetail, adjustmentDetail] = await Promise.all([
            getLoanPaymentDetail(loanId),
            getLoanAdjustmentDetail(loanId),
          ])
          setPayments(paymentDetail.payments)
          setAdjustments(adjustmentDetail.adjustments)
        }}
      />

      <LoanAdjustmentDialog
        open={adjustmentDialogOpen}
        loanId={loanId}
        onClose={() => setAdjustmentDialogOpen(false)}
        onAdjustmentPosted={async (updatedLoan) => {
          setLoan(updatedLoan)
          const adjustmentDetail = await getLoanAdjustmentDetail(loanId)
          setAdjustments(adjustmentDetail.adjustments)
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
          {editPaymentPreviewMessage ? (
            <div className={hasLargeEditPaymentOverpayment ? 'notice danger' : 'notice'}>
              {editPaymentPreviewMessage}
            </div>
          ) : null}
          <div className="inline-actions">
            <Button onClick={() => void handlePaymentEdit()} disabled={submittingPaymentEdit || hasLargeEditPaymentOverpayment}>
              {submittingPaymentEdit ? 'Saving…' : 'Save changes'}
            </Button>
            <Button variant="secondary" onClick={() => setSelectedPayment(null)} disabled={submittingPaymentEdit}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        id="loan-edit-adjustment-dialog"
        open={Boolean(selectedAdjustment)}
        onClose={() => setSelectedAdjustment(null)}
        title="Edit adjustment"
      >
        <div className="stack">
          {adjustmentActionError ? <ErrorBanner title="Unable to update adjustment" message={adjustmentActionError} /> : null}
          <div className="grid two">
            <Input
              id="edit-adjustment-date"
              label="Adjustment date"
              type="date"
              value={adjustmentDate}
              onChange={(event) => setAdjustmentDate(event.target.value)}
            />
            <Input
              id="edit-adjustment-amount"
              label="Amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={adjustmentAmount}
              onChange={(event) => setAdjustmentAmount(event.target.value)}
            />
            <Input
              id="edit-adjustment-reason"
              label="Reason"
              value={adjustmentReason}
              onChange={(event) => setAdjustmentReason(event.target.value)}
              placeholder="Loan adjustment reason"
              className="grid-span-2"
            />
          </div>
          <div className="inline-actions">
            <Button onClick={() => void handleAdjustmentEdit()} disabled={submittingAdjustmentEdit}>
              {submittingAdjustmentEdit ? 'Saving…' : 'Save changes'}
            </Button>
            <Button variant="secondary" onClick={() => setSelectedAdjustment(null)} disabled={submittingAdjustmentEdit}>
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

      <ConfirmationDialog
        open={Boolean(deleteAdjustmentId)}
        title="Delete adjustment"
        message="Are you sure you want to delete this adjustment? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        confirmDisabled={deletingAdjustment}
        onConfirm={() => void handleDeleteAdjustment()}
        onClose={() => setDeleteAdjustmentId('')}
      />
    </div>
  )
}
