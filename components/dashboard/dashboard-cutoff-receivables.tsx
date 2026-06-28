'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { DashboardCutoffInterestChart, type DashboardInterestMonthlyRow } from '@/components/dashboard/dashboard-cutoff-interest-chart'
import { LoanPaymentDialog } from '@/components/payments'
import { Dialog, ProtectedLink as Link, Select } from '@/components/shared'
import { formatCurrency, formatDate } from '@/lib/format'
import { buildLoanDetailPath } from '@/lib/loan-navigation'
import type { DashboardCutoffReceivable, DashboardInterestByCutoff } from '@/lib/types/lending'
import { PaymentIcon, ViewIcon } from '../shared/table-icons'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
}

function getYearKey(dateKey: string) {
  return dateKey.slice(0, 4)
}

function getCurrentYearKey() {
  return String(new Date().getFullYear())
}

function getCurrentMonthCount() {
  return new Date().getMonth() + 1
}

function getMonthCountFromRow(row: DashboardInterestMonthlyRow) {
  return Number(row.monthKey.slice(5, 7))
}

function formatMonthShortLabel(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
  }).format(new Date(Date.UTC(year, monthIndex, 1, 12)))
}

function getNearestYearOption(yearOptions: string[], targetYear: string) {
  const targetValue = Number(targetYear)
  return yearOptions.reduce((nearest, year) => {
    const nearestDistance = Math.abs(Number(nearest) - targetValue)
    const yearDistance = Math.abs(Number(year) - targetValue)
    return yearDistance < nearestDistance ? year : nearest
  }, yearOptions[0] ?? targetYear)
}

function buildMonthlyInterestRows(yearKey: string, interestByCutoff: DashboardInterestByCutoff[]): DashboardInterestMonthlyRow[] {
  const year = Number(yearKey)
  const rows = Array.from({ length: 12 }, (_, monthIndex) => ({
    monthKey: `${yearKey}-${String(monthIndex + 1).padStart(2, '0')}`,
    monthLabel: formatMonthShortLabel(year, monthIndex),
    interestDueMinor: 0,
    interestCollectedMinor: 0,
    remainingInterestMinor: 0,
    cutoffCount: 0,
  }))

  for (const entry of interestByCutoff) {
    if (getYearKey(entry.cutoffDate) !== yearKey) {
      continue
    }

    const monthIndex = Number(entry.cutoffDate.slice(5, 7)) - 1
    const monthRow = rows[monthIndex]
    if (!monthRow) {
      continue
    }

    monthRow.interestDueMinor += entry.interestDueMinor
    monthRow.interestCollectedMinor += entry.interestCollectedMinor
    monthRow.remainingInterestMinor += entry.remainingInterestMinor
    monthRow.cutoffCount += 1
  }

  return rows
}

function getCollectedAverageMonthCount(yearKey: string | null, rows: DashboardInterestMonthlyRow[]) {
  if (!yearKey) {
    return 0
  }

  const lastCollectedMonthCount = rows.reduce((latestMonthCount, row) => {
    if (row.interestCollectedMinor <= 0) {
      return latestMonthCount
    }

    return Math.max(latestMonthCount, getMonthCountFromRow(row))
  }, 0)

  if (yearKey === getCurrentYearKey()) {
    return Math.max(1, Math.min(getCurrentMonthCount(), lastCollectedMonthCount || getCurrentMonthCount()))
  }

  return lastCollectedMonthCount
}

function getReceivableStatusLabel(status: DashboardCutoffReceivable['status']) {
  if (status === 'overdue') {
    return 'Overdue'
  }

  if (status === 'current') {
    return 'Current'
  }

  if (status === 'paid') {
    return 'Paid'
  }

  return 'Upcoming'
}

function getLoanCollectionStatus(loan: DashboardCutoffReceivable['loans'][number]) {
  if (loan.remainingMinor <= 0) {
    return 'paid'
  }

  if (loan.totalCollectedMinor > 0) {
    return 'partial'
  }

  return 'unpaid'
}

function getLoanCollectionStatusLabel(status: ReturnType<typeof getLoanCollectionStatus>) {
  if (status === 'paid') {
    return 'Paid'
  }

  if (status === 'partial') {
    return 'Partial'
  }

  return 'Unpaid'
}

function getLoanCollectionStatusSortOrder(status: ReturnType<typeof getLoanCollectionStatus>) {
  if (status === 'unpaid') {
    return 0
  }

  if (status === 'partial') {
    return 1
  }

  return 2
}

function getLoanStatusLabel(status: DashboardCutoffReceivable['loans'][number]['loanStatus']) {
  return status === 'completed' ? 'Completed' : 'Active'
}

function getCutoffDialogDescription(cutoff: DashboardCutoffReceivable, currency: string) {
  const loansStillToCollect = cutoff.loans.filter((loan) => loan.remainingMinor > 0).length
  const loansPaidForCutoff = cutoff.loans.length - loansStillToCollect
  const loanLabel = `${cutoff.loanCount.toLocaleString('en-PH')} loan${cutoff.loanCount === 1 ? '' : 's'} in this cutoff`
  if (cutoff.remainingMinor <= 0) {
    return `${loanLabel}, already fully collected.`
  }

  return `${loanLabel}: ${loansStillToCollect.toLocaleString('en-PH')} outstanding with ${formatMinorCurrency(cutoff.remainingMinor, currency)} remaining; ${loansPaidForCutoff.toLocaleString('en-PH')} paid for this cutoff.`
}

function MiniMetric({
  label,
  value,
  meta,
}: {
  label: string
  value: string
  meta: string
}) {
  return (
    <article className={dashboardClass('dashboard-overview__miniCard')}>
      <span className={dashboardClass('dashboard-overview__statLabel')}>{label}</span>
      <strong className={dashboardClass('dashboard-overview__miniValue')}>{value}</strong>
      <span className={dashboardClass('dashboard-overview__miniMeta')}>{meta}</span>
    </article>
  )
}

function CutoffLoansTable({
  currency,
  description,
  isRefreshing,
  loans,
  onCloseDialog,
  onSelectPayment,
  showPaymentAction,
  title,
}: {
  currency: string
  description: string
  isRefreshing: boolean
  loans: DashboardCutoffReceivable['loans']
  onCloseDialog: () => void
  onSelectPayment: (loan: DashboardCutoffReceivable['loans'][number]) => void
  showPaymentAction: boolean
  title: string
}) {
  return (
    <section className={dashboardClass('dashboard-overview__cutoffDialogTableSection')}>
      <div className={dashboardClass('dashboard-overview__cutoffDialogTableHeader')}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className={dashboardClass('dashboard-overview__cutoffDialogTableWrap')}>
        <table className={dashboardClass('dashboard-overview__table', 'dashboard-overview__table--compact')}>
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Loan</th>
              <th className={dashboardClass('dashboard-overview__tableAmount')}>Total receivable</th>
              <th className={dashboardClass('dashboard-overview__tableAmount')}>Remaining</th>
              <th className={dashboardClass('dashboard-overview__tableStatus')}>Cutoff status</th>
              <th className={dashboardClass('dashboard-overview__tableStatus')}>Loan status</th>
              {showPaymentAction ? (
                <th className={dashboardClass('dashboard-overview__tableActions')}>Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => {
              const cutoffStatus = getLoanCollectionStatus(loan)

              return (
                <tr key={loan.loanId}>
                  <td>
                    <div className={dashboardClass('dashboard-overview__loanCell')}>
                      <Link href={buildLoanDetailPath(loan.loanId, '/dashboard')} className="data-card__titleLink" onClick={onCloseDialog}>
                        {loan.borrowerDisplayName}
                      </Link>
                      <span className="muted micro-copy">{loan.borrowerNumber}</span>
                    </div>
                  </td>
                  <td>
                    <Link href={buildLoanDetailPath(loan.loanId, '/dashboard')} className="data-card__titleLink" onClick={onCloseDialog}>
                      {loan.loanNumber}
                    </Link>
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(loan.totalReceivableMinor, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(loan.remainingMinor, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableStatus')}>
                    <span className={dashboardClass(
                      'dashboard-overview__statusBadge',
                      `dashboard-overview__loanStatusBadge--${cutoffStatus}`,
                    )}>
                      {getLoanCollectionStatusLabel(cutoffStatus)}
                    </span>
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableStatus')}>
                    <span className={dashboardClass(
                      'dashboard-overview__statusBadge',
                      `dashboard-overview__lifecycleBadge--${loan.loanStatus}`,
                    )}>
                      {getLoanStatusLabel(loan.loanStatus)}
                    </span>
                  </td>
                  {showPaymentAction ? (
                    <td className={dashboardClass('dashboard-overview__tableActions')}>
                      <button
                        type="button"
                        className="button-ghost table-action-icon"
                        aria-label={`Post payment for ${loan.borrowerDisplayName} ${loan.loanNumber}`}
                        title="Post payment"
                        disabled={isRefreshing || loan.remainingMinor <= 0}
                        onClick={() => onSelectPayment(loan)}
                      >
                        <PaymentIcon />
                      </button>
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CutoffReceivablesTable({
  currency,
  description,
  emptyDescription,
  emptyTitle,
  receivables,
  title,
  onSelectCutoff,
}: {
  currency: string
  description: string
  emptyDescription: string
  emptyTitle: string
  receivables: DashboardCutoffReceivable[]
  title: string
  onSelectCutoff: (cutoffDate: string) => void
}) {
  return (
    <div className={dashboardClass('dashboard-overview__tableCard')}>
      <div className={dashboardClass('dashboard-overview__tableCardHeader')}>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {receivables.length > 0 ? (
        <div className={dashboardClass('dashboard-overview__tableScroll')}>
          <table className={dashboardClass('dashboard-overview__table')}>
            <thead>
              <tr>
                <th>Cutoff date</th>
                <th className={dashboardClass('dashboard-overview__tableAmount')}>
                  Principal due
                </th>
                <th className={dashboardClass('dashboard-overview__tableAmount')}>
                  Interest due
                </th>
                <th className={dashboardClass('dashboard-overview__tableAmount')}>
                  Penalty due
                </th>
                <th className={dashboardClass('dashboard-overview__tableAmount')}>
                  Total receivable
                </th>
                <th className={dashboardClass('dashboard-overview__tableAmount')}>Collected</th>
                <th className={dashboardClass('dashboard-overview__tableAmount')}>Remaining</th>
                <th>Borrowers in cutoff</th>
                <th>Loans in cutoff</th>
                <th className={dashboardClass('dashboard-overview__tableStatus')}>Status</th>
                <th className={dashboardClass('dashboard-overview__tableActions')}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receivables.map((entry) => (
                <tr key={entry.cutoffDate}>
                  <td>{formatDate(entry.cutoffDate)}</td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(entry.principalDueMinor, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(entry.interestDueMinor, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(entry.penaltyDueMinor, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(
                      entry.totalReceivableMinor,
                      currency,
                    )}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(entry.totalCollectedMinor, currency)}
                  </td>
                  <td className={dashboardClass('dashboard-overview__tableAmount')}>
                    {formatMinorCurrency(entry.remainingMinor, currency)}
                  </td>
                  <td>{entry.borrowerCount.toLocaleString('en-PH')}</td>
                  <td>{entry.loanCount.toLocaleString('en-PH')}</td>
                  <td className={dashboardClass('dashboard-overview__tableStatus')}>
                    <span
                      className={dashboardClass('dashboard-overview__statusBadge', `dashboard-overview__statusBadge--${entry.status}`)}
                    >
                      {getReceivableStatusLabel(entry.status)}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button-ghost table-action-icon"
                      aria-label={`View loans in cutoff on ${formatDate(entry.cutoffDate)}`}
                      onClick={() => onSelectCutoff(entry.cutoffDate)}
                    >
                      <ViewIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={dashboardClass('dashboard-overview__emptyState')}>
          <span className={dashboardClass('dashboard-overview__emptyIcon', 'dashboard-overview__emptyIcon--text')}>
            +
          </span>
          <div>
            <strong>{emptyTitle}</strong>
            <p>{emptyDescription}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function DashboardCutoffReceivables({
  currency,
  currentCutoffReceivable,
  interestByCutoff,
  receivableByCutoff,
}: {
  currency: string
  currentCutoffReceivable: DashboardCutoffReceivable | null
  interestByCutoff: DashboardInterestByCutoff[]
  receivableByCutoff: DashboardCutoffReceivable[]
}) {
  const router = useRouter()
  const [isRefreshingCutoff, startCutoffRefresh] = useTransition()
  const [selectedCutoffDate, setSelectedCutoffDate] = useState<string | null>(null)
  const yearOptions = useMemo(() => Array.from(
    new Set(interestByCutoff.map((entry) => getYearKey(entry.cutoffDate))),
  ).sort(), [interestByCutoff])
  const [selectedYear, setSelectedYear] = useState(() => {
    const currentYear = getCurrentYearKey()
    return yearOptions.includes(currentYear) ? currentYear : getNearestYearOption(yearOptions, currentYear)
  })
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<{
    loanId: string
    label: string
  } | null>(null)

  const activeYear = yearOptions.length > 0 ? selectedYear : null
  const selectedYearLabel = activeYear ?? 'selected year'
  const monthlyInterestRows = activeYear ? buildMonthlyInterestRows(activeYear, interestByCutoff) : []
  const visibleMonthlyInterestRows = monthlyInterestRows.filter((entry) =>
    entry.interestDueMinor > 0 || entry.interestCollectedMinor > 0 || entry.remainingInterestMinor > 0,
  )
  const yearInterestDueMinor = monthlyInterestRows.reduce((sum, entry) => sum + entry.interestDueMinor, 0)
  const yearInterestCollectedMinor = monthlyInterestRows.reduce((sum, entry) => sum + entry.interestCollectedMinor, 0)
  const yearRemainingInterestMinor = monthlyInterestRows.reduce((sum, entry) => sum + entry.remainingInterestMinor, 0)
  const yearCutoffCount = monthlyInterestRows.reduce((sum, entry) => sum + entry.cutoffCount, 0)
  const activeInterestMonthCount = visibleMonthlyInterestRows.length
  const collectedAverageMonthCount = getCollectedAverageMonthCount(activeYear, monthlyInterestRows)
  const averageInterestDueMinor = activeInterestMonthCount > 0 ? yearInterestDueMinor / activeInterestMonthCount : 0
  const averageInterestCollectedMinor = collectedAverageMonthCount > 0 ? yearInterestCollectedMinor / collectedAverageMonthCount : 0
  const averageInterestCollectedMeta = collectedAverageMonthCount > 0
    ? `Through ${collectedAverageMonthCount} mo.`
    : 'No collections yet'
  useEffect(() => {
    if (yearOptions.length === 0 || yearOptions.includes(selectedYear)) {
      return
    }

    const currentYear = getCurrentYearKey()
    setSelectedYear(yearOptions.includes(currentYear) ? currentYear : getNearestYearOption(yearOptions, currentYear))
  }, [yearOptions, selectedYear])

  const currentReceivable = currentCutoffReceivable
  const currentOpenReceivable = receivableByCutoff.find((entry) => (
    entry.status === 'current'
    && entry.cutoffDate !== currentCutoffReceivable?.cutoffDate
  )) ?? null
  const upcomingReceivables = [...receivableByCutoff]
    .filter((entry) => entry.status === 'upcoming')
    .sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate))
  const currentUpcomingReceivables = Array.from(
    new Map(
      [
        ...(currentReceivable ? [currentReceivable] : []),
        ...(currentOpenReceivable ? [currentOpenReceivable] : []),
        ...upcomingReceivables,
      ].map((entry) => [entry.cutoffDate, entry]),
    ).values(),
  ).sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate))
  const overdueReceivables = [...receivableByCutoff]
    .filter((entry) => entry.status === 'overdue')
    .sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate))
  const visibleReceivables = Array.from(
    new Map(
      [
        ...currentUpcomingReceivables,
        ...overdueReceivables,
      ].map((entry) => [entry.cutoffDate, entry]),
    ).values(),
  )

  const selectedCutoff = selectedCutoffDate
    ? visibleReceivables.find((entry) => entry.cutoffDate === selectedCutoffDate) ?? null
    : null
  const selectedCutoffLoans = selectedCutoff
    ? [...selectedCutoff.loans].sort((left, right) => {
      const leftStatus = getLoanCollectionStatus(left)
      const rightStatus = getLoanCollectionStatus(right)
      const statusOrder = getLoanCollectionStatusSortOrder(leftStatus) - getLoanCollectionStatusSortOrder(rightStatus)

      if (statusOrder !== 0) {
        return statusOrder
      }

      return left.loanNumber.localeCompare(right.loanNumber)
    })
    : []
  const loansStillToCollect = selectedCutoffLoans.filter((loan) => loan.remainingMinor > 0)
  const loansPaidForCutoff = selectedCutoff?.status === 'overdue'
    ? []
    : selectedCutoffLoans.filter((loan) => loan.remainingMinor <= 0)

  const closeCutoffDialog = () => {
    setSelectedCutoffDate(null)
    setSelectedLoanForPayment(null)
  }

  return (
    <>
      <section className={dashboardClass('dashboard-overview__operator')}>
        <div className={dashboardClass('dashboard-overview__operatorHeader')}>
          <div>
            <h2 className="section-title title-offset">Per Cutoff Receivable</h2>
            <p className="muted">
              Current and upcoming cutoff schedules are separated from overdue
              receivables for cleaner collection tracking.
            </p>
            <p className="muted">
              Collected reflects actual applied payments, including advance
              payments posted before an upcoming cutoff date and cutoffs already
              settled in full.
            </p>
          </div>
        </div>

      {currentReceivable ? (
        <section className={dashboardClass('dashboard-overview__miniGrid', 'dashboard-overview__miniGrid--five')}>
          <MiniMetric
            label="Cutoff total"
            value={formatMinorCurrency(
              currentReceivable.totalReceivableMinor,
              currency,
            )}
            meta={formatDate(currentReceivable.cutoffDate)}
          />
          <MiniMetric
            label="Principal scheduled"
            value={formatMinorCurrency(
              currentReceivable.principalDueMinor,
              currency,
            )}
            meta="Scheduled principal on this cutoff"
          />
          <MiniMetric
            label="Interest scheduled"
            value={formatMinorCurrency(
              currentReceivable.interestDueMinor,
              currency,
            )}
            meta="Scheduled interest on this cutoff"
          />
          <MiniMetric
            label="Penalty scheduled"
            value={formatMinorCurrency(
              currentReceivable.penaltyDueMinor,
              currency,
            )}
            meta="Manual penalties on this cutoff"
          />
          <MiniMetric
            label="Remaining to collect"
            value={formatMinorCurrency(
              currentReceivable.remainingMinor,
              currency,
            )}
            meta={
              currentReceivable.remainingMinor > 0
                ? `${formatMinorCurrency(
                  currentReceivable.totalCollectedMinor,
                  currency,
                )} already collected`
                : 'Fully collected'
            }
          />
          <MiniMetric
            label="Borrowers in cutoff"
            value={currentReceivable.borrowerCount.toLocaleString(
              "en-PH",
            )}
            meta={`${currentReceivable.loanCount.toLocaleString("en-PH")} loan${currentReceivable.loanCount === 1 ? "" : "s"} in cutoff`}
          />
        </section>
      ) : (
        <div className={dashboardClass('dashboard-overview__emptyState', 'dashboard-overview__emptyState--compact')}>
          <span className={dashboardClass('dashboard-overview__emptyIcon', 'dashboard-overview__emptyIcon--text')}>
            +
          </span>
          <div>
            <strong>No upcoming receivables</strong>
            <p>
              No unpaid or partially paid cutoff rows are scheduled right now.
            </p>
          </div>
        </div>
      )}

      <div className={dashboardClass('dashboard-overview__receivableTables')}>
        <CutoffReceivablesTable
          currency={currency}
          description="Open non-overdue cutoffs sorted by schedule date."
          emptyDescription="No current or upcoming cutoff groups are scheduled right now."
          emptyTitle="No current or upcoming cutoffs"
          receivables={currentUpcomingReceivables}
          title="Current and upcoming"
          onSelectCutoff={setSelectedCutoffDate}
        />
        <CutoffReceivablesTable
          currency={currency}
          description="Past due cutoffs with remaining balances to collect."
          emptyDescription="No cutoff groups are overdue right now."
          emptyTitle="No overdue cutoffs"
          receivables={overdueReceivables}
          title="Overdues"
          onSelectCutoff={setSelectedCutoffDate}
        />
      </div>

      <Dialog
        id="dashboard-cutoff-receivable-dialog"
        open={selectedCutoffDate !== null}
        title={
          selectedCutoff
            ? `Loans in cutoff on ${formatDate(selectedCutoff.cutoffDate)}`
            : selectedCutoffDate
              ? `Loans in cutoff on ${formatDate(selectedCutoffDate)}`
            : "Loans in cutoff"
        }
        description={
          selectedCutoff
            ? getCutoffDialogDescription(selectedCutoff, currency)
            : undefined
        }
        onClose={closeCutoffDialog}
        className={dashboardClass('dashboard-overview__cutoffDialog')}
      >
        {selectedCutoff ? (
          <div className={dashboardClass('dashboard-overview__cutoffDialogContent')}>
            {isRefreshingCutoff ? (
              <div className="notice" role="status" aria-live="polite">
                Refreshing cutoff data...
              </div>
            ) : null}

            <div className={dashboardClass('dashboard-overview__cutoffDialogSummary')}>
              <MiniMetric
                label="Principal due"
                value={formatMinorCurrency(
                  selectedCutoff.principalDueMinor,
                  currency,
                )}
                meta="Scheduled principal across loans in this cutoff"
              />
              <MiniMetric
                label="Interest due"
                value={formatMinorCurrency(
                  selectedCutoff.interestDueMinor,
                  currency,
                )}
                meta="Scheduled interest across loans in this cutoff"
              />
              <MiniMetric
                label="Penalty due"
                value={formatMinorCurrency(
                  selectedCutoff.penaltyDueMinor,
                  currency,
                )}
                meta="Manual penalties across loans in this cutoff"
              />
              <MiniMetric
                label="Total receivable"
                value={formatMinorCurrency(
                  selectedCutoff.totalReceivableMinor,
                  currency,
                )}
                meta="Scheduled across all loans in this cutoff"
              />
              <MiniMetric
                label="Collected"
                value={formatMinorCurrency(
                  selectedCutoff.totalCollectedMinor,
                  currency,
                )}
                meta="Already collected on this cutoff"
              />
              <MiniMetric
                label="Remaining"
                value={formatMinorCurrency(
                  selectedCutoff.remainingMinor,
                  currency,
                )}
                meta="Still due from this cutoff"
              />
            </div>

            <CutoffLoansTable
              currency={currency}
              description="Unpaid and partially paid balances requiring collection."
              isRefreshing={isRefreshingCutoff}
              loans={loansStillToCollect}
              onCloseDialog={closeCutoffDialog}
              onSelectPayment={(loan) => setSelectedLoanForPayment({
                loanId: loan.loanId,
                label: `${loan.borrowerDisplayName} · ${loan.loanNumber}`,
              })}
              showPaymentAction
              title="Outstanding for this cutoff"
            />

            {loansPaidForCutoff.length > 0 ? (
              <CutoffLoansTable
                currency={currency}
                description="Cutoff balances already collected, including active and completed loans."
                isRefreshing={isRefreshingCutoff}
                loans={loansPaidForCutoff}
                onCloseDialog={closeCutoffDialog}
                onSelectPayment={() => undefined}
                showPaymentAction={false}
                title="Paid for this cutoff"
              />
            ) : null}
          </div>
        ) : selectedCutoffDate ? (
          <div className={dashboardClass('dashboard-overview__emptyState', 'dashboard-overview__emptyState--compact')}>
            <span className={dashboardClass('dashboard-overview__emptyIcon', 'dashboard-overview__emptyIcon--text')}>
              +
            </span>
            <div>
              <strong>Cutoff refreshed</strong>
              <p>
                This cutoff no longer has visible receivables after the latest
                refresh.
              </p>
            </div>
          </div>
        ) : null}
      </Dialog>

      <LoanPaymentDialog
        open={Boolean(selectedLoanForPayment)}
        loanId={selectedLoanForPayment?.loanId ?? ''}
        loanLabel={selectedLoanForPayment?.label ?? ''}
        onClose={() => setSelectedLoanForPayment(null)}
        onPaymentPosted={() => {
          setSelectedLoanForPayment(null)
          startCutoffRefresh(() => {
            router.refresh()
          })
        }}
      />
    </section>

      <section className={dashboardClass('dashboard-overview__operator')}>
        <div className={dashboardClass('dashboard-overview__operatorHeader')}>
          <div>
            <h2 className="section-title title-offset">Interest by Month</h2>
            <p className="muted">
              Compare scheduled interest due against actual collected interest
              across each month of the selected year.
            </p>
          </div>
          {yearOptions.length > 0 ? (
            <Select
              id="dashboard-cutoff-interest-year"
              label="Year"
              value={selectedYear}
              onChange={(event) => {
                setSelectedYear(event.target.value)
                setSelectedCutoffDate(null)
              }}
              className={dashboardClass('dashboard-overview__monthSelect')}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Select>
          ) : null}
        </div>

        <section className={dashboardClass('dashboard-overview__interestCard')}>
          <div className={dashboardClass('dashboard-overview__tableCardHeader')}>
            <div>
              <h3>Monthly interest trend</h3>
              <p>Scheduled interest due and actual collected interest across {selectedYearLabel}.</p>
            </div>
            {visibleMonthlyInterestRows.length > 0 ? (
              <div className={dashboardClass('dashboard-overview__interestAverageGroup')} aria-label="Monthly interest averages">
                <article className={dashboardClass('dashboard-overview__interestAverage')}>
                  <span>Avg due</span>
                  <strong>{formatMinorCurrency(averageInterestDueMinor, currency)}</strong>
                </article>
                <article className={dashboardClass('dashboard-overview__interestAverage', 'dashboard-overview__interestAverage--collected')}>
                  <span>Avg collected</span>
                  <strong>{formatMinorCurrency(averageInterestCollectedMinor, currency)}</strong>
                  <small>{averageInterestCollectedMeta}</small>
                </article>
              </div>
            ) : null}
          </div>
          {visibleMonthlyInterestRows.length > 0 ? (
            <>
              <DashboardCutoffInterestChart
                averageInterestCollectedMinor={averageInterestCollectedMinor}
                currency={currency}
                rows={monthlyInterestRows}
              />
              <section className={dashboardClass('dashboard-overview__miniGrid', 'dashboard-overview__miniGrid--three')}>
                <MiniMetric
                  label="Interest due"
                  value={formatMinorCurrency(yearInterestDueMinor, currency)}
                  meta={`Scheduled across ${yearCutoffCount.toLocaleString('en-PH')} cutoff${yearCutoffCount === 1 ? '' : 's'} in ${selectedYearLabel}`}
                />
                <MiniMetric
                  label="Interest collected"
                  value={formatMinorCurrency(yearInterestCollectedMinor, currency)}
                  meta="Actual applied payments for interest"
                />
                <MiniMetric
                  label="Remaining interest"
                  value={formatMinorCurrency(yearRemainingInterestMinor, currency)}
                  meta="Still unpaid interest in this year"
                />
              </section>
            </>
          ) : (
            <div className={dashboardClass('dashboard-overview__emptyState', 'dashboard-overview__emptyState--compact')}>
              <span className={dashboardClass('dashboard-overview__emptyIcon', 'dashboard-overview__emptyIcon--text')}>
                +
              </span>
              <div>
                <strong>No cutoff interest for this year</strong>
                <p>Scheduled interest will appear here when a cutoff exists in the selected year.</p>
              </div>
            </div>
          )}
        </section>
      </section>
    </>
  );
}
