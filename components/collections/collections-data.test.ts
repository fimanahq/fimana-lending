import { describe, expect, it } from 'vitest'
import type { DashboardCutoffReceivable } from '@/lib/types/lending'
import { groupCutoffReceivables, sortCutoffLoans } from './collections-data'

function cutoff(cutoffDate: string, status: DashboardCutoffReceivable['status']): DashboardCutoffReceivable {
  return {
    cutoffDate,
    status,
    principalDueMinor: 100,
    interestDueMinor: 10,
    penaltyDueMinor: 0,
    totalReceivableMinor: 110,
    principalCollectedMinor: 0,
    interestCollectedMinor: 0,
    penaltyCollectedMinor: 0,
    totalCollectedMinor: 0,
    remainingMinor: status === 'paid' ? 0 : 110,
    borrowerCount: 1,
    loanCount: 1,
    loans: [],
  }
}

describe('collections data', () => {
  it('deduplicates cutoff dates and sorts each section', () => {
    const grouped = groupCutoffReceivables([
      cutoff('2026-06-30', 'upcoming'),
      cutoff('2026-05-15', 'overdue'),
      cutoff('2026-06-15', 'current'),
      cutoff('2026-04-30', 'paid'),
      cutoff('2026-06-30', 'upcoming'),
      cutoff('2026-05-31', 'overdue'),
    ])

    expect(grouped.all).toHaveLength(5)
    expect(grouped.currentUpcoming.map((entry) => entry.cutoffDate)).toEqual(['2026-06-15', '2026-06-30'])
    expect(grouped.overdue.map((entry) => entry.cutoffDate)).toEqual(['2026-05-15', '2026-05-31'])
    expect(grouped.closed.map((entry) => entry.cutoffDate)).toEqual(['2026-04-30'])
  })

  it('sorts cutoff loans unpaid, partial, then paid', () => {
    const base = {
      borrowerId: 'borrower', borrowerDisplayName: 'Borrower', borrowerNumber: 'BR-1', loanStatus: 'active' as const,
      principalDueMinor: 100, interestDueMinor: 10, penaltyDueMinor: 0, totalReceivableMinor: 110,
    }
    const loans = [
      { ...base, loanId: 'paid', loanNumber: 'LN-3', totalCollectedMinor: 110, remainingMinor: 0 },
      { ...base, loanId: 'partial', loanNumber: 'LN-2', totalCollectedMinor: 10, remainingMinor: 100 },
      { ...base, loanId: 'unpaid', loanNumber: 'LN-1', totalCollectedMinor: 0, remainingMinor: 110 },
    ]

    expect(sortCutoffLoans(loans).map((loan) => loan.loanId)).toEqual(['unpaid', 'partial', 'paid'])
  })
})
