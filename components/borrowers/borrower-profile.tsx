'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  PageContainer,
  SectionHeader,
} from '@/components/shared'
import { BorrowerForm } from '@/components/borrowers/borrower-form'
import { BorrowerLoanHistory } from '@/components/borrowers/borrower-loan-history'
import type { Contact, Loan } from '@/lib/types'
import { getBorrower, listLoans } from '@/services'

interface BorrowerProfileProps {
  borrowerId: string
}

function getBorrowerName(borrower: Contact) {
  return `${borrower.firstName} ${borrower.lastName}`.trim() || 'Unnamed borrower'
}

function belongsToBorrower(loan: Loan, borrowerId: string) {
  return loan.contactId === borrowerId || loan.borrower?._id === borrowerId
}

export function BorrowerProfile({ borrowerId }: BorrowerProfileProps) {
  const [borrower, setBorrower] = useState<Contact | null>(null)
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const borrowerLoans = useMemo(
    () => loans.filter((loan) => belongsToBorrower(loan, borrowerId)),
    [borrowerId, loans],
  )

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [borrowerRow, loanRows] = await Promise.all([
        getBorrower(borrowerId),
        listLoans(),
      ])

      setBorrower(borrowerRow)
      setLoans(loanRows)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load borrower profile')
    } finally {
      setLoading(false)
    }
  }, [borrowerId])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  if (loading) {
    return (
      <PageContainer>
        <LoadingState title="Loading borrower profile" description="Fetching borrower details and loan history." />
      </PageContainer>
    )
  }

  if (error || !borrower) {
    return (
      <PageContainer>
        <ErrorState
          title="Unable to load borrower profile"
          description={error || 'Borrower record was not found.'}
          action={<Button variant="secondary" onClick={() => void loadProfile()}>Retry</Button>}
        />
      </PageContainer>
    )
  }

  const borrowerName = getBorrowerName(borrower)

  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Borrower profile"
        title={borrowerName}
        description="Contact record, account notes, and lending history for this borrower."
        actions={(
          <>
            <Link href="/borrowers" className="button-secondary">Back to borrowers</Link>
            <Link href="/loans/new" className="button">Create loan</Link>
          </>
        )}
      />

      {message ? <div className="notice">{message}</div> : null}

      <div className="borrower-profile-grid">
        <Card
          title="Profile"
          description="Borrower contact details used by lending workflows."
          actions={<Badge tone={borrower.isArchived ? 'warning' : 'success'}>{borrower.isArchived ? 'Archived' : 'Active'}</Badge>}
        >
          <dl className="borrower-detail-list">
            <div>
              <dt>Email</dt>
              <dd>{borrower.email || 'Not set'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{borrower.phone || 'Not set'}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{borrower.notes || 'No notes'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Edit borrower" description="Update borrower details without changing loan contracts.">
          <BorrowerForm
            mode="edit"
            borrower={borrower}
            onSaved={(updated) => {
              setBorrower(updated)
              setMessage('Borrower profile updated.')
            }}
          />
        </Card>
      </div>

      <SectionHeader
        title="Loan history"
        description="Summary uses values returned by the lending service."
        level="h2"
      />
      <BorrowerLoanHistory borrowerName={borrowerName} loans={borrowerLoans} />
    </PageContainer>
  )
}
