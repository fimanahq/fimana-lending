'use client'

import { Plus, WalletCards } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LoanApplicationIntakeForm } from '@/components/loan-application-intake-form'
import { useAuth } from '@/components/providers/auth-provider'
import { AppLogo } from '@/components/shared/app-logo'
import { Dialog, useToast } from '@/components/shared'
import { Button, Input } from '@/components/shared/forms'
import { formatCurrency, formatDate } from '@/lib/format'
import type { ValidatedLoanApplicationInput } from '@/lib/loan-application-validation'
import { normalizePhilippineMobileNumber } from '@/lib/phone'
import { formatLoanApplicationStatus, getStatusClassName } from '@/lib/status'
import type { BorrowerPortalSummary } from '@/lib/types/borrower-portal'
import type { LoanApplication, LoanApplicationRecordStatus, LoanRecord } from '@/lib/types/lending'
import { createBorrowerPortalApplication, getBorrowerPortalSummary } from '@/services/borrower-portal'
import { switchAccountMode, updateCurrentUserProfile } from '@/services/auth'
import styles from './borrower-portal-dashboard.module.css'

interface BorrowerPortalDashboardProps {
  initialSummary: BorrowerPortalSummary
}

const PHONE_PREFIX = '+63 '
const OPEN_APPLICATION_STATUSES: LoanApplicationRecordStatus[] = ['pending', 'submitted', 'under_review']

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

function getAccountInitials(firstName?: string, lastName?: string, email?: string) {
  const initials = `${firstName?.trim()[0] || ''}${lastName?.trim()[0] || ''}`.toUpperCase()

  if (initials) {
    return initials
  }

  return email?.trim()[0]?.toUpperCase() || ''
}

function getApplicationTimestamp(application: LoanApplication) {
  return new Date(application.submittedAt ?? application.createdAt).getTime()
}

function getOpenApplications(applications: LoanApplication[]) {
  return [...applications]
    .filter((application) => OPEN_APPLICATION_STATUSES.includes(application.status))
    .sort((firstApplication, secondApplication) => (
      getApplicationTimestamp(secondApplication) - getApplicationTimestamp(firstApplication)
    ))
}

function formatApplicationAmount(application: LoanApplication) {
  return formatCurrency(
    (application.loanAmountMinor ?? application.principal ?? 0) / (application.loanAmountMinor ? 100 : 1),
    application.loanProduct?.currency,
  )
}

export function BorrowerPortalDashboard({ initialSummary }: BorrowerPortalDashboardProps) {
  const { setUser, user } = useAuth()
  const toast = useToast()
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const [summary, setSummary] = useState(initialSummary)
  const [profileMobileNumber, setProfileMobileNumber] = useState(user?.mobileNumber ?? PHONE_PREFIX)
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [applicationOpen, setApplicationOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [switchingMode, setSwitchingMode] = useState(false)
  const [modeError, setModeError] = useState('')
  const requiresMobileNumber = user?.accountType === 'borrower' && !user.mobileNumber
  const applicationInitialValues = buildApplicationInitialValues(user)
  const applicationFormKey = `${applicationInitialValues.email}:${applicationInitialValues.phone}`
  const accountName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Borrower'
  const accountInitials = getAccountInitials(user?.firstName, user?.lastName, user?.email)
  const openApplications = getOpenApplications(summary.applications)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const submitPortalApplication = async (input: ValidatedLoanApplicationInput) => {
    if (!summary.lender) {
      throw new Error('A linked lender is required before you can submit a loan application.')
    }

    return createBorrowerPortalApplication(input)
  }

  const refreshAfterApplicationSubmit = async () => {
    try {
      setSummary(await getBorrowerPortalSummary())
      toast.success('Your lender can now review it.', 'Application submitted')
    } catch {
      toast.success('Refresh the page to see the latest status.', 'Application submitted')
    } finally {
      setApplicationOpen(false)
    }
  }

  const handleApplicationSubmitError = (submitError: Error) => {
    toast.error(submitError.message || 'Unable to submit loan application.', 'Submission failed')
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
        <div className={styles.accountMenu} ref={accountMenuRef}>
          <button
            className={styles.accountButton}
            type="button"
            aria-label={`${accountName} account menu`}
            aria-expanded={accountMenuOpen}
            aria-haspopup="menu"
            onClick={() => setAccountMenuOpen((current) => !current)}
          >
            <span className={styles.accountAvatar}>{accountInitials}</span>
          </button>

          {accountMenuOpen ? (
            <div className={styles.accountDropdown} role="menu" aria-label="Account menu">
              <div className={styles.accountDropdownHeader}>
                <span className={styles.accountAvatar}>{accountInitials}</span>
                <span className={styles.accountCopy}>
                  <span>{accountName}</span>
                  <span>{user?.email || 'Borrower menu'}</span>
                </span>
              </div>

              {user?.role === 'admin' ? (
                <button
                  className={styles.modeSwitch}
                  type="button"
                  role="menuitem"
                  onClick={() => switchToLenderMode()}
                  disabled={switchingMode || signingOut}
                >
                  {switchingMode ? 'Switching mode...' : 'Switch to lender mode'}
                </button>
              ) : null}

              {modeError ? (
                <div className={styles.modeError} role="alert">
                  {modeError}
                </div>
              ) : null}

              <button
                className={styles.logout}
                type="button"
                role="menuitem"
                onClick={signOut}
                disabled={signingOut || switchingMode}
              >
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          ) : null}
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
                      <div>
                        <strong>{dueSummary.dueDate ? formatDate(dueSummary.dueDate) : 'No payment due'}</strong>
                        <span>Due</span>
                        <span className={styles.loanNumber}>Loan # {loan.loanNumber}</span>
                      </div>
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

            {openApplications.map((application) => (
              <article className={styles.applicationStatus} key={application.id} aria-label="Application status">
                <div className={styles.applicationStatusHeader}>
                  <span>Application</span>
                  <span className={getStatusClassName(application.status)}>
                    {formatLoanApplicationStatus(application.status)}
                  </span>
                </div>
                {application.applicationNumber ? (
                  <span className={styles.applicationNumber}>
                    Application # {application.applicationNumber}
                  </span>
                ) : null}
                <div className={styles.applicationStatusBody}>
                  <strong>{formatApplicationAmount(application)}</strong>
                  <span>
                    Submitted {formatDate(application.submittedAt ?? application.createdAt)}
                  </span>
                </div>
              </article>
            ))}
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
          onSubmitError={handleApplicationSubmitError}
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
