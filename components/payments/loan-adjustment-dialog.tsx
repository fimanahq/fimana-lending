'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, DataTable, Dialog, EmptyState, ErrorBanner, Input, LoadingState, TableShell } from '@/components/shared'
import { formatCurrency, formatDate } from '@/lib/format'
import type { LoanAdjustmentDetail, LoanAdjustmentRecord, LoanRecord } from '@/lib/types'
import { getLoanAdjustmentDetail, postLoanAdjustment } from '@/services'
import styles from './loan-dialogs.module.css'

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

function formatMinorCurrency(value: number, currency: string) {
  return formatCurrency(value / 100, currency)
}

function formatAdjustmentMeta(adjustment: LoanAdjustmentRecord) {
  const component = adjustment.component[0]?.toUpperCase() + adjustment.component.slice(1)
  return `${adjustmentTypeLabels[adjustment.type]} · ${component} ${adjustment.direction}${adjustment.isSystemGenerated ? ' · System' : ''}`
}

function todayDateValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toAmountMinor(amount: string) {
  const parsed = Number(amount)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed * 100)
}

export interface LoanAdjustmentDialogProps {
  loanId: string
  onAdjustmentPosted?: (loan: LoanRecord) => Promise<void> | void
  onClose: () => void
  open: boolean
}

export function LoanAdjustmentDialog({
  loanId,
  onAdjustmentPosted,
  onClose,
  open,
}: LoanAdjustmentDialogProps) {
  const [detail, setDetail] = useState<LoanAdjustmentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [adjustmentDate, setAdjustmentDate] = useState(todayDateValue())
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const loadLoan = useCallback(async () => {
    if (!loanId) {
      setDetail(null)
      return
    }

    setLoading(true)
    setDetailError('')

    try {
      setDetail(await getLoanAdjustmentDetail(loanId))
    } catch (caughtError) {
      setDetailError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan detail')
    } finally {
      setLoading(false)
    }
  }, [loanId])

  useEffect(() => {
    if (!open) {
      return
    }

    void loadLoan()
  }, [loadLoan, open])

  useEffect(() => {
    if (!open) {
      setAdjustmentDate(todayDateValue())
      setAmount('')
      setReason('')
      setSubmitError('')
    }
  }, [open])

  const handleSubmit = async () => {
    const amountMinor = toAmountMinor(amount)
    if (!amountMinor || amountMinor <= 0) {
      setSubmitError('Enter an adjustment amount greater than 0')
      return
    }

    if (!reason.trim()) {
      setSubmitError('Enter a reason for the loan adjustment')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const response = await postLoanAdjustment(loanId, {
        adjustmentDate,
        amountMinor,
        reason: reason.trim(),
      })

      setDetail((prev) => ({
        loan: response.loan,
        adjustments: [response.adjustment, ...(prev?.adjustments ?? [])],
      }))
      setAmount('')
      setReason('')
      await onAdjustmentPosted?.(response.loan)
      onClose()
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Unable to post adjustment')
    } finally {
      setSubmitting(false)
    }
  }

  const loan = detail?.loan ?? null
  const adjustments = detail?.adjustments ?? []
  const currency = loan?.loanProduct.currency || 'PHP'
  const openScheduleRows = (loan?.schedule ?? []).filter((row) => row.outstandingTotalAmountMinor > 0)
  const canPostAdjustment = Boolean(
    loan
    && (loan.status === 'active' || loan.status === 'completed')
    && loan.balances.totalOutstandingAmountMinor > 0
    && openScheduleRows.length > 0,
  )

  function AdjustmentHistoryTable({
    adjustments,
    currency,
  }: {
    adjustments: LoanAdjustmentRecord[]
    currency: string
  }) {
    return (
      <TableShell label="Recent posted adjustments">
        <DataTable>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reason</th>
              <th>Applied rows</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">No adjustments have been posted yet.</td>
              </tr>
            ) : (
              adjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <td>{formatDate(adjustment.adjustmentDate)}</td>
                  <td>
                    <strong>{adjustmentReasonLabels[adjustment.reason] ?? adjustment.reason}</strong>
                    <div className="muted">{formatAdjustmentMeta(adjustment)}</div>
                    <div className="muted">{adjustment.status}</div>
                  </td>
                  <td>{adjustment.allocations.map((allocation) => `#${allocation.sequence}`).join(', ') || 'None'}</td>
                  <td>{formatMinorCurrency(adjustment.allocations.reduce((sum, allocation) => sum + allocation.principalAmountMinor, 0), currency)}</td>
                  <td>{formatMinorCurrency(adjustment.allocations.reduce((sum, allocation) => sum + allocation.interestAmountMinor, 0), currency)}</td>
                  <td>{formatMinorCurrency(adjustment.amountMinor, currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </TableShell>
    )
  }

  return (
    <Dialog
      id="loan-adjustment-dialog"
      open={open}
      onClose={onClose}
      title="Loan Adjustment"
      className={styles.dialog}
    >
      <div className="stack">
        {loading ? (
          <LoadingState title="Loading loan adjustment detail" description="Fetching the latest loan balances and schedule." />
        ) : null}

        {detailError ? (
          <ErrorBanner
            title="Unable to load loan adjustment detail"
            message={detailError}
            action={<Button variant="secondary" onClick={() => void loadLoan()}>Retry</Button>}
          />
        ) : null}

        {!loading && !detailError && !loan ? (
          <EmptyState
            title="Loan not available"
            description="The loan adjustment record could not be loaded."
          />
        ) : null}

        {loan ? (
          <>
            <Card title={`${loan.borrower.displayName} · ${loan.loanNumber}`}>
              <div className="application-summary-grid">
                <div className="data-card">
                  <span className="muted">Outstanding interest</span>
                  <strong>{formatMinorCurrency(loan.balances.interestOutstandingAmountMinor, currency)}</strong>
                </div>
                <div className="data-card">
                  <span className="muted">Outstanding total</span>
                  <strong>{formatMinorCurrency(loan.balances.totalOutstandingAmountMinor, currency)}</strong>
                </div>
                <div className="data-card">
                  <span className="muted">Next due</span>
                  <strong>{loan.nextDueDate ? formatDate(loan.nextDueDate) : 'Completed'}</strong>
                </div>
                <div className="data-card">
                  <span className="muted">Open rows</span>
                  <strong>{openScheduleRows.length}</strong>
                </div>
              </div>
            </Card>

            <Card variant="flat" className={styles.formCard}>
              {submitError ? <ErrorBanner title="Unable to post adjustment" message={submitError} /> : null}

              <div className="notice">
                This is a whole-loan adjustment. The amount is applied automatically to the oldest open rows first, reducing interest before principal. Paid rows are not adjusted.
              </div>

              <div className="grid two">
                <Input
                  id="adjustment-date"
                  label="Adjustment date"
                  type="date"
                  value={adjustmentDate}
                  onChange={(event) => setAdjustmentDate(event.target.value)}
                  disabled={submitting || !canPostAdjustment}
                />
                <Input
                  id="adjustment-amount"
                  label="Amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={submitting || !canPostAdjustment}
                />
                <Input
                  id="adjustment-reason"
                  label="Reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Loan adjustment reason"
                  disabled={submitting || !canPostAdjustment}
                  className="grid-span-2"
                />
              </div>

              <div className={`ui-card__actions ${styles.formActions}`}>
                <Button onClick={() => void handleSubmit()} disabled={submitting || !canPostAdjustment}>
                  {submitting ? 'Posting…' : canPostAdjustment ? 'Post loan adjustment' : 'No outstanding balance'}
                </Button>
              </div>
            </Card>

            <AdjustmentHistoryTable adjustments={adjustments} currency={currency} />
          </>
        ) : null}
      </div>
    </Dialog>
  )
}
