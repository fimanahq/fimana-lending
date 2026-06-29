'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowLeft } from 'lucide-react'
import { LoanPaymentDialog } from '@/components/payments'
import { DataTable, ErrorState, PageContainer, ProtectedLink as Link, TableShell } from '@/components/shared'
import { PaymentIcon } from '@/components/shared/table-icons'
import { formatCurrency, formatDate } from '@/lib/format'
import { buildLoanDetailPath } from '@/lib/loan-navigation'
import type { DashboardCutoffReceivable } from '@/lib/types/lending'
import {
  getLoanCollectionStatus,
  getLoanCollectionStatusLabel,
  getReceivableStatusLabel,
  sortCutoffLoans,
} from './collections-data'
import styles from './collections.module.css'

function formatMinorCurrency(valueMinor: number, currency: string) {
  return formatCurrency(valueMinor / 100, currency)
}

function LedgerMetric({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className={styles.detailLedgerItem}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{meta}</p>
    </div>
  )
}

export function CollectionCutoffDetail({
  currency,
  cutoff,
  detailPath,
  error,
  returnPath,
}: {
  currency: string
  cutoff: DashboardCutoffReceivable | null
  detailPath: string
  error?: string
  returnPath: string
}) {
  const router = useRouter()
  const [selectedLoan, setSelectedLoan] = useState<{ loanId: string; label: string } | null>(null)
  const [isRefreshing, startRefresh] = useTransition()

  if (!cutoff) {
    return (
      <PageContainer>
        <ErrorState
          title="Cutoff detail unavailable"
          description={error || 'This cutoff could not be found.'}
          action={<Link href={returnPath} className="button-secondary">Back to collections</Link>}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer className={styles.page}>
      <Link href={returnPath} className={styles.detailBackLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to collections
      </Link>

      <header className={styles.detailHeader}>
        <div className={styles.detailHeaderCopy}>
          <div className={styles.detailEyebrowRow}>
            <span className={styles.detailEyebrow}>Collection cutoff</span>
            <span className={`status-pill ${cutoff.status}`}>{getReceivableStatusLabel(cutoff.status)}</span>
          </div>
          <h1>{formatDate(cutoff.cutoffDate)}</h1>
          <p>
            {cutoff.loanCount.toLocaleString('en-PH')} loan{cutoff.loanCount === 1 ? '' : 's'} across{' '}
            {cutoff.borrowerCount.toLocaleString('en-PH')} borrower{cutoff.borrowerCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className={styles.detailBalance}>
          <span>Remaining to collect</span>
          <strong>{formatMinorCurrency(cutoff.remainingMinor, currency)}</strong>
          <p>{formatMinorCurrency(cutoff.totalCollectedMinor, currency)} collected</p>
        </div>
      </header>

      {isRefreshing ? <div className="notice" role="status">Refreshing cutoff data…</div> : null}

      <section className={styles.detailLedger} aria-label="Cutoff totals">
        <LedgerMetric label="Total receivable" value={formatMinorCurrency(cutoff.totalReceivableMinor, currency)} meta="Scheduled cutoff total" />
        <LedgerMetric label="Collected" value={formatMinorCurrency(cutoff.totalCollectedMinor, currency)} meta="Applied payments" />
        <LedgerMetric label="Principal" value={formatMinorCurrency(cutoff.principalDueMinor, currency)} meta="Scheduled principal" />
        <LedgerMetric label="Interest" value={formatMinorCurrency(cutoff.interestDueMinor, currency)} meta="Scheduled interest" />
        <LedgerMetric label="Penalty" value={formatMinorCurrency(cutoff.penaltyDueMinor, currency)} meta="Applied penalties" />
      </section>

      <TableShell label="Loans and borrowers in cutoff" title="Borrowers & loans">
        <DataTable>
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Loan</th>
              <th>Total receivable</th>
              <th>Collected</th>
              <th>Remaining</th>
              <th>Cutoff status</th>
              <th>Loan status</th>
              <th><span className="ui-sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {sortCutoffLoans(cutoff.loans).map((loan) => {
              const collectionStatus = getLoanCollectionStatus(loan)
              const canPostPayment = loan.loanStatus === 'active' && loan.remainingMinor > 0

              return (
                <tr key={loan.loanId}>
                  <td>
                    <Link href={buildLoanDetailPath(loan.loanId, detailPath)}>{loan.borrowerDisplayName}</Link>
                    <div className="muted micro-copy">{loan.borrowerNumber}</div>
                  </td>
                  <td><Link href={buildLoanDetailPath(loan.loanId, detailPath)}>{loan.loanNumber}</Link></td>
                  <td>{formatMinorCurrency(loan.totalReceivableMinor, currency)}</td>
                  <td>{formatMinorCurrency(loan.totalCollectedMinor, currency)}</td>
                  <td>{formatMinorCurrency(loan.remainingMinor, currency)}</td>
                  <td><span className={`status-pill ${collectionStatus}`}>{getLoanCollectionStatusLabel(collectionStatus)}</span></td>
                  <td><span className={`status-pill ${loan.loanStatus}`}>{loan.loanStatus === 'completed' ? 'Completed' : 'Active'}</span></td>
                  <td className={styles.actions}>
                    <button
                      type="button"
                      className="button-ghost table-action-icon"
                      aria-label={`Post payment for ${loan.borrowerDisplayName} ${loan.loanNumber}`}
                      title={canPostPayment ? 'Post payment' : 'Payment unavailable'}
                      disabled={isRefreshing || !canPostPayment}
                      onClick={() => setSelectedLoan({ loanId: loan.loanId, label: `${loan.borrowerDisplayName} · ${loan.loanNumber}` })}
                    >
                      <PaymentIcon />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      </TableShell>

      <LoanPaymentDialog
        open={Boolean(selectedLoan)}
        loanId={selectedLoan?.loanId ?? ''}
        loanLabel={selectedLoan?.label}
        onClose={() => setSelectedLoan(null)}
        onPaymentPosted={() => {
          setSelectedLoan(null)
          startRefresh(() => router.refresh())
        }}
      />
    </PageContainer>
  )
}
