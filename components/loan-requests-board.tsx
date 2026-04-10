'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/client-api'
import { formatCurrency, formatDate, formatPaymentDay } from '@/lib/format'
import { getStatusClassName } from '@/lib/status'
import type { LoanRequest } from '@/lib/types'

export function LoanRequestsBoard() {
  const [requests, setRequests] = useState<LoanRequest[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setRequests(await apiRequest<LoanRequest[]>('/api/loan-requests'))
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load loan requests')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const handleReview = async (requestId: string, action: 'approve' | 'reject') => {
    setActingId(requestId)
    setError('')

    try {
      const updated = await apiRequest<LoanRequest>(`/api/loan-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })

      setRequests((current) => current.map((request) => (request.id === updated.id ? updated : request)))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to review request')
    } finally {
      setActingId(null)
    }
  }

  const pending = requests.filter((request) => request.status === 'pending')
  const reviewed = requests.filter((request) => request.status !== 'pending')

  return (
    <div className="stack">
      <section className="card panel">
        <div className="row-between-center">
          <div>
            <div className="eyebrow">Loan requests</div>
            <h1 className="section-title title-offset">Public intake queue</h1>
            <p className="muted">Approve the requests that should become real borrower records and issued loans.</p>
          </div>
          <Link href="/loans/new" className="button-secondary">Create loan manually</Link>
        </div>
      </section>

      {error ? <div className="notice danger">{error}</div> : null}

      <section className="request-grid">
        <div className="card panel stack">
          <div>
            <div className="eyebrow">Pending</div>
            <h2 className="section-title title-offset">{pending.length} waiting for review</h2>
          </div>

          {loading ? <div className="muted">Loading requests...</div> : null}

          {pending.map((request) => (
            <article key={request.id} className="request-card">
              <div className="request-meta">
                <div>
                  <div className="data-card__title">
                    {request.firstName} {request.lastName}
                  </div>
                  <div className="muted">Submitted {formatDate(request.createdAt)}</div>
                </div>
                <span className={getStatusClassName(request.status)}>{request.status}</span>
              </div>

              <div className="grid two">
                <div>
                  <div className="muted">Requested amount</div>
                  <div>{formatCurrency(request.principal)}</div>
                </div>
                <div>
                  <div className="muted">Schedule</div>
                  <div>
                    {request.paymentFrequency === 'monthly' ? 'Monthly' : 'Twice monthly'} on{' '}
                    {request.paymentDays.map(formatPaymentDay).join(' and ')}
                  </div>
                </div>
                <div>
                  <div className="muted">First payment</div>
                  <div>{formatDate(request.firstPaymentDate)}</div>
                </div>
                <div>
                  <div className="muted">Contact</div>
                  <div>{request.email || request.phone || 'No contact provided'}</div>
                </div>
              </div>

              {request.notes ? <div className="notice">{request.notes}</div> : null}

              <div className="inline-actions">
                <button
                  className="button"
                  disabled={actingId === request.id}
                  onClick={() => handleReview(request.id, 'approve')}
                >
                  {actingId === request.id ? 'Saving...' : 'Approve request'}
                </button>
                <button
                  className="button-ghost"
                  disabled={actingId === request.id}
                  onClick={() => handleReview(request.id, 'reject')}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}

          {!loading && pending.length === 0 ? <div className="muted">No pending requests right now.</div> : null}
        </div>

        <div className="card panel stack">
          <div>
            <div className="eyebrow">Reviewed</div>
            <h2 className="section-title title-offset">Recent decisions</h2>
          </div>

          {reviewed.map((request) => (
            <article key={request.id} className="request-card">
              <div className="request-meta">
                <div>
                  <div className="data-card__title">
                    {request.firstName} {request.lastName}
                  </div>
                  <div className="muted">
                    {request.reviewedBy ? `Reviewed by ${request.reviewedBy}` : 'Reviewed'} on{' '}
                    {request.reviewedAt ? formatDate(request.reviewedAt) : formatDate(request.createdAt)}
                  </div>
                </div>
                <span className={getStatusClassName(request.status)}>{request.status}</span>
              </div>

              <div className="grid two">
                <div>
                  <div className="muted">Requested amount</div>
                  <div>{formatCurrency(request.principal)}</div>
                </div>
                <div>
                  <div className="muted">First payment</div>
                  <div>{formatDate(request.firstPaymentDate)}</div>
                </div>
              </div>

              {request.loanId ? (
                <Link href={`/loans/${request.loanId}`} className="button-ghost">
                  Open approved loan
                </Link>
              ) : null}
            </article>
          ))}

          {reviewed.length === 0 ? <div className="muted">No reviewed requests yet.</div> : null}
        </div>
      </section>
    </div>
  )
}
