'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Dialog } from '@/components/shared'
import { formatCurrency, formatDate } from '@/lib/format'
import type { DashboardCutoffReceivable } from '@/lib/types/lending'
import { ViewIcon } from '../shared/table-icons'
import dashboardStyles from './dashboard.module.css'
import { getDashboardClass } from './dashboard-styles'

const dashboardClass = (...values: Array<string | false | null | undefined>) => getDashboardClass(dashboardStyles, ...values)

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
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

function getCutoffDialogDescription(cutoff: DashboardCutoffReceivable, currency: string) {
  const loanLabel = `${cutoff.loanCount.toLocaleString('en-PH')} loan${cutoff.loanCount === 1 ? '' : 's'}`
  if (cutoff.remainingMinor <= 0) {
    return `${loanLabel} in this cutoff already fully collected.`
  }

  return `${loanLabel} with ${formatMinorCurrency(cutoff.remainingMinor, currency)} remaining to collect.`
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
  receivableByCutoff,
}: {
  currency: string
  currentCutoffReceivable: DashboardCutoffReceivable | null
  receivableByCutoff: DashboardCutoffReceivable[]
}) {
  const [selectedCutoffDate, setSelectedCutoffDate] = useState<string | null>(null)

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

  return (
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

      {currentCutoffReceivable ? (
        <section className={dashboardClass('dashboard-overview__miniGrid', 'dashboard-overview__miniGrid--five')}>
          <MiniMetric
            label="Cutoff total"
            value={formatMinorCurrency(
              currentCutoffReceivable.totalReceivableMinor,
              currency,
            )}
            meta={formatDate(currentCutoffReceivable.cutoffDate)}
          />
          <MiniMetric
            label="Principal scheduled"
            value={formatMinorCurrency(
              currentCutoffReceivable.principalDueMinor,
              currency,
            )}
            meta="Scheduled principal on this cutoff"
          />
          <MiniMetric
            label="Interest scheduled"
            value={formatMinorCurrency(
              currentCutoffReceivable.interestDueMinor,
              currency,
            )}
            meta="Scheduled interest on this cutoff"
          />
          <MiniMetric
            label="Remaining to collect"
            value={formatMinorCurrency(
              currentCutoffReceivable.remainingMinor,
              currency,
            )}
            meta={
              currentCutoffReceivable.remainingMinor > 0
                ? `${formatMinorCurrency(
                  currentCutoffReceivable.totalCollectedMinor,
                  currency,
                )} already collected`
                : 'Fully collected'
            }
          />
          <MiniMetric
            label="Borrowers in cutoff"
            value={currentCutoffReceivable.borrowerCount.toLocaleString(
              "en-PH",
            )}
            meta={`${currentCutoffReceivable.loanCount.toLocaleString("en-PH")} loan${currentCutoffReceivable.loanCount === 1 ? "" : "s"} in cutoff`}
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
        open={selectedCutoff !== null}
        title={
          selectedCutoff
            ? `Loans in cutoff on ${formatDate(selectedCutoff.cutoffDate)}`
            : "Loans in cutoff"
        }
        description={
          selectedCutoff
            ? getCutoffDialogDescription(selectedCutoff, currency)
            : undefined
        }
        onClose={() => setSelectedCutoffDate(null)}
        className={dashboardClass('dashboard-overview__cutoffDialog')}
      >
        {selectedCutoff ? (
          <div className={dashboardClass('dashboard-overview__cutoffDialogContent')}>
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

            <div className={dashboardClass('dashboard-overview__cutoffDialogTableWrap')}>
              <table className={dashboardClass('dashboard-overview__table', 'dashboard-overview__table--compact')}>
                <thead>
                  <tr>
                    <th>Borrower</th>
                    <th>Loan</th>
                    <th className={dashboardClass('dashboard-overview__tableAmount')}>
                      Total receivable
                    </th>
                    <th className={dashboardClass('dashboard-overview__tableAmount')}>
                      Remaining
                    </th>
                    <th className={dashboardClass('dashboard-overview__tableStatus')}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCutoffLoans.map((loan) => {
                    const loanStatus = getLoanCollectionStatus(loan)

                    return (
                      <tr key={loan.loanId}>
                        <td>
                          <div className={dashboardClass('dashboard-overview__loanCell')}>
                            <Link
                              href={`/loans/${loan.loanId}`}
                              className="data-card__titleLink"
                              onClick={() => setSelectedCutoffDate(null)}
                            >
                              {loan.borrowerDisplayName}
                            </Link>
                            <span className="muted micro-copy">
                              {loan.borrowerNumber}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Link
                            href={`/loans/${loan.loanId}`}
                            className="data-card__titleLink"
                            onClick={() => setSelectedCutoffDate(null)}
                          >
                            {loan.loanNumber}
                          </Link>
                        </td>
                        <td className={dashboardClass('dashboard-overview__tableAmount')}>
                          {formatMinorCurrency(
                            loan.totalReceivableMinor,
                            currency,
                          )}
                        </td>
                        <td className={dashboardClass('dashboard-overview__tableAmount')}>
                          {formatMinorCurrency(loan.remainingMinor, currency)}
                        </td>
                        <td className={dashboardClass('dashboard-overview__tableStatus')}>
                          <span
                            className={dashboardClass(
                              'dashboard-overview__statusBadge',
                              `dashboard-overview__loanStatusBadge--${loanStatus}`,
                            )}
                          >
                            {getLoanCollectionStatusLabel(loanStatus)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}
