'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageContainer,
  SectionHeader,
  TableShell,
} from '@/components/shared'
import type { Contact } from '@/lib/types'
import { listBorrowers } from '@/services'

function getBorrowerName(borrower: Contact) {
  return `${borrower.firstName} ${borrower.lastName}`.trim() || 'Unnamed borrower'
}

function matchesQuery(borrower: Contact, query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [
    getBorrowerName(borrower),
    borrower.email,
    borrower.phone,
    borrower.notes,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedQuery))
}

export function BorrowerList() {
  const router = useRouter()
  const [borrowers, setBorrowers] = useState<Contact[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const filteredBorrowers = useMemo(
    () => borrowers.filter((borrower) => matchesQuery(borrower, query)),
    [borrowers, query],
  )

  const loadBorrowers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setBorrowers(await listBorrowers())
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load borrowers')
    } finally {
      setLoading(false)
    }
  }, [])

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

  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Borrowers"
        title="Borrower profiles"
        description="Manage borrower records, contact details, notes, and lending history."
        actions={<Link href="/borrowers/new" className="button">Add borrower</Link>}
      />

      <div className="card panel borrower-list__toolbar">
        <Input
          id="borrower-search"
          label="Search borrowers"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, email, phone, or notes"
        />
      </div>

      {loading ? (
        <LoadingState title="Loading borrowers" description="Fetching borrower records from the service." />
      ) : null}

      {!loading && error ? (
        <ErrorState
          title="Unable to load borrowers"
          description={error}
          action={<Button variant="secondary" onClick={() => void loadBorrowers()}>Retry</Button>}
        />
      ) : null}

      {!loading && !error && borrowers.length === 0 ? (
        <EmptyState
          title="No borrowers yet"
          description="Add the first borrower profile before issuing or tracking loans."
          action={<Link href="/borrowers/new" className="button-secondary">Add borrower</Link>}
        />
      ) : null}

      {!loading && !error && borrowers.length > 0 ? (
        <>
          {filteredBorrowers.length === 0 ? (
            <EmptyState
              title="No borrowers match your search"
              description="Clear the search to return to the full borrower list."
              action={<Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}
            />
          ) : null}

          {filteredBorrowers.length > 0 ? (
            <TableShell label="Borrower list">
              <table>
                <thead>
                  <tr>
                    <th>Borrower</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBorrowers.map((borrower) => (
                    <tr
                      key={borrower._id}
                      className="table-row-link"
                      tabIndex={0}
                      role="link"
                      aria-label={`Open borrower profile for ${getBorrowerName(borrower)}`}
                      onClick={() => openBorrower(borrower._id)}
                      onKeyDown={(event) => handleRowKeyDown(event, borrower._id)}
                    >
                      <td>
                        <span className="data-card__titleLink">{getBorrowerName(borrower)}</span>
                      </td>
                      <td>{borrower.email || 'Not set'}</td>
                      <td>{borrower.phone || 'Not set'}</td>
                      <td className="borrower-list__notes">{borrower.notes || 'No notes'}</td>
                      <td>
                        <Badge tone={borrower.isArchived ? 'warning' : 'success'}>
                          {borrower.isArchived ? 'Archived' : 'Active'}
                        </Badge>
                      </td>
                      <td>
                        <Link
                          href={`/borrowers/${borrower._id}`}
                          className="button-ghost"
                          onClick={(event) => event.stopPropagation()}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          ) : null}
        </>
      ) : null}
    </PageContainer>
  )
}
