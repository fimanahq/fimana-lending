'use client'

import { ArrowRight, BriefcaseBusiness, FileText, LogOut, Plus, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { AppLogo } from '@/components/shared/app-logo'
import { Dialog } from '@/components/shared'
import { Button, Input, Select, Textarea } from '@/components/shared/forms'
import { formatCurrency, formatDate } from '@/lib/format'
import { validateLoanApplicationInput } from '@/lib/loan-application-validation'
import { getBorrowerRequestSemiMonthlyFirstPaymentDate } from '@/lib/loan-schedule'
import { normalizePhilippineMobileNumber } from '@/lib/phone'
import type { BorrowerPortalSummary } from '@/lib/types/borrower-portal'
import { createBorrowerPortalApplication, getBorrowerPortalSummary } from '@/services/borrower-portal'
import { updateCurrentUserProfile } from '@/services/auth'
import styles from './borrower-portal-dashboard.module.css'

interface BorrowerPortalDashboardProps {
  initialSummary: BorrowerPortalSummary
}

const PHONE_PREFIX = '+63 '

function buildInitialForm(user?: { email: string; firstName: string; lastName: string; mobileNumber?: string } | null) {
  return {
    publicLoanRequestSlug: '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.mobileNumber || PHONE_PREFIX,
    principal: '',
    gives: '12',
    income: '',
    purpose: '',
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function BorrowerPortalDashboard({ initialSummary }: BorrowerPortalDashboardProps) {
  const { setUser, user } = useAuth()
  const [summary, setSummary] = useState(initialSummary)
  const [form, setForm] = useState(() => buildInitialForm(user))
  const [applicationOpen, setApplicationOpen] = useState(false)
  const [profileMobileNumber, setProfileMobileNumber] = useState(user?.mobileNumber ?? PHONE_PREFIX)
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const requiresMobileNumber = user?.accountType === 'borrower' && !user.mobileNumber

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const openApplication = () => {
    setForm(buildInitialForm(user))
    setError('')
    setApplicationOpen(true)
  }

  const submitApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (!form.publicLoanRequestSlug.trim()) {
        throw new Error('Enter your lender request code.')
      }

      const validated = validateLoanApplicationInput({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        principal: Number(form.principal),
        gives: Number(form.gives),
        income: form.income.trim() ? Number(form.income) : null,
        purpose: form.purpose,
        paymentFrequency: 'semi_monthly',
        firstDay: '15',
        secondDay: 'month_end',
        firstPaymentDate: getBorrowerRequestSemiMonthlyFirstPaymentDate(),
      })

      await createBorrowerPortalApplication({
        ...validated,
        publicLoanRequestSlug: form.publicLoanRequestSlug.trim().toLowerCase(),
      })

      try {
        setSummary(await getBorrowerPortalSummary())
        setSuccess('Application submitted. Your lender can now review it.')
      } catch {
        setSuccess('Application submitted. Refresh the page to see the latest status.')
      }

      setApplicationOpen(false)
      setForm(buildInitialForm(user))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const saveProfileMobileNumber = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileError('')

    const normalizedMobileNumber = normalizePhilippineMobileNumber(profileMobileNumber)
    if (!normalizedMobileNumber) {
      setProfileError('Use a valid Philippine mobile number.')
      return
    }

    setSavingProfile(true)
    try {
      const payload = await updateCurrentUserProfile({ mobileNumber: normalizedMobileNumber })
      setUser(payload.user)
      setForm(buildInitialForm(payload.user))
    } catch (caughtError) {
      setProfileError(caughtError instanceof Error ? caughtError.message : 'Unable to save mobile number')
    } finally {
      setSavingProfile(false)
    }
  }

  const signOut = async () => {
    setSigningOut(true)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    setUser(null)
    window.location.replace('/login')
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <AppLogo suffix="Borrower Portal" />
        <div className={styles.accountMenu}>
          <div className={styles.accountCopy}>
            <strong>{user ? `${user.firstName} ${user.lastName}`.trim() : 'Borrower'}</strong>
            <span>{user?.email}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={signOut} disabled={signingOut}>
            <LogOut aria-hidden="true" />
            {signingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </header>

      <div className={styles.shell}>
        <h1 className="ui-sr-only">Borrower Portal overview</h1>

        {success ? <div className={styles.success} role="status">{success}</div> : null}

        <section className={styles.stats} aria-label="Account summary">
          <article className={styles.stat}>
            <span className={styles.statIcon}><WalletCards aria-hidden="true" /></span>
            <div><strong>{summary.counts.activeLoans}</strong><span>Active loans</span></div>
          </article>
          <article className={styles.stat}>
            <span className={styles.statIcon}><FileText aria-hidden="true" /></span>
            <div><strong>{summary.counts.applications}</strong><span>Applications</span></div>
          </article>
          <article className={styles.stat}>
            <span className={styles.statIcon}><BriefcaseBusiness aria-hidden="true" /></span>
            <div><strong>{summary.counts.linkedBorrowers}</strong><span>Linked records</span></div>
          </article>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><h2>Recent loans</h2><p>Balances and the next scheduled payment.</p></div>
            </div>
            <div className={styles.list}>
              {summary.loans.length ? summary.loans.map((loan) => (
                <article className={styles.item} key={loan.id}>
                  <div className={styles.itemTop}>
                    <div><strong>{loan.loanNumber}</strong><span>{loan.loanProduct.name}</span></div>
                    <span className={styles.status} data-status={loan.status}>{formatStatus(loan.status)}</span>
                  </div>
                  <div className={styles.loanAmount}>
                    <span>Outstanding balance</span>
                    <strong>{formatCurrency(loan.balances.totalOutstandingAmountMinor / 100, loan.loanProduct.currency)}</strong>
                  </div>
                  <div className={styles.itemFooter}>
                    <span>{loan.nextDueDate ? `Next due ${formatDate(loan.nextDueDate)}` : 'No payment currently due'}</span>
                    <ArrowRight aria-hidden="true" />
                  </div>
                </article>
              )) : (
                <div className={styles.empty}>
                  <WalletCards aria-hidden="true" />
                  <strong>No linked loans yet</strong>
                  <span>Approved and released loans will appear here automatically.</span>
                </div>
              )}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><h2>Recent applications</h2><p>Follow each request from submission to decision.</p></div>
              <Button className={styles.applyButton} size="sm" onClick={openApplication}>
                <Plus aria-hidden="true" />
                Apply for a loan
              </Button>
            </div>
            <div className={styles.list}>
              {summary.applications.length ? summary.applications.map((application) => (
                <article className={styles.item} key={application.id}>
                  <div className={styles.itemTop}>
                    <div><strong>{application.applicationNumber}</strong><span>Submitted {application.submittedAt ? formatDate(application.submittedAt) : formatDate(application.createdAt)}</span></div>
                    <span className={styles.status} data-status={application.status}>{formatStatus(application.status)}</span>
                  </div>
                  <div className={styles.loanAmount}>
                    <span>Requested amount</span>
                    <strong>{formatCurrency((application.loanAmountMinor ?? 0) / 100, application.loanProduct?.currency ?? 'PHP')}</strong>
                  </div>
                </article>
              )) : (
                <div className={styles.empty}>
                  <FileText aria-hidden="true" />
                  <strong>No applications yet</strong>
                  <span>Use the application action above with a lender request code to submit your first request.</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className={styles.linkedSection}>
          <div><h2>Linked borrower records</h2><p>Records matched through your verified email and submitted applications.</p></div>
          <div className={styles.linkedRecords}>
            {summary.linkedBorrowers.length ? summary.linkedBorrowers.map((borrower) => (
              <article className={styles.linkedRecord} key={borrower.id}>
                <div><strong>{borrower.displayName}</strong><span>{borrower.borrowerNumber}</span></div>
                <span>{borrower.email || borrower.mobileNumber || 'Contact details unavailable'}</span>
              </article>
            )) : <span className={styles.linkedEmpty}>No lender records are linked yet.</span>}
          </div>
        </section>
      </div>

      <Dialog
        id="borrower-application-dialog"
        open={applicationOpen}
        title="Apply with a lender code"
        description="Use the request code shared by your lender. Your verified email is used for this application."
        onClose={() => { if (!submitting) setApplicationOpen(false) }}
        className={styles.applicationDialog}
      >
        <form className={styles.form} onSubmit={submitApplication} noValidate>
          <Input id="portalLenderCode" label="Lender request code" value={form.publicLoanRequestSlug} onChange={(event) => updateField('publicLoanRequestSlug', event.target.value)} placeholder="Enter request code" required />
          <div className={styles.formGrid}>
            <Input id="portalFirstName" label="First name" autoComplete="given-name" value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} required />
            <Input id="portalLastName" label="Last name" autoComplete="family-name" value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} required />
          </div>
          <Input id="portalEmail" label="Verified email" type="email" value={form.email} readOnly hint="Applications are linked using this verified address." />
          <Input id="portalPhone" label="Mobile number" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} required />
          <div className={styles.formGrid}>
            <Input id="portalPrincipal" label="Loan amount" inputMode="decimal" value={form.principal} onChange={(event) => updateField('principal', event.target.value)} placeholder="0.00" required />
            <Input id="portalIncome" label="Monthly income" inputMode="decimal" value={form.income} onChange={(event) => updateField('income', event.target.value)} placeholder="Optional" />
          </div>
          <Select id="portalInstallments" label="Number of installments" value={form.gives} onChange={(event) => updateField('gives', event.target.value)}>
            {[6, 8, 10, 12, 18, 24].map((count) => <option key={count} value={count}>{count} installments</option>)}
          </Select>
          <Textarea id="portalPurpose" label="Loan purpose" value={form.purpose} onChange={(event) => updateField('purpose', event.target.value)} placeholder="Tell your lender how you plan to use the loan." />
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setApplicationOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit application'}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        id="borrower-profile-dialog"
        open={requiresMobileNumber}
        title="Add mobile number"
        description="A mobile number is required for account recovery and loan application contact."
        onClose={() => undefined}
        className={styles.profileDialog}
      >
        <form className={styles.profileForm} onSubmit={saveProfileMobileNumber} noValidate>
          <Input id="borrowerProfileMobileNumber" label="Mobile number" autoComplete="tel" inputMode="tel" error={profileError} maxLength={40} value={profileMobileNumber} onChange={(event) => { setProfileMobileNumber(event.target.value); setProfileError('') }} placeholder="+63 912 345 6789" />
          <Button type="submit" disabled={savingProfile} fullWidth>{savingProfile ? 'Saving...' : 'Save mobile number'}</Button>
        </form>
      </Dialog>
    </main>
  )
}
