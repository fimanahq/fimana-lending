'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, DataTable, Dialog, EmptyState, ErrorBanner, Input, LoadingState, Select, TableShell } from '@/components/shared'
import { formatCurrency, formatDate } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type {
  LoanPaymentDetail,
  LoanPaymentHistory,
  LoanPaymentMethod,
  LoanRecord,
} from '@/lib/types'
import { getLoanPaymentDetail, postLoanPayment } from '@/services'

const paymentMethodOptions: Array<{ value: LoanPaymentMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'ewallet', label: 'E-wallet' },
  { value: 'internal_offset', label: 'Internal offset' },
]

function formatMinorCurrency(value: number, currency: string) {
  return formatCurrency(value / 100, currency)
}

function formatPaymentMethod(value: string) {
  return value
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
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

function LoanSummary({ loan }: { loan: LoanRecord }) {
  const currency = loan.loanProduct.currency || 'PHP'
  const openScheduleRows = (loan.schedule ?? []).filter((row) => row.outstandingTotalAmountMinor > 0)

  return (
    <Card
      title={`${loan.borrower.displayName} · ${loan.loanNumber}`}
      actions={<span className={getStatusClassName(loan.status)}>{loan.status}</span>}
    >
      <div className="application-summary-grid">
        <div className="data-card">
          <span className="muted">Outstanding</span>
          <strong>{formatMinorCurrency(loan.balances.totalOutstandingAmountMinor, currency)}</strong>
        </div>
        <div className="data-card">
          <span className="muted">Paid</span>
          <strong>{formatMinorCurrency(loan.balances.totalPaidAmountMinor, currency)}</strong>
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
  )
}

function PaymentHistoryTable({
  payments,
  currency,
}: {
  payments: LoanPaymentHistory[]
  currency: string
}) {
  return (
    <TableShell label="Recent posted payments">
      <DataTable>
        <thead>
          <tr>
            <th>Date</th>
            <th>Receipt</th>
            <th>Method</th>
            <th>Allocated</th>
            <th>Unallocated</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">No payments have been posted yet.</td>
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
                </tr>
              )
            })
          )}
        </tbody>
      </DataTable>
    </TableShell>
  )
}

export interface LoanPaymentDialogProps {
  loanId: string
  loanLabel?: string
  onClose: () => void
  onPaymentPosted?: () => Promise<void> | void
  open: boolean
}

export function LoanPaymentDialog({
  loanId,
  loanLabel,
  onClose,
  onPaymentPosted,
  open,
}: LoanPaymentDialogProps) {
  const [detail, setDetail] = useState<LoanPaymentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paymentDate, setPaymentDate] = useState(todayDateValue())
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<LoanPaymentMethod>('cash')
  const [referenceNo, setReferenceNo] = useState('')

  const loadDetail = useCallback(async () => {
    if (!loanId) {
      setDetail(null)
      return
    }

    setLoading(true)
    setDetailError('')

    try {
      setDetail(await getLoanPaymentDetail(loanId))
    } catch (caughtError) {
      setDetailError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan payment detail')
    } finally {
      setLoading(false)
    }
  }, [loanId])

  useEffect(() => {
    if (!open) {
      return
    }

    void loadDetail()
  }, [loadDetail, open])

  useEffect(() => {
    if (!open) {
      setPaymentDate(todayDateValue())
      setAmount('')
      setMethod('cash')
      setReferenceNo('')
      setSubmitError('')
    }
  }, [open])

  const handleSubmit = async () => {
    const amountMinor = toAmountMinor(amount)
    if (!amountMinor || amountMinor <= 0) {
      setSubmitError('Enter a payment amount greater than 0')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const response = await postLoanPayment(loanId, {
        paymentDate,
        amountMinor,
        method,
        referenceNo: referenceNo.trim() || undefined,
      })

      setDetail({
        loan: response.loan,
        payments: response.payments,
      })
      setAmount('')
      setReferenceNo('')
      await onPaymentPosted?.()
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Unable to post payment')
    } finally {
      setSubmitting(false)
    }
  }

  const loan = detail?.loan ?? null
  const currency = loan?.loanProduct.currency || 'PHP'
  const openScheduleRows = (loan?.schedule ?? []).filter((row) => row.outstandingTotalAmountMinor > 0)

  return (
    <Dialog
      id="loan-payment-dialog"
      open={open}
      onClose={onClose}
      title='Post Payment'
      className="loan-payment-dialog"
    >
      <div className="stack">
        {loading ? (
          <LoadingState title="Loading loan payment detail" description="Fetching schedule rows and payment history." />
        ) : null}

        {detailError ? (
          <ErrorBanner
            title="Unable to load loan payment detail"
            message={detailError}
            action={<Button variant="secondary" onClick={() => void loadDetail()}>Retry</Button>}
          />
        ) : null}

        {!loading && !detailError && !loan ? (
          <EmptyState
            title="Loan not available"
            description="The loan payment record could not be loaded."
          />
        ) : null}

        {loan ? (
          <>
            <LoanSummary loan={loan} />

            <Card
              variant="flat"
              className="loan-payment-form-card"
            >
              {submitError ? <ErrorBanner title="Unable to post payment" message={submitError} /> : null}

              <div className="grid two">
                <Input
                  id="payment-date"
                  label="Payment date"
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                />
                <Input
                  id="payment-amount"
                  label="Amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <Select
                  id="payment-method"
                  label="Method"
                  value={method}
                  onChange={(event) => setMethod(event.target.value as LoanPaymentMethod)}
                >
                  {paymentMethodOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
                <Input
                  id="payment-reference"
                  label="Reference number"
                  value={referenceNo}
                  onChange={(event) => setReferenceNo(event.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="ui-card__actions" style={{ justifyContent: 'flex-start' }}>
                <Button onClick={() => void handleSubmit()} disabled={submitting}>
                  {submitting ? 'Posting…' : 'Post payment'}
                </Button>
              </div>
            </Card>

            <TableShell label={`${loan.loanNumber} open schedule rows`}>
              <DataTable>
                <thead>
                  <tr>
                    <th>Installment</th>
                    <th>Due date</th>
                    <th>Outstanding principal</th>
                    <th>Outstanding interest</th>
                    <th>Outstanding total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {openScheduleRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">No open schedule rows remain.</td>
                    </tr>
                  ) : (
                    openScheduleRows.map((row) => (
                      <tr key={row.id}>
                        <td>#{row.sequence}</td>
                        <td>{formatDate(row.dueDate)}</td>
                        <td>{formatMinorCurrency(row.outstandingPrincipalAmountMinor, currency)}</td>
                        <td>{formatMinorCurrency(row.outstandingInterestAmountMinor, currency)}</td>
                        <td>{formatMinorCurrency(row.outstandingTotalAmountMinor, currency)}</td>
                        <td><span className={getStatusClassName(row.status)}>{row.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </TableShell>

            <PaymentHistoryTable payments={detail?.payments ?? []} currency={currency} />
          </>
        ) : null}
      </div>
    </Dialog>
  )
}
