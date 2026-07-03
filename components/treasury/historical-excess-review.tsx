'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  EmptyState,
  ErrorBanner,
  LoadingState,
  PageContainer,
  Pagination,
  ProtectedLink,
  TableShell,
  useToast,
} from '@/components/shared'
import { formatCurrency, formatDate } from '@/lib/format'
import type { UnallocatedPaymentReview } from '@/services/treasury'
import { classifyHistoricalExcessAsProfit, getUnallocatedPaymentReviews } from '@/services/treasury'
import styles from './historical-excess-review.module.css'

export function HistoricalExcessReview() {
  const { dismiss, loading: showLoading, update } = useToast()
  const [payments, setPayments] = useState<UnallocatedPaymentReview[]>([])
  const [selectedPayment, setSelectedPayment] = useState<UnallocatedPaymentReview | null>(null)
  const [creditTreasury, setCreditTreasury] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadPayments = useCallback(async () => {
    const result = await getUnallocatedPaymentReviews(page)
    setPayments(result.items)
    setTotal(result.total)
    setTotalPages(result.totalPages)
    if (result.total > 0 && page > Math.max(result.totalPages, 1)) {
      setPage(Math.max(result.totalPages, 1))
    }
  }, [page])

  useEffect(() => {
    void loadPayments()
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'Unable to load historical excess payments.'))
      .finally(() => setLoading(false))
  }, [loadPayments])

  const handleConvert = async () => {
    if (!selectedPayment) return
    setSubmitting(true)
    setError('')
    const toastId = showLoading('Converting historical excess...')
    try {
      await classifyHistoricalExcessAsProfit(selectedPayment.loanId, selectedPayment.id, creditTreasury)
      await loadPayments()
      setSelectedPayment(null)
      setCreditTreasury(false)
      update(toastId, 'Historical excess classified as profit.', { tone: 'success', title: 'Success' })
    } catch (caughtError) {
      dismiss(toastId)
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to classify payment excess.')
    } finally {
      setSubmitting(false)
    }
  }

  const pageTotalMinor = payments.reduce((sum, payment) => sum + payment.unallocatedAmountMinor, 0)
  const currency = payments[0]?.currency ?? 'PHP'
  const selectedPaymentIsAlreadyInTreasury = Boolean(
    selectedPayment?.accountId && selectedPayment?.transactionId,
  )

  return (
    <PageContainer className="stack">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Treasury review</p>
          <h1>Historical Excess Review</h1>
          <p className="muted">Review each unallocated historical payment before permanently recognizing it as profit.</p>
        </div>
        <ProtectedLink href="/treasury" className="button-secondary ui-button">Back to Treasury</ProtectedLink>
      </header>

      {error ? <ErrorBanner title="Historical excess review failed" message={error} /> : null}
      {loading ? <LoadingState title="Loading historical excess" description="Fetching unallocated payment records." /> : null}

      {!loading && payments.length === 0 ? (
        <EmptyState title="No historical excess to review" description="All historical payments have been classified." />
      ) : null}

      {!loading && payments.length > 0 ? (
        <TableShell
          label="Historical unallocated payment review"
          title={`${payments.length.toLocaleString('en-PH')} payment${payments.length === 1 ? '' : 's'} on this page · ${formatCurrency(pageTotalMinor / 100, currency)}`}
        >
          <table>
            <thead><tr><th>Payment</th><th>Loan</th><th>Date</th><th>Unallocated</th><th>Action</th></tr></thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.receiptNumber}</td>
                  <td>
                    <ProtectedLink href={`/loans/${payment.loanId}`} className={styles.loanLink}>
                      {payment.loanNumber}
                    </ProtectedLink>
                  </td>
                  <td>{formatDate(payment.paymentDate)}</td>
                  <td>{formatCurrency(payment.unallocatedAmountMinor / 100, payment.currency)}</td>
                  <td><Button variant="secondary" onClick={() => setSelectedPayment(payment)}>Review</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      ) : null}

      {!loading && total > 0 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          itemLabel="payments"
          loading={loading}
          onPageChange={setPage}
        />
      ) : null}

      <Dialog
        id="historical-excess-confirmation-dialog"
        open={Boolean(selectedPayment)}
        title="Convert excess to profit?"
        description="This permanently recognizes the selected amount as non-refundable earned profit."
        onClose={() => {
          if (!submitting) {
            setSelectedPayment(null)
            setCreditTreasury(false)
          }
        }}
      >
        {selectedPayment ? (
          <div className="stack">
            <div className="notice danger">
              {formatCurrency(selectedPayment.unallocatedAmountMinor / 100, selectedPayment.currency)} from {selectedPayment.receiptNumber} will no longer be treated as unallocated.
              {creditTreasury
                ? ' The amount will also be credited to Treasury.'
                : ' Treasury cash will remain unchanged.'}
            </div>
            <Checkbox
              id="credit-historical-excess-to-treasury"
              checked={creditTreasury}
              disabled={selectedPaymentIsAlreadyInTreasury}
              onChange={(event) => setCreditTreasury(event.target.checked)}
              label="Credit this amount to Treasury"
              description={selectedPaymentIsAlreadyInTreasury
                ? 'This payment is already linked to Treasury, so another credit is not allowed.'
                : 'Select this only when the original payment cash is not already included in the current Treasury balance.'}
            />
            <div className="ui-card__actions">
              <Button variant="secondary" disabled={submitting} onClick={() => { setSelectedPayment(null); setCreditTreasury(false) }}>Cancel</Button>
              <Button disabled={submitting} onClick={() => void handleConvert()}>{submitting ? 'Converting…' : 'Confirm profit'}</Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </PageContainer>
  )
}
