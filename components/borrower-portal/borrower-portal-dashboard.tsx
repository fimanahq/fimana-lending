'use client'

import { ArrowLeftRight, LogOut, Plus, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { LoanApplicationIntakeForm } from '@/components/loan-application-intake-form'
import { useAuth } from '@/components/providers/auth-provider'
import { AppLogo } from '@/components/shared/app-logo'
import { Dialog } from '@/components/shared'
import { Button, Input } from '@/components/shared/forms'
import { formatCurrency, formatDate } from '@/lib/format'
import type { ValidatedLoanApplicationInput } from '@/lib/loan-application-validation'
import { normalizePhilippineMobileNumber } from '@/lib/phone'
import type { BorrowerPortalSummary } from '@/lib/types/borrower-portal'
import type { LoanRecord } from '@/lib/types/lending'
import { createBorrowerPortalApplication, getBorrowerPortalSummary } from '@/services/borrower-portal'
import { switchAccountMode, updateCurrentUserProfile } from '@/services/auth'
import styles from './borrower-portal-dashboard.module.css'

interface BorrowerPortalDashboardProps {
  initialSummary: BorrowerPortalSummary
}

const PHONE_PREFIX = '+63 '

function buildApplicationInitialValues(
  user?: { email: string; firstName: string; lastName: string; mobileNumber?: string } | null,
) {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.mobileNumber || PHONE_PREFIX,
  }
}

function getNextDueSummary(loan: LoanRecord) {
  const schedule = [...(loan.schedule ?? [])].sort((firstRow, secondRow) => firstRow.sequence - secondRow.sequence)
  const upcomingScheduleRow = schedule.find((row) => row.status !== 'paid' && row.outstandingTotalAmountMinor > 0)
  const maxScheduleSequence = schedule.reduce((maxSequence, row) => Math.max(maxSequence, row.sequence), 0)
  const totalInstallments = Math.max(loan.installmentCount, schedule.length, maxScheduleSequence)
  const paidInstallments = schedule.filter((row) => row.status === 'paid').length

  return {
    amountMinor: upcomingScheduleRow?.outstandingTotalAmountMinor ?? null,
    dueDate: upcomingScheduleRow?.dueDate ?? loan.nextDueDate,
    progress: totalInstallments > 0 ? `${paidInstallments}/${totalInstallments}` : '-',
  }
}

export function BorrowerPortalDashboard({ initialSummary }: BorrowerPortalDashboardProps) {
  const { setUser, user } = useAuth()
  const [summary, setSummary] = useState(initialSummary)
  const [profileMobileNumber, setProfileMobileNumber] = useState(user?.mobileNumber ?? PHONE_PREFIX)
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [applicationOpen, setApplicationOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [switchingMode, setSwitchingMode] = useState(false)
  const [modeError, setModeError] = useState('')
  const requiresMobileNumber = user?.accountType === 'borrower' && !user.mobileNumber
  const applicationInitialValues = buildApplicationInitialValues(user)
  const applicationFormKey = `${applicationInitialValues.email}:${applicationInitialValues.phone}`

  const submitPortalApplication = async (input: ValidatedLoanApplicationInput) => {
    if (!summary.lender) {
      throw new Error('A linked lender is required before you can submit a loan application.')
    }

    return createBorrowerPortalApplication(input)
  }

  const refreshAfterApplicationSubmit = async () => {
    try {
      setSummary(await getBorrowerPortalSummary())
      return 'Application submitted. Your lender can now review it.'
    } catch {
      return 'Application submitted. Refresh the page to see the latest status.'
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

  const switchToLenderMode = async () => {
    if (switchingMode) {
      return
    }

    setSwitchingMode(true)
    setModeError('')

    try {
      const payload = await switchAccountMode('lender')
      setUser(payload.user)
      window.location.replace('/dashboard')
    } catch (caughtError) {
      setModeError(caughtError instanceof Error ? caughtError.message : 'Unable to switch to lender mode')
      setSwitchingMode(false)
    }
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
          {user?.role === 'admin' ? (
            <Button variant="secondary" size="sm" onClick={switchToLenderMode} disabled={switchingMode || signingOut}>
              <ArrowLeftRight aria-hidden="true" />
              {switchingMode ? 'Switching mode...' : 'Switch to lender mode'}
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={signOut} disabled={signingOut || switchingMode}>
            <LogOut aria-hidden="true" />
            {signingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </header>

      <div className={styles.shell}>
        <h1 className="ui-sr-only">Borrower Portal overview</h1>

        {modeError ? <div className={styles.error} role="alert">{modeError}</div> : null}

        <div className={styles.contentGrid}>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><h2>Active loans</h2></div>
            </div>
            <div className={styles.list}>
              {summary.loans.length ? summary.loans.map((loan) => {
                const dueSummary = getNextDueSummary(loan)

                return (
                  <article className={styles.item} key={loan.id}>
                    <div className={styles.itemTop}>
                      <div><strong>{dueSummary.dueDate ? formatDate(dueSummary.dueDate) : 'No payment due'}</strong><span>Due</span></div>
                    </div>
                    <div className={styles.loanAmount}>
                      <span>Amount due</span>
                      <strong>{dueSummary.amountMinor === null ? 'Unavailable' : formatCurrency(dueSummary.amountMinor / 100, loan.loanProduct.currency)}</strong>
                    </div>
                    <div className={styles.itemFooter}>
                      <span>{dueSummary.progress}</span>
                    </div>
                  </article>
                )
              }) : (
                <div className={styles.empty}>
                  <WalletCards aria-hidden="true" />
                  <strong>No active loans yet</strong>
                  <span>Released loans will appear here while they are active.</span>
                </div>
              )}
            </div>
          </section>

          <div className={styles.applyAction}>
            <Button
              className={styles.applyButton}
              onClick={() => setApplicationOpen(true)}
            >
              <Plus aria-hidden="true" />
              Apply for a loan
            </Button>
          </div>
        </div>

      </div>

      <Dialog
        id="borrower-application-dialog"
        open={applicationOpen}
        title="Apply for a loan"
        description={summary.lender
          ? `Your verified application will be sent to ${summary.lender.displayName}.`
          : 'Your account is not linked to a lender yet.'}
        onClose={() => setApplicationOpen(false)}
        className={styles.applicationDialog}
      >
        <LoanApplicationIntakeForm
          key={applicationFormKey}
          idPrefix="portalApplication"
          initialValues={applicationInitialValues}
          emailReadOnly
          disabled={!summary.lender}
          disabledMessage={!summary.lender ? 'A linked lender is required before you can submit a loan application.' : undefined}
          finePrint="Your verified email is used to link this application to your borrower portal account."
          onSubmitApplication={submitPortalApplication}
          onSubmitted={refreshAfterApplicationSubmit}
        />
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
