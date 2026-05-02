'use client'

import { useEffect, useState } from 'react'
import { Button, Card, EmptyState, ErrorBanner, Input, LoadingState, SectionHeader, Select, TableShell } from '@/components/shared'
import { formatCurrency, formatDate } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type {
  LoanRecord,
  LoanPaymentDetail,
  LoanPaymentHistory,
  LoanPaymentMethod,
  LoanPaymentQueueItem,
} from '@/lib/types'
import { getLoanPaymentDetail, listLoanPaymentQueue, postLoanPayment } from '@/services'

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

function QueueTable({
  items,
  selectedLoanId,
  onSelect,
}: {
  items: LoanPaymentQueueItem[]
  selectedLoanId: string
  onSelect: (loanId: string) => void
}) {
  return (
    <TableShell label="Active loans available for payment posting">
      <table>
        <thead>
          <tr>
            <th>Borrower</th>
            <th>Loan</th>
            <th>Next due</th>
            <th>Outstanding</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.loanId}>
              <td>
                <strong>{item.borrowerDisplayName}</strong>
                <div className="muted">{item.borrowerNumber}</div>
              </td>
              <td>{item.loanNumber}</td>
              <td>{item.nextDueDate ? formatDate(item.nextDueDate) : 'Completed'}</td>
              <td>{formatMinorCurrency(item.totalOutstandingAmountMinor, item.currency)}</td>
              <td><span className={getStatusClassName(item.status)}>{item.status}</span></td>
              <td>
                <Button
                  size="sm"
                  variant={selectedLoanId === item.loanId ? 'primary' : 'secondary'}
                  onClick={() => onSelect(item.loanId)}
                >
                  {selectedLoanId === item.loanId ? 'Selected' : 'Open'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  )
}

function LoanSummary({ loan }: { loan: LoanRecord }) {
  const currency = loan.loanProduct.currency || 'PHP'
  const openScheduleRows = (loan.schedule ?? []).filter((row) => row.outstandingTotalAmountMinor > 0)

  return (
    <Card
      title={`${loan.borrower.displayName} · ${loan.loanNumber}`}
      description="Post partial, exact, catch-up, or larger-than-scheduled payments. Allocation and balances come from the backend."
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
      <table>
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
      </table>
    </TableShell>
  )
}

export function PaymentsWorkspace() {
  const [queue, setQueue] = useState<LoanPaymentQueueItem[]>([])
  const [selectedLoanId, setSelectedLoanId] = useState('')
  const [detail, setDetail] = useState<LoanPaymentDetail | null>(null)
  const [queueLoading, setQueueLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [queueError, setQueueError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paymentDate, setPaymentDate] = useState(todayDateValue())
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<LoanPaymentMethod>('cash')
  const [referenceNo, setReferenceNo] = useState('')

  const loadDetail = async (loanId: string) => {
    setDetailLoading(true)
    setDetailError('')

    try {
      setDetail(await getLoanPaymentDetail(loanId))
    } catch (caughtError) {
      setDetailError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan payment detail')
    } finally {
      setDetailLoading(false)
    }
  }

  const loadQueue = async () => {
    setQueueLoading(true)
    setQueueError('')

    try {
      const nextQueue = await listLoanPaymentQueue()
      setQueue(nextQueue)
      setSelectedLoanId((current) => current || nextQueue[0]?.loanId || '')
    } catch (caughtError) {
      setQueueError(caughtError instanceof Error ? caughtError.message : 'Unable to load payment queue')
    } finally {
      setQueueLoading(false)
    }
  }

  useEffect(() => {
    void loadQueue()
  }, [])

  useEffect(() => {
    if (!selectedLoanId) {
      setDetail(null)
      return
    }

    void loadDetail(selectedLoanId)
  }, [selectedLoanId])

  const handleSubmit = async () => {
    if (!selectedLoanId) {
      setSubmitError('Select a loan before posting a payment')
      return
    }

    const amountMinor = toAmountMinor(amount)
    if (!amountMinor || amountMinor <= 0) {
      setSubmitError('Enter a payment amount greater than 0')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const response = await postLoanPayment(selectedLoanId, {
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
      await loadQueue()
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Unable to post payment')
    } finally {
      setSubmitting(false)
    }
  }

  if (queueLoading) {
    return <LoadingState title="Loading payments" description="Fetching the active-loan payment queue." />
  }

  const loan = detail?.loan ?? null
  const currency = loan?.loanProduct.currency || 'PHP'
  const openScheduleRows = (loan?.schedule ?? []).filter((row) => row.outstandingTotalAmountMinor > 0)

  return (
    <div className="stack">
      <SectionHeader
        eyebrow="Payments"
        title="Post borrower payments"
        description="Use this workspace for real payment posting. Collections follow-up stays separate."
        actions={<Button variant="secondary" onClick={() => void loadQueue()}>Refresh queue</Button>}
      />

      {queueError ? (
        <ErrorBanner
          title="Unable to load payment queue"
          message={queueError}
          action={<Button variant="secondary" onClick={() => void loadQueue()}>Retry</Button>}
        />
      ) : null}

      {queue.length === 0 ? (
        <EmptyState
          title="No active loans need payment posting"
          description="Loans appear here after approval, auto-disbursement, and schedule generation."
        />
      ) : (
        <QueueTable items={queue} selectedLoanId={selectedLoanId} onSelect={setSelectedLoanId} />
      )}

      {detailLoading ? (
        <LoadingState title="Loading loan payment detail" description="Fetching schedule rows and payment history." />
      ) : null}

      {detailError ? (
        <ErrorBanner
          title="Unable to load loan payment detail"
          message={detailError}
          action={selectedLoanId ? <Button variant="secondary" onClick={() => void loadDetail(selectedLoanId)}>Retry</Button> : null}
        />
      ) : null}

      {loan ? (
        <>
          <LoanSummary loan={loan} />

          <Card title="Post payment" description="Amounts can be partial, exact, catch-up, or greater than the current scheduled amount.">
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
                hint={`Enter in ${currency}. The backend allocates the payment across open schedule rows.`}
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
            <table>
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
            </table>
          </TableShell>

          <PaymentHistoryTable payments={detail?.payments ?? []} currency={currency} />
        </>
      ) : null}
    </div>
  )
}
