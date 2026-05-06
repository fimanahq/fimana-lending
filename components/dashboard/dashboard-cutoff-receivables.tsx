'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button, Dialog } from '@/components/shared'
import { formatCurrency, formatDate } from '@/lib/format'
import type { DashboardCutoffReceivable } from '@/lib/types'
import { ViewIcon } from '../shared/table-icons'

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

  return 'Upcoming'
}

function getReceivablePriority(status: DashboardCutoffReceivable['status']) {
  switch (status) {
    case 'current':
      return 0
    case 'upcoming':
      return 1
    case 'overdue':
      return 2
    default:
      return 3
  }
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
    <article className="dashboard-overview__miniCard">
      <span className="dashboard-overview__statLabel">{label}</span>
      <strong className="dashboard-overview__miniValue">{value}</strong>
      <span className="dashboard-overview__miniMeta">{meta}</span>
    </article>
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

  const currentReceivable = receivableByCutoff.find((entry) => entry.status === 'current') ?? null
  const nextUpcomingReceivable = [...receivableByCutoff]
    .filter((entry) => entry.status === 'upcoming')
    .sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate))[0] ?? null
  const overdueReceivables = [...receivableByCutoff]
    .filter((entry) => entry.status === 'overdue')
    .sort((left, right) => left.cutoffDate.localeCompare(right.cutoffDate))
  const visibleReceivables = [
    ...(currentReceivable ? [currentReceivable] : []),
    ...(nextUpcomingReceivable ? [nextUpcomingReceivable] : []),
    ...overdueReceivables,
  ]

  const selectedCutoff = selectedCutoffDate
    ? visibleReceivables.find((entry) => entry.cutoffDate === selectedCutoffDate) ?? null
    : null

  return (
    <section className="dashboard-overview__operator">
      <div className="dashboard-overview__operatorHeader">
        <div>
          <h2 className="section-title title-offset">Per Cutoff Receivable</h2>
          <p className="muted">
            Group unpaid or partially paid schedules by cutoff date so the
            nearest collection target and the next receivable dates are visible
            at a glance.
          </p>
          <p className="muted">
            Collected reflects actual applied payments, including advance
            payments posted before an upcoming cutoff date.
          </p>
        </div>
      </div>

      {currentCutoffReceivable ? (
        <section className="dashboard-overview__miniGrid dashboard-overview__miniGrid--five">
          <MiniMetric
            label="Due this cutoff"
            value={formatMinorCurrency(
              currentCutoffReceivable.totalReceivableMinor,
              currency,
            )}
            meta={formatDate(currentCutoffReceivable.cutoffDate)}
          />
          <MiniMetric
            label="Principal due"
            value={formatMinorCurrency(
              currentCutoffReceivable.principalDueMinor,
              currency,
            )}
            meta="Scheduled principal on this cutoff"
          />
          <MiniMetric
            label="Interest due"
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
              formatMinorCurrency(
                currentCutoffReceivable.totalCollectedMinor,
                currency,
              ) + " already collected"
            }
          />
          <MiniMetric
            label="Borrowers due"
            value={currentCutoffReceivable.borrowerCount.toLocaleString(
              "en-PH",
            )}
            meta={`${currentCutoffReceivable.loanCount.toLocaleString("en-PH")} loan${currentCutoffReceivable.loanCount === 1 ? "" : "s"} due`}
          />
        </section>
      ) : (
        <div className="dashboard-overview__emptyState dashboard-overview__emptyState--compact">
          <span className="dashboard-overview__emptyIcon dashboard-overview__emptyIcon--text">
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

      <div className="dashboard-overview__tableCard">
        {visibleReceivables.length > 0 ? (
          <div className="dashboard-overview__tableScroll">
            <table className="dashboard-overview__table">
              <thead>
                <tr>
                  <th>Cutoff date</th>
                  <th className="dashboard-overview__tableAmount">
                    Principal due
                  </th>
                  <th className="dashboard-overview__tableAmount">
                    Interest due
                  </th>
                  <th className="dashboard-overview__tableAmount">
                    Total receivable
                  </th>
                  <th className="dashboard-overview__tableAmount">Collected</th>
                  <th className="dashboard-overview__tableAmount">Remaining</th>
                  <th>Borrowers due</th>
                  <th>Loans due</th>
                  <th className="dashboard-overview__tableStatus">Status</th>
                  <th className="dashboard-overview__tableActions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleReceivables.map((entry) => (
                  <tr key={entry.cutoffDate}>
                    <td>{formatDate(entry.cutoffDate)}</td>
                    <td className="dashboard-overview__tableAmount">
                      {formatMinorCurrency(entry.principalDueMinor, currency)}
                    </td>
                    <td className="dashboard-overview__tableAmount">
                      {formatMinorCurrency(entry.interestDueMinor, currency)}
                    </td>
                    <td className="dashboard-overview__tableAmount">
                      {formatMinorCurrency(
                        entry.totalReceivableMinor,
                        currency,
                      )}
                    </td>
                    <td className="dashboard-overview__tableAmount">
                      {formatMinorCurrency(entry.totalCollectedMinor, currency)}
                    </td>
                    <td className="dashboard-overview__tableAmount">
                      {formatMinorCurrency(entry.remainingMinor, currency)}
                    </td>
                    <td>{entry.borrowerCount.toLocaleString("en-PH")}</td>
                    <td>{entry.loanCount.toLocaleString("en-PH")}</td>
                    <td className="dashboard-overview__tableStatus">
                      <span
                        className={`dashboard-overview__statusBadge dashboard-overview__statusBadge--${entry.status}`}
                      >
                        {getReceivableStatusLabel(entry.status)}
                      </span>
                    </td>
                    <td>
                      <div
                        aria-hidden="true"
                        className="button-ghost table-action-icon"
                        onClick={() => setSelectedCutoffDate(entry.cutoffDate)}
                      >
                      <ViewIcon/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-overview__emptyState">
            <span className="dashboard-overview__emptyIcon dashboard-overview__emptyIcon--text">
              +
            </span>
            <div>
              <strong>No receivable cutoffs yet</strong>
              <p>
                Open receivable cutoff groups will appear here once active
                schedules are generated.
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog
        id="dashboard-cutoff-receivable-dialog"
        open={selectedCutoff !== null}
        title={
          selectedCutoff
            ? `Loans due on ${formatDate(selectedCutoff.cutoffDate)}`
            : "Loans due on cutoff"
        }
        description={
          selectedCutoff
            ? `${selectedCutoff.loanCount.toLocaleString("en-PH")} loan${selectedCutoff.loanCount === 1 ? "" : "s"} with ${formatMinorCurrency(selectedCutoff.remainingMinor, currency)} remaining to collect.`
            : undefined
        }
        onClose={() => setSelectedCutoffDate(null)}
        className="dashboard-overview__cutoffDialog"
      >
        {selectedCutoff ? (
          <div className="dashboard-overview__cutoffDialogContent">
            <div className="dashboard-overview__cutoffDialogSummary">
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

            <div className="dashboard-overview__cutoffDialogTableWrap">
              <table className="dashboard-overview__table dashboard-overview__table--compact">
                <thead>
                  <tr>
                    <th>Borrower</th>
                    <th>Loan</th>
                    <th className="dashboard-overview__tableAmount">
                      Principal due
                    </th>
                    <th className="dashboard-overview__tableAmount">
                      Interest due
                    </th>
                    <th className="dashboard-overview__tableAmount">
                      Total receivable
                    </th>
                    <th className="dashboard-overview__tableAmount">
                      Collected
                    </th>
                    <th className="dashboard-overview__tableAmount">
                      Remaining
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCutoff.loans.map((loan) => (
                    <tr key={loan.loanId}>
                      <td>
                        <div className="dashboard-overview__loanCell">
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
                      <td className="dashboard-overview__tableAmount">
                        {formatMinorCurrency(loan.principalDueMinor, currency)}
                      </td>
                      <td className="dashboard-overview__tableAmount">
                        {formatMinorCurrency(loan.interestDueMinor, currency)}
                      </td>
                      <td className="dashboard-overview__tableAmount">
                        {formatMinorCurrency(
                          loan.totalReceivableMinor,
                          currency,
                        )}
                      </td>
                      <td className="dashboard-overview__tableAmount">
                        {formatMinorCurrency(
                          loan.totalCollectedMinor,
                          currency,
                        )}
                      </td>
                      <td className="dashboard-overview__tableAmount">
                        {formatMinorCurrency(loan.remainingMinor, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}
