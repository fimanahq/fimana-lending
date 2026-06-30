'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  PageContainer,
  Pagination,
  ProtectedLink as Link,
  TableShell,
  Tabs,
} from '@/components/shared'
import { formatCurrency, formatDate } from '@/lib/format'
import { buildLoanDetailPath } from '@/lib/loan-navigation'
import type { CollectionsDefaultedLoan, CollectionsPagination, CollectionsSummary } from '@/lib/types/lending'
import { type CollectionSection } from './collections-data'
import { CutoffReceivablesTable } from './cutoff-receivables-table'
import styles from './collections.module.css'

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
}

function SummaryCard({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <article className={styles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{meta}</p>
    </article>
  )
}

function DefaultedLoansTable({
  currency,
  loans,
  onPageChange,
  page,
  pagination,
  returnPath,
}: {
  currency: string
  loans: CollectionsDefaultedLoan[]
  onPageChange: (page: number) => void
  page: number
  pagination: CollectionsPagination
  returnPath: string
}) {
  if (loans.length === 0) {
    return <EmptyState title="No collection exceptions" description="Defaulted loans will appear here as non-actionable exceptions." />
  }

  return (
    <div className={styles.paginatedTable}>
      <TableShell label="Defaulted loan exceptions">
        <DataTable>
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Loan</th>
              <th>Defaulted</th>
              <th>Written-off principal</th>
              <th>Collected profit</th>
              <th>Net loss</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.loanId}>
                <td>{loan.borrowerDisplayName}<div className="muted micro-copy">{loan.borrowerNumber}</div></td>
                <td><Link href={buildLoanDetailPath(loan.loanId, returnPath)}>{loan.loanNumber}</Link></td>
                <td>{loan.defaultedAt ? formatDate(loan.defaultedAt) : 'Not recorded'}</td>
                <td>{formatMinorCurrency(loan.writtenOffPrincipalMinor, currency)}</td>
                <td>{formatMinorCurrency(loan.collectedProfitMinor, currency)}</td>
                <td>{formatMinorCurrency(loan.netDefaultLossMinor, currency)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </TableShell>
      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        itemLabel="defaulted loans"
        onPageChange={onPageChange}
      />
    </div>
  )
}

export function CollectionsWorkspace({
  data,
  error,
  initialPage = 1,
  initialSection,
}: {
  data: CollectionsSummary | null
  error?: string
  initialPage?: number
  initialSection: CollectionSection
}) {
  const pathname = usePathname()
  const router = useRouter()
  const activeSection = data?.section ?? initialSection
  const page = data?.pagination.page ?? initialPage

  const buildCollectionsPath = useCallback((section: CollectionSection, nextPage: number) => {
    const searchParams = new URLSearchParams({ section })
    if (nextPage > 1) searchParams.set('page', String(nextPage))
    return `${pathname}?${searchParams.toString()}`
  }, [pathname])

  useEffect(() => {
    if (!data || data.pagination.page === initialPage) return

    router.replace(buildCollectionsPath(data.section, data.pagination.page), { scroll: false })
  }, [buildCollectionsPath, data, initialPage, router])

  if (!data) {
    return (
      <PageContainer>
        <ErrorState
          title="Unable to load collections"
          description={error || 'Collections data is unavailable.'}
          action={<Button variant="secondary" onClick={() => router.refresh()}>Retry</Button>}
        />
      </PageContainer>
    )
  }

  const handleSectionChange = (value: string) => {
    const nextSection = value as CollectionSection
    router.replace(buildCollectionsPath(nextSection, 1), { scroll: false })
  }

  const handlePageChange = (nextPage: number) => {
    router.replace(buildCollectionsPath(activeSection, nextPage), { scroll: false })
  }

  const openCutoff = (cutoffDate: string) => {
    const searchParams = new URLSearchParams({ section: activeSection })
    if (page > 1) searchParams.set('page', String(page))
    router.push(`/collections/${encodeURIComponent(cutoffDate)}?${searchParams.toString()}`)
  }

  const tabs = [
    {
      value: 'current-upcoming',
      label: `Current & Upcoming (${data.sectionCounts['current-upcoming']})`,
      content: (
        <CutoffReceivablesTable
          currency={data.currency}
          emptyTitle="No current or upcoming cutoffs"
          emptyDescription="There are no open non-overdue cutoff balances."
          page={page}
          pagination={data.pagination}
          onPageChange={handlePageChange}
          receivables={data.receivableByCutoff}
          title="Current & Upcoming"
          onSelectCutoff={openCutoff}
        />
      ),
    },
    {
      value: 'overdue',
      label: `Overdue (${data.sectionCounts.overdue})`,
      content: (
        <CutoffReceivablesTable
          currency={data.currency}
          emptyTitle="No overdue cutoffs"
          emptyDescription="There are no past-due cutoff balances to collect."
          page={page}
          pagination={data.pagination}
          onPageChange={handlePageChange}
          receivables={data.receivableByCutoff}
          title="Overdue"
          onSelectCutoff={openCutoff}
        />
      ),
    },
    {
      value: 'closed',
      label: `Closed (${data.sectionCounts.closed})`,
      content: (
        <CutoffReceivablesTable
          currency={data.currency}
          emptyTitle="No closed cutoffs"
          emptyDescription="Fully collected cutoff groups will appear here."
          page={page}
          pagination={data.pagination}
          onPageChange={handlePageChange}
          receivables={data.receivableByCutoff}
          title="Closed cutoffs"
          onSelectCutoff={openCutoff}
        />
      ),
    },
    {
      value: 'defaulted',
      label: `Defaulted (${data.sectionCounts.defaulted})`,
      content: (
        <DefaultedLoansTable
          currency={data.currency}
          loans={data.exceptions}
          page={page}
          pagination={data.pagination}
          onPageChange={handlePageChange}
          returnPath={buildCollectionsPath('defaulted', page)}
        />
      ),
    },
  ]

  return (
    <PageContainer className={styles.page}>
      <section className={styles.summaryGrid} aria-label="Collections summary">
        <SummaryCard label="Next cutoff receivable" value={formatMinorCurrency(data.summary.dueNowMinor, data.currency)} meta={data.currentCutoffDate ? formatDate(data.currentCutoffDate) : 'No current cutoff'} />
        <SummaryCard label="Upcoming" value={formatMinorCurrency(data.summary.upcomingMinor, data.currency)} meta="Later open cutoff schedules" />
        <SummaryCard label="Overdue" value={formatMinorCurrency(data.summary.overdueMinor, data.currency)} meta="Past-due outstanding schedules" />
        <SummaryCard label="Remaining to collect" value={formatMinorCurrency(data.summary.remainingToCollectMinor, data.currency)} meta="Across all actionable cutoffs" />
      </section>

      <Tabs label="Collection sections" items={tabs} value={activeSection} onValueChange={handleSectionChange} />
    </PageContainer>
  )
}
