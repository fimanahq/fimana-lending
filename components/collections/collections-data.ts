import type { CollectionsSection, DashboardCutoffReceivable } from '@/lib/types/lending'

export type CollectionSection = CollectionsSection
export type LoanCollectionStatus = 'unpaid' | 'partial' | 'paid'

export const collectionSections: CollectionSection[] = [
  'current-upcoming',
  'overdue',
  'closed',
  'defaulted',
]

export function isCollectionSection(value: string | null): value is CollectionSection {
  return collectionSections.includes(value as CollectionSection)
}

export function parseCollectionSection(value: string | null): CollectionSection {
  if (value === 'closed-exceptions') return 'closed'
  return isCollectionSection(value) ? value : 'current-upcoming'
}

export function getReceivableStatusLabel(status: DashboardCutoffReceivable['status']) {
  return status === 'overdue'
    ? 'Overdue'
    : status === 'current'
      ? 'Current'
      : status === 'paid'
        ? 'Paid'
        : 'Upcoming'
}

export function getLoanCollectionStatus(loan: DashboardCutoffReceivable['loans'][number]): LoanCollectionStatus {
  if (loan.remainingMinor <= 0) return 'paid'
  return loan.totalCollectedMinor > 0 ? 'partial' : 'unpaid'
}

export function getLoanCollectionStatusLabel(status: LoanCollectionStatus) {
  return status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid'
}

export function sortCutoffLoans(loans: DashboardCutoffReceivable['loans']) {
  const order: Record<LoanCollectionStatus, number> = { unpaid: 0, partial: 1, paid: 2 }
  return [...loans].sort((left, right) => {
    const statusOrder = order[getLoanCollectionStatus(left)] - order[getLoanCollectionStatus(right)]
    return statusOrder || left.loanNumber.localeCompare(right.loanNumber)
  })
}

export function groupCutoffReceivables(receivables: DashboardCutoffReceivable[]) {
  const deduplicated = Array.from(
    new Map(receivables.map((entry) => [entry.cutoffDate, entry])).values(),
  )
  const byDate = (left: DashboardCutoffReceivable, right: DashboardCutoffReceivable) => (
    left.cutoffDate.localeCompare(right.cutoffDate)
  )

  return {
    currentUpcoming: deduplicated
      .filter((entry) => entry.status === 'current' || entry.status === 'upcoming')
      .sort(byDate),
    overdue: deduplicated.filter((entry) => entry.status === 'overdue').sort((left, right) => -byDate(left, right)),
    closed: deduplicated.filter((entry) => entry.status === 'paid').sort((left, right) => -byDate(left, right)),
    all: deduplicated,
  }
}
