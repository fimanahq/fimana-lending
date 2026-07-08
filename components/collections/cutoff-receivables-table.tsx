import type { KeyboardEvent } from 'react'
import { DataTable, EmptyState, Pagination, TableShell } from '@/components/shared'
import { ViewIcon } from '@/components/shared/table-icons'
import { formatCurrency, formatDate } from '@/lib/format'
import type { CollectionsPagination, DashboardCutoffReceivable } from '@/lib/types/lending'
import { getReceivableStatusLabel } from './collections-data'
import styles from './collections.module.css'

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
}

export function CutoffReceivablesTable({
  currency,
  emptyDescription,
  emptyTitle,
  onSelectCutoff,
  onPageChange,
  page,
  pagination,
  receivables,
  title,
}: {
  currency: string
  emptyDescription: string
  emptyTitle: string
  onSelectCutoff?: (cutoffDate: string) => void
  onPageChange: (page: number) => void
  page: number
  pagination: CollectionsPagination
  receivables: DashboardCutoffReceivable[]
  title: string
}) {
  if (receivables.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, cutoffDate: string) => {
    if (onSelectCutoff && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onSelectCutoff(cutoffDate)
    }
  }

  return (
    <div className={styles.paginatedTable}>
      <TableShell label={title}>
        <DataTable>
          <thead>
            <tr>
              <th>Cutoff date</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Total</th>
              <th>Collected</th>
              <th>Remaining</th>
              <th>Borrowers</th>
              <th>Unpaid borrowers</th>
              <th>Status</th>
              {onSelectCutoff ? <th><span className="ui-sr-only">Actions</span></th> : null}
            </tr>
          </thead>
          <tbody>
            {receivables.map((entry) => (
              <tr
                key={entry.cutoffDate}
                className={onSelectCutoff ? 'table-row-link' : undefined}
                tabIndex={onSelectCutoff ? 0 : undefined}
                role={onSelectCutoff ? 'link' : undefined}
                aria-label={onSelectCutoff ? `View loans in cutoff on ${formatDate(entry.cutoffDate)}` : undefined}
                onClick={() => onSelectCutoff?.(entry.cutoffDate)}
                onKeyDown={(event) => handleRowKeyDown(event, entry.cutoffDate)}
              >
                <td>{formatDate(entry.cutoffDate)}</td>
                <td>{formatMinorCurrency(entry.principalDueMinor, currency)}</td>
                <td>{formatMinorCurrency(entry.interestDueMinor, currency)}</td>
                <td>{formatMinorCurrency(entry.totalReceivableMinor, currency)}</td>
                <td>{formatMinorCurrency(entry.totalCollectedMinor, currency)}</td>
                <td>{formatMinorCurrency(entry.remainingMinor, currency)}</td>
                <td>{entry.borrowerCount.toLocaleString('en-PH')}</td>
                <td>{entry.unpaidBorrowerCount.toLocaleString('en-PH')}</td>
                <td><span className={`status-pill ${entry.status}`}>{getReceivableStatusLabel(entry.status)}</span></td>
                {onSelectCutoff ? (
                  <td className={styles.actions}>
                    <button
                      type="button"
                      className="button-ghost table-action-icon"
                      aria-label={`View loans in cutoff on ${formatDate(entry.cutoffDate)}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectCutoff(entry.cutoffDate)
                      }}
                    >
                      <ViewIcon />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </DataTable>
      </TableShell>
      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        itemLabel="cutoffs"
        onPageChange={onPageChange}
      />
    </div>
  )
}
