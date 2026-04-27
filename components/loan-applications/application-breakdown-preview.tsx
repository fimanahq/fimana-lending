import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import type {
  LoanApplicationComputedPreviewSnapshot,
  LoanApplicationPreviewSnapshot,
  LoanSchedulePreviewRow,
} from '@/lib/types'
import { Card, DataTable, TableShell } from '@/components/shared'

interface ApplicationBreakdownPreviewProps {
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

export function ApplicationBreakdownPreview({ preview }: ApplicationBreakdownPreviewProps) {
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
  const interestRate = isComputedPreview(preview) ? preview.interestConfig.rateBps / 100 : preview.interestRate
  const totalInterest = isComputedPreview(preview) ? preview.totalInterestAmountMinor / 100 : preview.totalInterest
  const totalPayment = isComputedPreview(preview) ? preview.totalPaymentAmountMinor / 100 : preview.totalPayment
  const processingFee = isComputedPreview(preview) ? preview.processingFeeAmountMinor : null
  const netDisbursement = isComputedPreview(preview) ? preview.netDisbursementAmountMinor : null
  const schedule = getSchedule(preview)

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
          <span className="muted">Interest Rate</span>
          <strong>{interestRate !== undefined ? `${interestRate}%` : 'Not returned'}</strong>
        </div>
        <div className="data-card">
          <span className="muted">Total Interest</span>
          <strong>{totalInterest !== undefined ? formatCurrency(totalInterest, currency) : 'Not returned'}</strong>
        </div>
        <div className="data-card">
          <span className="muted">Total Payment</span>
          <strong>{totalPayment !== undefined ? formatCurrency(totalPayment, currency) : 'Not returned'}</strong>
        </div>
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

      <TableShell label="Computed payment schedule preview">
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
