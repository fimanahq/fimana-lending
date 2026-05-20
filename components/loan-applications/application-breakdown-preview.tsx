import { useEffect, useState } from 'react'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import type {
  LoanApplicationComputedPreviewSnapshot,
  LoanApplicationPreviewSnapshot,
  LoanSchedulePreviewRow,
} from '@/lib/types'
import { Card, DataTable, TableShell } from '@/components/shared'
import { CheckIcon, CopyIcon } from '@/components/shared/table-icons'

interface ApplicationBreakdownPreviewProps {
  borrowerName?: string
  calculationMethod?: string | null
  preview: LoanApplicationComputedPreviewSnapshot | LoanApplicationPreviewSnapshot | null
}

function isComputedPreview(
  preview: LoanApplicationComputedPreviewSnapshot | LoanApplicationPreviewSnapshot,
): preview is LoanApplicationComputedPreviewSnapshot {
  return 'principalAmountMinor' in preview
}

function formatMinorCurrency(value: number, currency: string) {
  return formatCurrency(value / 100, currency)
}

function toFiniteNumber(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`
}

function formatCalculationMethod(method?: string | null) {
  return {
    diminishing_balance: 'Reducing balance',
    reducing_balance: 'Reducing balance',
    flat: 'Flat rate',
    flat_rate: 'Flat rate',
    interest_only: 'Interest only',
    simple_interest: 'Simple interest',
    fixed_total_interest: 'Fixed Total Interest',
  }[method ?? ''] ?? 'Reducing balance'
}

function getSchedule(preview: LoanApplicationComputedPreviewSnapshot | LoanApplicationPreviewSnapshot): LoanSchedulePreviewRow[] {
  if (isComputedPreview(preview)) {
    return preview.installments.map((installment) => ({
      sequence: installment.sequence,
      dueDate: installment.dueDate,
      beginningBalance: (installment.principalAmountMinor + installment.closingPrincipalBalanceMinor) / 100,
      interest: installment.interestAmountMinor / 100,
      principalPaid: installment.principalAmountMinor / 100,
      endingBalance: installment.closingPrincipalBalanceMinor / 100,
      totalPayment: installment.totalAmountMinor / 100,
    }))
  }

  return preview.schedule ?? []
}

export function ApplicationBreakdownPreview({
  borrowerName,
  calculationMethod: requestedCalculationMethod,
  preview,
}: ApplicationBreakdownPreviewProps) {
  const [scheduleCopyStatus, setScheduleCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (scheduleCopyStatus === 'idle') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setScheduleCopyStatus('idle')
    }, 2000)

    return () => window.clearTimeout(timeoutId)
  }, [scheduleCopyStatus])

  if (!preview) {
    return (
      <Card
        title="Computed breakdown preview"
        description="Run the backend preview before submitting. The application stores the returned snapshot for review."
      >
        <div className="state-card state-card--empty">
          <div>
            <strong>No preview yet</strong>
            <p>Enter the application terms, then request the backend calculation preview.</p>
          </div>
        </div>
      </Card>
    )
  }

  const currency = preview.currency || 'PHP'
  const principal = isComputedPreview(preview) ? preview.principalAmountMinor / 100 : preview.principal
  const gives = isComputedPreview(preview) ? preview.installmentCount : preview.gives
  const frequency = isComputedPreview(preview) ? preview.frequency : preview.paymentFrequency
  const paymentDays = preview.paymentDays
  const firstDueDate = isComputedPreview(preview) ? preview.firstDueDate : preview.firstPaymentDate
  const interestRate = toFiniteNumber(
    isComputedPreview(preview)
      ? preview.interestRate ?? preview.interestConfig?.rateBps / 100
      : preview.interestRate,
  )
  const totalInterest = toFiniteNumber(
    isComputedPreview(preview) ? preview.totalInterestAmountMinor / 100 : preview.totalInterest,
  )
  const totalPayment = toFiniteNumber(
    isComputedPreview(preview) ? preview.totalPaymentAmountMinor / 100 : preview.totalPayment,
  )
  const calculationMethod = requestedCalculationMethod ?? (isComputedPreview(preview)
    ? preview.interestConfig?.method
    : preview.calculationMethod)
  const isFixedTotalInterest = calculationMethod === 'fixed_total_interest'
  const overallProfitPercentage = totalInterest !== null && principal > 0
    ? (totalInterest / principal) * 100
    : null
  const processingFee = isComputedPreview(preview) ? preview.processingFeeAmountMinor : null
  const netDisbursement = isComputedPreview(preview) ? preview.netDisbursementAmountMinor : null
  const schedule = getSchedule(preview)
  const scheduleCopyLabel = scheduleCopyStatus === 'success'
    ? 'Copied'
    : scheduleCopyStatus === 'error'
      ? 'Copy failed'
      : 'Copy payment schedule preview'
  const scheduleCopyAnnouncement = scheduleCopyStatus === 'success'
    ? 'Payment schedule preview copied to clipboard.'
    : scheduleCopyStatus === 'error'
      ? 'Unable to copy payment schedule preview.'
      : ''

  const handleCopySchedule = async () => {
    const scheduleRows = schedule.map((row) => [
      `#${row.sequence}`,
      formatDate(row.dueDate),
      formatCurrency(row.principalPaid, currency),
      formatCurrency(row.interest, currency),
      formatCurrency(row.totalPayment, currency),
      formatCurrency(row.endingBalance, currency),
    ])

    const clipboardText = [
      ['Borrower', borrowerName || 'Not provided'],
      ['Overall Profit %', overallProfitPercentage !== null ? formatPercentage(overallProfitPercentage) : 'Not returned'],
      ['Interest Rate', interestRate !== null ? formatPercentage(interestRate) : 'Not returned'],
      ['Overall Profit', totalInterest !== null ? formatCurrency(totalInterest, currency) : 'Not returned'],
      ['Installment', 'Due date', 'Principal', 'Interest', 'Total', 'Ending Balance'],
      ...scheduleRows,
    ].map((row) => row.join('\t')).join('\n')

    try {
      await navigator.clipboard.writeText(clipboardText)
      setScheduleCopyStatus('success')
    } catch {
      setScheduleCopyStatus('error')
    }
  }

  return (
    <Card
      title="Computed breakdown preview"
      description="Values below come from the backend calculation preview and are not recomputed in the UI."
    >
      <div className="application-summary-grid">
        <div className="data-card">
          <span className="muted">Principal</span>
          <strong>{formatCurrency(principal, currency)}</strong>
        </div>
        <div className="data-card">
          <span className="muted">{isFixedTotalInterest ? 'Whole-loan Interest Rate' : 'Interest Rate'}</span>
          <strong>{interestRate !== null ? `${interestRate}%` : 'Not returned'}</strong>
          <span className="muted">{isFixedTotalInterest ? 'Loan term' : 'Per cutoff'}</span>
        </div>
        <div className="data-card">
          <span className="muted">Calculation Method</span>
          <strong>{formatCalculationMethod(calculationMethod)}</strong>
        </div>
        <div className="data-card">
          <span className="muted">Total Interest</span>
          <strong>{totalInterest !== null ? formatCurrency(totalInterest, currency) : 'Not returned'}</strong>
        </div>
        <div className="data-card">
          <span className="muted">Overall Profit %</span>
          <strong>{overallProfitPercentage !== null ? formatPercentage(overallProfitPercentage) : 'Not returned'}</strong>
        </div>
        <div className="data-card">
          <span className="muted">{isFixedTotalInterest ? 'Total Payable' : 'Total Payment'}</span>
          <strong>{totalPayment !== null ? formatCurrency(totalPayment, currency) : 'Not returned'}</strong>
        </div>
        {isFixedTotalInterest ? (
          <div className="data-card">
            <span className="muted">Payment per cutoff</span>
            <strong>{schedule[0] ? formatCurrency(schedule[0].totalPayment, currency) : 'Not returned'}</strong>
          </div>
        ) : null}
      </div>

      {processingFee !== null && netDisbursement !== null ? (
        <div className="grid two">
          <div>
            <div className="muted">Processing fee</div>
            <strong>{formatMinorCurrency(processingFee, currency)}</strong>
          </div>
          <div>
            <div className="muted">Net disbursement</div>
            <strong>{formatMinorCurrency(netDisbursement, currency)}</strong>
          </div>
        </div>
      ) : null}

      <div className="grid two">
        <div>
          <div className="muted">Payment frequency</div>
          <strong>{frequency === 'monthly' ? 'Monthly' : 'Semi-monthly'}</strong>
        </div>
        <div>
          <div className="muted">Payment days</div>
          <strong>{paymentDays.map(formatPaymentDay).join(' and ')}</strong>
        </div>
        <div>
          <div className="muted">First payment</div>
          <strong>{formatDate(firstDueDate)}</strong>
        </div>
        <div>
          <div className="muted">Cutoffs</div>
          <strong>{gives}</strong>
        </div>
      </div>

      <TableShell
        label="Computed payment schedule preview"
        title="Payment schedule preview"
        actions={(
          <>
            <button
              type="button"
              className={`button-ghost table-action-icon table-copy-button${scheduleCopyStatus === 'success' ? ' is-success' : ''}${scheduleCopyStatus === 'error' ? ' is-error' : ''}`}
              aria-label={scheduleCopyLabel}
              title={scheduleCopyLabel}
              onClick={() => void handleCopySchedule()}
              disabled={schedule.length === 0}
            >
              {scheduleCopyStatus === 'success' ? <CheckIcon /> : <CopyIcon />}
            </button>
            <span className="ui-sr-only" aria-live="polite">{scheduleCopyAnnouncement}</span>
          </>
        )}
      >
        <DataTable>
          <thead>
            <tr>
              <th>#</th>
              <th>Due Date</th>
              <th>Beginning Balance</th>
              <th>Interest</th>
              <th>Principal</th>
              <th>Total Payment</th>
              <th>Ending Balance</th>
            </tr>
          </thead>
          <tbody>
            {schedule.length > 0 ? (
              schedule.map((row) => (
                <tr key={row.sequence}>
                  <td>{row.sequence}</td>
                  <td>{formatDate(row.dueDate)}</td>
                  <td>{formatCurrency(row.beginningBalance, currency)}</td>
                  <td>{formatCurrency(row.interest, currency)}</td>
                  <td>{formatCurrency(row.principalPaid, currency)}</td>
                  <td>{formatCurrency(row.totalPayment, currency)}</td>
                  <td>{formatCurrency(row.endingBalance, currency)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="muted">The backend preview did not include schedule rows.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </TableShell>
    </Card>
  )
}
