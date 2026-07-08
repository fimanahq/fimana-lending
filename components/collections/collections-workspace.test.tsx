import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CollectionsSummary, DashboardCutoffReceivable } from '@/lib/types/lending'
import { CollectionCutoffDetail } from './collection-cutoff-detail'
import { CollectionsWorkspace } from './collections-workspace'

const push = vi.fn()
const replace = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/collections',
  useRouter: () => ({ push, replace, refresh }),
}))

vi.mock('@/components/payments', () => ({
  LoanPaymentDialog: (props: ComponentProps<'button'> & { open: boolean; onPaymentPosted?: () => void }) => (
    props.open ? <button type="button" onClick={props.onPaymentPosted}>Complete mock payment</button> : null
  ),
}))

function cutoff(
  cutoffDate: string,
  status: DashboardCutoffReceivable['status'],
  loanStatus: 'active' | 'completed' = 'active',
): DashboardCutoffReceivable {
  const remainingMinor = status === 'paid' ? 0 : 11_000
  return {
    cutoffDate,
    status,
    principalDueMinor: 10_000,
    interestDueMinor: 1_000,
    penaltyDueMinor: 0,
    totalReceivableMinor: 11_000,
    principalCollectedMinor: status === 'paid' ? 10_000 : 0,
    interestCollectedMinor: status === 'paid' ? 1_000 : 0,
    penaltyCollectedMinor: 0,
    totalCollectedMinor: status === 'paid' ? 11_000 : 0,
    remainingMinor,
    borrowerCount: 1,
    unpaidBorrowerCount: status === 'paid' ? 0 : 1,
    loanCount: 1,
    loans: [{
      loanId: `${status}-loan`,
      loanNumber: `LN-${status}`,
      borrowerId: `${status}-borrower`,
      borrowerDisplayName: `${status} Borrower`,
      borrowerNumber: `BR-${status}`,
      loanStatus,
      principalDueMinor: 10_000,
      interestDueMinor: 1_000,
      penaltyDueMinor: 0,
      totalReceivableMinor: 11_000,
      totalCollectedMinor: status === 'paid' ? 11_000 : 0,
      remainingMinor,
    }],
  }
}

function collectionsData(section: CollectionsSummary['section'] = 'current-upcoming'): CollectionsSummary {
  const receivables = [
    cutoff('2026-06-30', 'current'),
    cutoff('2026-07-15', 'upcoming'),
    cutoff('2026-05-31', 'overdue'),
    cutoff('2026-05-15', 'paid', 'completed'),
  ]
  const selectedReceivables = section === 'current-upcoming'
    ? receivables.filter((entry) => entry.status === 'current' || entry.status === 'upcoming')
    : section === 'overdue'
      ? receivables.filter((entry) => entry.status === 'overdue')
      : section === 'closed'
        ? receivables.filter((entry) => entry.status === 'paid')
        : []
  const exceptions = [{
    loanId: 'defaulted-loan',
    loanNumber: 'LN-defaulted',
    borrowerId: 'defaulted-borrower',
    borrowerDisplayName: 'Defaulted Borrower',
    borrowerNumber: 'BR-defaulted',
    defaultedAt: '2026-05-01T00:00:00.000Z',
    writtenOffPrincipalMinor: 20_000,
    collectedProfitMinor: 2_000,
    netDefaultLossMinor: 18_000,
  }]
  const total = section === 'defaulted' ? exceptions.length : selectedReceivables.length

  return {
    currency: 'PHP',
    section,
    sectionCounts: { 'current-upcoming': 2, overdue: 1, closed: 1, defaulted: 1 },
    pagination: { page: 1, limit: 20, total, totalPages: 1 },
    currentCutoffDate: '2026-06-30',
    summary: {
      dueNowMinor: 11_000,
      upcomingMinor: 11_000,
      overdueMinor: 11_000,
      remainingToCollectMinor: 33_000,
    },
    receivableByCutoff: selectedReceivables,
    exceptions: section === 'defaulted' ? exceptions : [],
  }
}

describe('CollectionsWorkspace', () => {
  beforeEach(() => {
    push.mockClear()
    replace.mockClear()
    refresh.mockClear()
  })

  it('renders summaries and filters, then navigates to cutoff detail', () => {
    const { rerender } = render(<CollectionsWorkspace data={collectionsData()} initialSection="current-upcoming" />)

    expect(screen.getByRole('region', { name: 'Collections summary' })).toHaveTextContent('Remaining to collect')
    expect(screen.getByRole('tab', { name: /Current & Upcoming/ })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByRole('tab', { name: /Defaulted/ }))
    expect(replace).toHaveBeenCalledWith('/collections?section=defaulted', { scroll: false })
    rerender(<CollectionsWorkspace data={collectionsData('defaulted')} initialSection="defaulted" />)
    expect(screen.getByText('Defaulted Borrower')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Closed/ }))
    expect(replace).toHaveBeenCalledWith('/collections?section=closed', { scroll: false })
    rerender(<CollectionsWorkspace data={collectionsData('closed')} initialSection="closed" />)
    fireEvent.click(screen.getByRole('button', { name: 'View loans in cutoff on May 15, 2026' }))
    expect(push).toHaveBeenCalledWith('/collections/2026-05-15?section=closed')
  })

  it('preserves the selected section when navigating to detail', () => {
    render(<CollectionsWorkspace data={collectionsData('overdue')} initialSection="overdue" />)

    fireEvent.click(screen.getByRole('button', { name: 'View loans in cutoff on May 31, 2026' }))
    expect(push).toHaveBeenCalledWith('/collections/2026-05-31?section=overdue')
  })

  it('renders empty and error states', () => {
    const { rerender } = render(
      <CollectionsWorkspace
        data={{ ...collectionsData(), receivableByCutoff: [], exceptions: [] }}
        initialSection="current-upcoming"
      />,
    )
    expect(screen.getByText('No current or upcoming cutoffs')).toBeInTheDocument()

    rerender(<CollectionsWorkspace data={null} error="Backend unavailable" initialSection="current-upcoming" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Backend unavailable')
  })

  it('paginates cutoff rows with the shared Loans-page pagination', () => {
    const data = collectionsData()
    const receivables = Array.from({ length: 21 }, (_, index) => {
      const cutoffDate = new Date(Date.UTC(2026, 6, index + 1)).toISOString().slice(0, 10)
      return cutoff(cutoffDate, 'upcoming')
    })
    data.receivableByCutoff = receivables.slice(0, 20)
    data.sectionCounts['current-upcoming'] = 21
    data.pagination = { page: 1, limit: 20, total: 21, totalPages: 2 }

    const { rerender } = render(<CollectionsWorkspace data={data} initialSection="current-upcoming" />)

    expect(screen.getByText('21 total cutoffs')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
    expect(replace).toHaveBeenCalledWith('/collections?section=current-upcoming&page=2', { scroll: false })
    rerender(
      <CollectionsWorkspace
        data={{ ...data, receivableByCutoff: receivables.slice(20), pagination: { ...data.pagination, page: 2 } }}
        initialSection="current-upcoming"
        initialPage={2}
      />,
    )
    expect(screen.getByText('Jul 21, 2026')).toBeInTheDocument()
  })

  it('posts payments from the detail page and disables paid loans', () => {
    const { rerender } = render(
      <CollectionCutoffDetail
        currency="PHP"
        cutoff={cutoff('2026-06-30', 'current')}
        detailPath="/collections/2026-06-30?section=current-upcoming"
        returnPath="/collections?section=current-upcoming"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Jun 30, 2026' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Post payment for current Borrower/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete mock payment' }))
    expect(refresh).toHaveBeenCalledTimes(1)

    rerender(
      <CollectionCutoffDetail
        currency="PHP"
        cutoff={cutoff('2026-05-15', 'paid', 'completed')}
        detailPath="/collections/2026-05-15?section=closed"
        returnPath="/collections?section=closed"
      />,
    )
    expect(screen.getByRole('button', { name: /Post payment for paid Borrower/ })).toBeDisabled()
  })

  it('does not expose a currency override', () => {
    render(<CollectionsWorkspace data={collectionsData('overdue')} initialSection="overdue" />)

    expect(screen.queryByLabelText('Currency')).not.toBeInTheDocument()
  })
})
