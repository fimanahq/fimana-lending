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

type SelectedLoan = { loanId: string; label: string }

function CutoffLedger({
  cutoff,
  currency,
}: {
  cutoff: DashboardCutoffReceivable
  currency: string
}) {
  return (
    <section className={styles.detailLedger} aria-label={`Cutoff totals for ${formatDate(cutoff.cutoffDate)}`}>
      <LedgerMetric label="Total receivable" value={formatMinorCurrency(cutoff.totalReceivableMinor, currency)} meta="Scheduled cutoff total" />
      <LedgerMetric label="Collected" value={formatMinorCurrency(cutoff.totalCollectedMinor, currency)} meta="Applied payments" />
      <LedgerMetric label="Principal" value={formatMinorCurrency(cutoff.principalDueMinor, currency)} meta="Scheduled principal" />
      <LedgerMetric label="Interest" value={formatMinorCurrency(cutoff.interestDueMinor, currency)} meta="Scheduled interest" />
      <LedgerMetric label="Penalty" value={formatMinorCurrency(cutoff.penaltyDueMinor, currency)} meta="Applied penalties" />
    </section>
  )
}

function CutoffLoansTable({
  currency,
  cutoff,
  detailPath,
  isRefreshing,
  onSelectLoan,
}: {
  currency: string
  cutoff: DashboardCutoffReceivable
  detailPath: string
  isRefreshing: boolean
  onSelectLoan: (loan: SelectedLoan) => void
}) {
  return (
    <TableShell
      label={`Loans and borrowers in cutoff on ${formatDate(cutoff.cutoffDate)}`}
      title="Borrowers & loans"
    >
      <DataTable>
        <thead>
          <tr>
            <th>Borrower</th>
            <th>Loan</th>
            <th>Total receivable</th>
            <th>Collected</th>
            <th>Remaining</th>
            <th>Overdue</th>
            <th>Cutoff status</th>
            <th>Loan status</th>
            <th className={styles.detailActionColumn}><span className="ui-sr-only">Actions</span></th>
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
                <td>{formatMinorCurrency(loan.overdueMinor ?? 0, currency)}</td>
                <td><span className={`status-pill ${collectionStatus}`}>{getLoanCollectionStatusLabel(collectionStatus)}</span></td>
                <td><span className={`status-pill ${loan.loanStatus}`}>{loan.loanStatus === 'completed' ? 'Completed' : 'Active'}</span></td>
                <td className={`${styles.actions} ${styles.detailActionColumn}`}>
                  <button
                    type="button"
                    className="button-ghost table-action-icon"
                    aria-label={`Post payment for ${loan.borrowerDisplayName} ${loan.loanNumber} in cutoff on ${formatDate(cutoff.cutoffDate)}`}
                    title={canPostPayment ? 'Post payment' : 'Payment unavailable'}
                    disabled={isRefreshing || !canPostPayment}
                    onClick={() => onSelectLoan({ loanId: loan.loanId, label: `${loan.borrowerDisplayName} · ${loan.loanNumber}` })}
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
  )
}

export function CollectionCutoffDetail({
  currency,
  cutoff,
  detailPath,
  error,
  previousCutoffs = [],
  returnPath,
}: {
  currency: string
  cutoff: DashboardCutoffReceivable | null
  detailPath: string
  error?: string
  previousCutoffs?: DashboardCutoffReceivable[]
  returnPath: string
}) {
  const router = useRouter()
  const [selectedLoan, setSelectedLoan] = useState<SelectedLoan | null>(null)
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

      <CutoffLedger cutoff={cutoff} currency={currency} />

      <CutoffLoansTable
        currency={currency}
        cutoff={cutoff}
        detailPath={detailPath}
        isRefreshing={isRefreshing}
        onSelectLoan={setSelectedLoan}
      />

      {previousCutoffs.length > 0 ? (
        <section className={styles.previousCutoffs} aria-labelledby="previous-cutoffs-heading">
          <header className={styles.previousCutoffsHeading}>
            <span className={styles.detailEyebrow}>Collection history</span>
            <h2 id="previous-cutoffs-heading">Previous cutoffs</h2>
            <p>The cutoff dates immediately before {formatDate(cutoff.cutoffDate)}.</p>
          </header>

          {previousCutoffs.map((previousCutoff) => (
            <article key={previousCutoff.cutoffDate} className={styles.previousCutoff}>
              <header className={styles.previousCutoffHeader}>
                <div className={styles.previousCutoffHeaderCopy}>
                  <div className={styles.detailEyebrowRow}>
                    <span className={styles.detailEyebrow}>Previous cutoff</span>
                    <span className={`status-pill ${previousCutoff.status}`}>{getReceivableStatusLabel(previousCutoff.status)}</span>
                  </div>
                  <h3>{formatDate(previousCutoff.cutoffDate)}</h3>
                  <p>
                    {previousCutoff.loanCount.toLocaleString('en-PH')} loan{previousCutoff.loanCount === 1 ? '' : 's'} across{' '}
                    {previousCutoff.borrowerCount.toLocaleString('en-PH')} borrower{previousCutoff.borrowerCount === 1 ? '' : 's'}
                  </p>
                </div>

                <div className={styles.previousCutoffBalance}>
                  <span>Remaining to collect</span>
                  <strong>{formatMinorCurrency(previousCutoff.remainingMinor, currency)}</strong>
                  <p>{formatMinorCurrency(previousCutoff.totalCollectedMinor, currency)} collected</p>
                </div>
              </header>

              <CutoffLedger cutoff={previousCutoff} currency={currency} />

              <CutoffLoansTable
                currency={currency}
                cutoff={previousCutoff}
                detailPath={detailPath}
                isRefreshing={isRefreshing}
                onSelectLoan={setSelectedLoan}
              />
            </article>
          ))}
        </section>
      ) : null}

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
