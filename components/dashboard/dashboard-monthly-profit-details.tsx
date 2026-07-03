'use client'

import { Dialog, ProtectedLink as Link } from '@/components/shared'
import { ViewIcon } from '@/components/shared/table-icons'
import { formatCurrency, formatDate } from '@/lib/format'
import { buildLoanDetailPath } from '@/lib/loan-navigation'
import type {
  DashboardMonthlyProfitDetailResponse,
  DashboardMonthlyProfitRow,
  LoanStatus,
} from '@/lib/types/lending'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
}

function formatMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)))
}

function getLoanStatusLabel(status: LoanStatus) {
  return status.split('_').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

function ProfitMetric({ label, meta, value }: { label: string; meta: string; value: string }) {
  return (
    <article className={dashboardClass('dashboard-overview__miniCard')}>
      <span className={dashboardClass('dashboard-overview__statLabel')}>{label}</span>
      <strong className={dashboardClass('dashboard-overview__miniValue')}>{value}</strong>
      <span className={dashboardClass('dashboard-overview__miniMeta')}>{meta}</span>
    </article>
  )
}

export function DashboardMonthlyProfitTable({
  currency,
  onSelectMonth,
  rows,
}: {
  currency: string
  onSelectMonth: (row: DashboardMonthlyProfitRow) => void
  rows: DashboardMonthlyProfitRow[]
}) {
  return (
    <section className={dashboardClass('dashboard-overview__cutoffDialogTableSection')}>
      <div className={dashboardClass('dashboard-overview__cutoffDialogTableHeader')}>
        <h3>Monthly breakdown</h3>
        <p>Scheduled interest due and realized collections for every month in the selected year.</p>
      </div>
      <div className={dashboardClass('dashboard-overview__tableScroll')}>
        <table className={dashboardClass('dashboard-overview__table', 'dashboard-overview__table--compact')}>
          <thead>
            <tr>
              <th>Month</th>
              <th className={dashboardClass('dashboard-overview__tableAmount')}>Interest due</th>
              <th className={dashboardClass('dashboard-overview__tableAmount')}>Interest collected</th>
              <th className={dashboardClass('dashboard-overview__tableAmount')}>Penalty collected</th>
              <th className={dashboardClass('dashboard-overview__tableAmount')}>Excess profit</th>
              <th className={dashboardClass('dashboard-overview__tableAmount')}>Treasury interest</th>
              <th className={dashboardClass('dashboard-overview__tableAmount')}>Realized profit</th>
              <th className={dashboardClass('dashboard-overview__tableAmount')}>Payments</th>
              <th className={dashboardClass('dashboard-overview__tableActions')}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const hasDetails = row.interestDueMinor !== 0
                || row.interestCollectedMinor !== 0
                || row.penaltyCollectedMinor !== 0
                || (row.excessProfitMinor ?? 0) !== 0
                || (row.treasuryInterestEarnedMinor ?? 0) !== 0
                || row.paymentCount !== 0

              return (
                <tr key={row.monthKey}>
                  <td>{row.monthLabel}</td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(row.interestDueMinor, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(row.interestCollectedMinor, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(row.penaltyCollectedMinor, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(row.excessProfitMinor ?? 0, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(row.treasuryInterestEarnedMinor ?? 0, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(row.totalProfitMinor, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {row.paymentCount.toLocaleString('en-PH')}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableActions')}>
                    <button
                      type="button"
                      className="button-ghost table-action-icon"
                      aria-label={`View ${row.monthLabel} profit details`}
                      disabled={!hasDetails}
                      onClick={() => onSelectMonth(row)}
                    >
                      <ViewIcon />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function DashboardMonthlyProfitDetailDialog({
  currency,
  detail,
  error,
  loading,
  onClose,
  selectedRow,
}: {
  currency: string
  detail: DashboardMonthlyProfitDetailResponse | null
  error: string | null
  loading: boolean
  onClose: () => void
  selectedRow: DashboardMonthlyProfitRow | null
}) {
  const selectedMonth = selectedRow ? Number(selectedRow.monthKey.slice(5, 7)) : null
  const selectedYear = selectedRow ? Number(selectedRow.monthKey.slice(0, 4)) : null
  const title = selectedMonth && selectedYear
    ? `${formatMonthLabel(selectedYear, selectedMonth)} profit details`
    : 'Monthly profit details'
  const summary = detail?.summary ?? selectedRow

  return (
    <Dialog
      id="dashboard-monthly-profit-detail-dialog"
      open={selectedRow !== null}
      title={title}
      description="Interest due follows schedule due dates. Realized profit follows posted payment dates."
      onClose={onClose}
      className={dashboardClass('dashboard-overview__cutoffDialog')}
    >
      <div className={dashboardClass('dashboard-overview__cutoffDialogContent')}>
        {summary ? (
          <div className={dashboardClass('dashboard-overview__cutoffDialogSummary')}>
            <ProfitMetric label="Interest due" value={formatMinorCurrency(summary.interestDueMinor, currency)} meta="Scheduled in this month" />
            <ProfitMetric label="Interest collected" value={formatMinorCurrency(summary.interestCollectedMinor, currency)} meta="Posted in this month" />
            <ProfitMetric label="Penalty collected" value={formatMinorCurrency(summary.penaltyCollectedMinor, currency)} meta="Posted in this month" />
            <ProfitMetric label="Excess profit" value={formatMinorCurrency(summary.excessProfitMinor ?? 0, currency)} meta="Confirmed non-refundable excess" />
            <ProfitMetric label="Treasury interest" value={formatMinorCurrency(summary.treasuryInterestEarnedMinor ?? 0, currency)} meta="Earned by the Treasury account" />
            <ProfitMetric label="Realized profit" value={formatMinorCurrency(summary.totalProfitMinor, currency)} meta="All recognized profit sources" />
            <ProfitMetric label="Payments" value={summary.paymentCount.toLocaleString('en-PH')} meta="Posted payment records" />
          </div>
        ) : null}

        {loading ? (
          <div className="notice" role="status" aria-live="polite">Loading monthly profit details...</div>
        ) : null}
        {error ? <div className="notice" role="alert">{error}</div> : null}

        {!loading && !error && detail ? (
          <>
            <section className={dashboardClass('dashboard-overview__cutoffDialogTableSection')}>
              <div className={dashboardClass('dashboard-overview__cutoffDialogTableHeader')}>
                <h3>Interest due by loan</h3>
                <p>Current schedule-version rows due in this month.</p>
              </div>
              {detail.interestDueLoans.length > 0 ? (
                <div className={dashboardClass('dashboard-overview__cutoffDialogTableWrap')}>
                  <table className={dashboardClass('dashboard-overview__table', 'dashboard-overview__table--compact')}>
                    <thead>
                      <tr>
                        <th>Borrower</th>
                        <th>Loan</th>
                        <th>Status</th>
                        <th className={dashboardClass('dashboard-overview__tableAmount')}>Cutoffs</th>
                        <th className={dashboardClass('dashboard-overview__tableAmount')}>Interest due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.interestDueLoans.map((loan) => (
                        <tr key={loan.loanId}>
                          <td>
                            <div className={dashboardClass('dashboard-overview__loanCell')}>
                              <Link href={buildLoanDetailPath(loan.loanId, '/dashboard')} className="data-card__titleLink" onClick={onClose}>
                                {loan.borrowerDisplayName}
                              </Link>
                              <span className="muted micro-copy">{loan.borrowerNumber}</span>
                            </div>
                          </td>
                          <td>
                            <Link href={buildLoanDetailPath(loan.loanId, '/dashboard')} className="data-card__titleLink" onClick={onClose}>
                              {loan.loanNumber}
                            </Link>
                          </td>
                          <td><span className={dashboardClass('dashboard-overview__statusBadge')}>{getLoanStatusLabel(loan.loanStatus)}</span></td>
                          <td className={dashboardClass('dashboard-overview__tableAmount')}>{loan.cutoffCount.toLocaleString('en-PH')}</td>
                          <td className={dashboardClass('dashboard-overview__tableAmount')}>{formatMinorCurrency(loan.interestDueMinor, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="muted">No scheduled interest is due in this month.</p>}
            </section>

            <section className={dashboardClass('dashboard-overview__cutoffDialogTableSection')}>
              <div className={dashboardClass('dashboard-overview__cutoffDialogTableHeader')}>
                <h3>Realized payments</h3>
                <p>Posted payments whose payment date falls in this month.</p>
              </div>
              {detail.realizedPayments.length > 0 ? (
                <div className={dashboardClass('dashboard-overview__cutoffDialogTableWrap')}>
                  <table className={dashboardClass('dashboard-overview__table', 'dashboard-overview__table--compact')}>
                    <thead>
                      <tr>
                        <th>Payment date</th>
                        <th>Receipt</th>
                        <th>Borrower</th>
                        <th>Loan</th>
                        <th>Status</th>
                        <th className={dashboardClass('dashboard-overview__tableAmount')}>Interest</th>
                        <th className={dashboardClass('dashboard-overview__tableAmount')}>Penalty</th>
                        <th className={dashboardClass('dashboard-overview__tableAmount')}>Excess profit</th>
                        <th className={dashboardClass('dashboard-overview__tableAmount')}>Realized profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.realizedPayments.map((payment) => (
                        <tr key={payment.paymentId}>
                          <td>{formatDate(payment.paymentDate)}</td>
                          <td>{payment.receiptNumber}</td>
                          <td>
                            <div className={dashboardClass('dashboard-overview__loanCell')}>
                              <Link href={buildLoanDetailPath(payment.loanId, '/dashboard')} className="data-card__titleLink" onClick={onClose}>
                                {payment.borrowerDisplayName}
                              </Link>
                              <span className="muted micro-copy">{payment.borrowerNumber}</span>
                            </div>
                          </td>
                          <td><Link href={buildLoanDetailPath(payment.loanId, '/dashboard')} className="data-card__titleLink" onClick={onClose}>{payment.loanNumber}</Link></td>
                          <td><span className={dashboardClass('dashboard-overview__statusBadge')}>{getLoanStatusLabel(payment.loanStatus)}</span></td>
                          <td className={dashboardClass('dashboard-overview__tableAmount')}>{formatMinorCurrency(payment.interestCollectedMinor, currency)}</td>
                          <td className={dashboardClass('dashboard-overview__tableAmount')}>{formatMinorCurrency(payment.penaltyCollectedMinor, currency)}</td>
                          <td className={dashboardClass('dashboard-overview__tableAmount')}>{formatMinorCurrency(payment.excessProfitMinor, currency)}</td>
                          <td className={dashboardClass('dashboard-overview__tableAmount')}>{formatMinorCurrency(payment.totalProfitMinor, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="muted">No realized payments were posted in this month.</p>}
            </section>
          </>
        ) : null}
      </div>
    </Dialog>
  )
}
