'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageContainer,
  Pagination,
  ProtectedLink as Link,
  TableShell,
} from '@/components/shared'
import { ViewIcon } from '@/components/shared/table-icons'
import type { Borrower } from '@/lib/types/lending'
import { listBorrowersPaginated } from '@/services'
import { classNames } from '@/utils/class-names'
import toolbarStyles from '@/components/shared/list-toolbar.module.css'

type BorrowerListFilter = 'all' | 'defaulted'

const ITEMS_PER_PAGE = 20

const BORROWER_FILTERS: Array<{ label: string; value: BorrowerListFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Defaulted', value: 'defaulted' },
]

function getBorrowerName(borrower: Borrower) {
  return borrower.fullName.trim() || 'Unnamed borrower'
}

export function BorrowerList() {
  const router = useRouter()

  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<BorrowerListFilter>('all')

  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  const loadBorrowers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await listBorrowersPaginated({
        page,
        itemsPerPage: ITEMS_PER_PAGE,
        search: debouncedQuery,
        hasDefaultedLoan: activeFilter === 'defaulted' ? true : undefined,
      })

      setBorrowers(response.items)
      setTotalItems(response.total)
      setTotalPages(Math.max(response.totalPages, 1))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load borrowers')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedQuery, activeFilter])

  useEffect(() => {
    void loadBorrowers()
  }, [loadBorrowers])

  const openBorrower = (borrowerId: string) => {
    router.push(`/borrowers/${borrowerId}`)
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, borrowerId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openBorrower(borrowerId)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setDebouncedQuery('')
    setPage(1)
  }

  return (
    <PageContainer>
      <div className={classNames('card panel', toolbarStyles.toolbar)}>
        <Input
          id="borrower-search"
          label="Search borrowers"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, email, phone, or notes"
        />

        <div className={classNames('inline-actions', toolbarStyles.actions)}>
          <Link href="/borrowers/new" className="button">
            Add borrower
          </Link>
        </div>
      </div>

      <div className="application-status-tabs" aria-label="Borrower list filters">
        {BORROWER_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={activeFilter === filter.value ? 'is-active' : ''}
            onClick={() => {
              setActiveFilter(filter.value)
              setPage(1)
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState title="Loading borrowers" description="Fetching borrower records from the service." />
      ) : null}

      {!loading && error ? (
        <ErrorState
          title="Unable to load borrowers"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadBorrowers()}>
              Retry
            </Button>
          }
        />
      ) : null}

      {!loading && !error && borrowers.length === 0 && !debouncedQuery && activeFilter === 'all' ? (
        <EmptyState
          title="No borrowers yet"
          description="Add the first borrower profile before issuing or tracking loans."
          action={
            <Link href="/borrowers/new" className="button-secondary">
              Add borrower
            </Link>
          }
        />
      ) : null}

      {!loading && !error && borrowers.length === 0 && activeFilter === 'defaulted' ? (
        <EmptyState
          title={debouncedQuery ? 'No defaulted borrowers match your search' : 'No defaulted borrowers'}
          description={
            debouncedQuery
              ? 'Clear the search or return to all borrowers.'
              : 'Borrowers with defaulted loans will appear here.'
          }
          action={
            debouncedQuery ? (
              <Button variant="ghost" onClick={clearSearch}>
                Clear search
              </Button>
            ) : null
          }
        />
      ) : null}

      {!loading && !error && borrowers.length === 0 && debouncedQuery && activeFilter === 'all' ? (
        <EmptyState
          title="No borrowers match your search"
          description="Clear the search to return to the full borrower list."
          action={
            <Button variant="ghost" onClick={clearSearch}>
              Clear search
            </Button>
          }
        />
      ) : null}

      {!loading && !error && borrowers.length > 0 ? (
        <>
          <TableShell label="Borrower list">
            <table>
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Loan flags</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {borrowers.map((borrower) => (
                  <tr
                    key={borrower.id}
                    className="table-row-link"
                    tabIndex={0}
                    role="link"
                    aria-label={`Open borrower profile for ${getBorrowerName(borrower)}`}
                    onClick={() => openBorrower(borrower.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, borrower.id)}
                  >
                    <td>
                      <span className="data-card__title">{getBorrowerName(borrower)}</span>
                      <div className="muted micro-copy">{borrower.borrowerNumber}</div>
                    </td>

                    <td>{borrower.email || 'Not set'}</td>

                    <td>{borrower.contactNumber || 'Not set'}</td>

                    <td>
                      <Badge tone={borrower.status === 'active' ? 'success' : 'warning'}>
                        {borrower.status}
                      </Badge>
                    </td>

                    <td>
                      {borrower.hasDefaultedLoan ? (
                        <Badge tone="danger">
                          {borrower.defaultedLoanCount > 1
                            ? `${borrower.defaultedLoanCount} defaulted loans`
                            : 'Defaulted loan'}
                        </Badge>
                      ) : (
                        <span className="muted micro-copy">None</span>
                      )}
                    </td>

                    <td>
                      <Link
                        href={`/borrowers/${borrower.id}`}
                        className="button-ghost table-action-icon"
                        aria-label={`View borrower profile for ${getBorrowerName(borrower)}`}
                        title="View profile"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ViewIcon />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemLabel="borrowers"
            loading={loading}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </PageContainer>
  )
}
