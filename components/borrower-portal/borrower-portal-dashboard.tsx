'use client'

import { Bell, CalendarRange, ChevronDown, Plus, WalletCards } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LoanApplicationIntakeForm } from '@/components/loan-application-intake-form'
import { useAuth } from '@/components/providers/auth-provider'
import { AppLogo } from '@/components/shared/app-logo'
import { DataTable, Dialog, useToast } from '@/components/shared'
import { Button, Input } from '@/components/shared/forms'
import { formatCurrency, formatDate } from '@/lib/format'
import type { ValidatedLoanApplicationInput } from '@/lib/loan-application-validation'
import { normalizePhilippineMobileNumber } from '@/lib/phone'
import {
  enablePushNotifications,
  getPushNotificationSupportMessage,
  syncExistingPushNotificationSubscription,
} from '@/lib/push-notifications'
import { formatLoanApplicationStatus, getStatusClassName } from '@/lib/status'
import type { BorrowerPortalSummary } from '@/lib/types/borrower-portal'
import type { LoanApplication, LoanApplicationRecordStatus, LoanRecord } from '@/lib/types/lending'
import { createBorrowerPortalApplication, getBorrowerPortalSummary } from '@/services/borrower-portal'
import { switchAccountMode, updateCurrentUserProfile } from '@/services/auth'
import { classNames } from '@/utils/class-names'
import styles from './borrower-portal-dashboard.module.css'

interface BorrowerPortalDashboardProps {
  initialSummary: BorrowerPortalSummary
  todayDateKey: string
}

const PHONE_PREFIX = '+63 '
const MIN_PORTAL_PARTIAL_PAYMENT_MINOR = 2000
const OPEN_APPLICATION_STATUSES: LoanApplicationRecordStatus[] = ['submitted']
type NotificationStatus = 'checking' | 'unsupported' | 'default' | 'denied' | 'syncError' | 'enabled'
type DueStatusTone = 'overdue' | 'dueToday' | 'partial' | 'upcoming'
type ScheduleStatusTone = DueStatusTone | 'paid' | 'cancelled'
type DueStatusSummary = { label: string; tone: DueStatusTone; detail?: string }

const dueStatusClassNames: Record<DueStatusTone, string> = {
  overdue: styles.dueStatusOverdue,
  dueToday: styles.dueStatusDueToday,
  partial: styles.dueStatusPartial,
  upcoming: styles.dueStatusUpcoming,
}

const scheduleStatusClassNames: Record<ScheduleStatusTone, string> = {
  overdue: styles.scheduleStatusOverdue,
  dueToday: styles.scheduleStatusDueToday,
  partial: styles.scheduleStatusPartial,
  upcoming: styles.scheduleStatusUpcoming,
  paid: styles.scheduleStatusPaid,
  cancelled: styles.scheduleStatusCancelled,
}

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

function getNextDueSummary(loan: LoanRecord, todayDateKey: string) {
  const schedule = [...(loan.schedule ?? [])].sort((firstRow, secondRow) => firstRow.sequence - secondRow.sequence)
  const upcomingScheduleRow = schedule.find((row) => row.status !== 'paid' && row.outstandingTotalAmountMinor > 0)
  const maxScheduleSequence = schedule.reduce((maxSequence, row) => Math.max(maxSequence, row.sequence), 0)
  const totalInstallments = Math.max(loan.installmentCount, schedule.length, maxScheduleSequence)
  const paidInstallments = schedule.filter((row) => row.status === 'paid').length
  const amountMinor = upcomingScheduleRow?.status === 'partial'
    && upcomingScheduleRow.paidTotalAmountMinor > 0
    && upcomingScheduleRow.paidTotalAmountMinor < MIN_PORTAL_PARTIAL_PAYMENT_MINOR
    ? upcomingScheduleRow.scheduledTotalAmountMinor
    : upcomingScheduleRow?.outstandingTotalAmountMinor ?? null
  const dueStatus = getDueStatus(upcomingScheduleRow, todayDateKey, loan.nextDueDate)
  const partialPaidAmountMinor = upcomingScheduleRow?.status === 'partial' && upcomingScheduleRow.paidTotalAmountMinor > 0
    ? upcomingScheduleRow.paidTotalAmountMinor
    : null

  return {
    amountMinor,
    dueDate: upcomingScheduleRow?.dueDate ?? loan.nextDueDate,
    dueStatus,
    partialPaidAmountMinor,
    progress: totalInstallments > 0 ? `${paidInstallments} of ${totalInstallments}` : '-',
  }
}

function getDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Manila',
    year: 'numeric',
  }).formatToParts(value)
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'

  return `${year}-${month}-${day}`
}

function getDateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatDaysOverdue(daysOverdue: number) {
  return `${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} overdue`
}

function getDueStatus(
  scheduleRow: NonNullable<LoanRecord['schedule']>[number] | undefined,
  todayKey: string,
  fallbackDueDate?: string | null,
): DueStatusSummary | null {
  const rawDueDate = scheduleRow?.dueDate ?? fallbackDueDate

  if (!rawDueDate) {
    return null
  }

  const dueDate = new Date(rawDueDate)
  const dueDateKey = getDateKey(dueDate)

  if (dueDateKey < todayKey) {
    const daysOverdue = Math.max(
      1,
      Math.round((getDateFromKey(todayKey).getTime() - getDateFromKey(dueDateKey).getTime()) / 86_400_000),
    )
    return { label: 'Overdue', tone: 'overdue', detail: formatDaysOverdue(daysOverdue) }
  }

  if (dueDateKey === todayKey) {
    return { label: 'Due today', tone: 'dueToday' }
  }

  if (
    scheduleRow?.status === 'partial'
    && scheduleRow.paidTotalAmountMinor >= MIN_PORTAL_PARTIAL_PAYMENT_MINOR
  ) {
    return { label: 'Partial', tone: 'partial' }
  }

  return { label: 'Upcoming', tone: 'upcoming' }
}

function getScheduleRowStatus(
  scheduleRow: NonNullable<LoanRecord['schedule']>[number],
  todayDateKey: string,
): { label: string; tone: ScheduleStatusTone } {
  if (scheduleRow.status === 'paid') {
    return { label: 'Paid', tone: 'paid' }
  }

  if (scheduleRow.status === 'cancelled') {
    return { label: 'Cancelled', tone: 'cancelled' }
  }

  return getDueStatus(scheduleRow, todayDateKey) ?? { label: 'Unavailable', tone: 'upcoming' }
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

function getNotificationNoticeContent(status: NotificationStatus) {
  if (status === 'checking') {
    return {
      title: 'Checking notifications',
      message: 'FiMana is checking whether this device can receive approval notifications. You can continue using the portal.',
      actionLabel: 'Checking...',
    }
  }

  if (status === 'unsupported') {
    return {
      title: 'Notifications are not available',
      message: 'This browser cannot receive approval notifications, but the borrower portal remains available.',
      actionLabel: 'Notifications unavailable',
    }
  }

  if (status === 'denied') {
    return {
      title: 'Notifications are blocked',
      message: 'Allow notifications for this site in your browser settings, then reload to receive approval updates.',
      actionLabel: 'Notifications blocked',
    }
  }

  if (status === 'syncError') {
    return {
      title: 'Notifications need attention',
      message: 'Permission is allowed, but this device is not subscribed. Retry to receive approval updates.',
      actionLabel: 'Retry notifications',
    }
  }

  return {
    title: 'Enable notifications',
    message: 'Receive loan application and approval updates on this device.',
    actionLabel: 'Enable notifications',
  }
}

function getNotificationFailureStatus(message: string): NotificationStatus {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('blocked') || normalizedMessage.includes('denied')) {
    return 'denied'
  }

  if (
    normalizedMessage.includes('not supported')
    || normalizedMessage.includes('secure connection')
    || normalizedMessage.includes('unsupported')
  ) {
    return 'unsupported'
  }

  return 'default'
}

export function BorrowerPortalDashboard({ initialSummary, todayDateKey }: BorrowerPortalDashboardProps) {
  const { setUser, user } = useAuth()
  const toast = useToast()
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const [summary, setSummary] = useState(initialSummary)
  const [profileMobileNumber, setProfileMobileNumber] = useState(user?.mobileNumber ?? PHONE_PREFIX)
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [applicationOpen, setApplicationOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('checking')
  const [notificationBusy, setNotificationBusy] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [switchingMode, setSwitchingMode] = useState(false)
  const [modeError, setModeError] = useState('')
  const requiresMobileNumber = user?.accountType === 'borrower' && !user.mobileNumber
  const applicationInitialValues = buildApplicationInitialValues(user)
  const applicationFormKey = `${applicationInitialValues.email}:${applicationInitialValues.phone}`
  const accountName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Borrower'
  const accountInitials = getAccountInitials(user?.firstName, user?.lastName, user?.email)
  const openApplications = getOpenApplications(summary.applications)
  const notificationNotice = getNotificationNoticeContent(notificationStatus)
  const notificationsEnabled = notificationStatus === 'enabled'
  const notificationNoticeTitleId = 'borrower-notification-notice-title'
  const notificationNoticeDescriptionId = 'borrower-notification-notice-description'

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

  useEffect(() => {
    const unsupportedMessage = getPushNotificationSupportMessage()
    if (unsupportedMessage) {
      setNotificationStatus('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setNotificationStatus('denied')
      return
    }

    if (Notification.permission !== 'granted') {
      setNotificationStatus('default')
      return
    }

    let active = true
    syncExistingPushNotificationSubscription()
      .then((subscription) => {
        if (active) {
          setNotificationStatus(subscription ? 'enabled' : 'default')
        }
      })
      .catch(() => {
        if (active) {
          setNotificationStatus('syncError')
        }
      })

    return () => {
      active = false
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

  const enableNotifications = async () => {
    setNotificationBusy(true)
    try {
      await enablePushNotifications()
      setNotificationStatus('enabled')
      toast.success('Approval updates can now appear on this device.', 'Notifications enabled')
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to enable notifications.'
      const failureStatus = getNotificationFailureStatus(message)
      setNotificationStatus(
        failureStatus === 'default' && typeof Notification !== 'undefined' && Notification.permission === 'granted'
          ? 'syncError'
          : failureStatus,
      )
      toast.error(message, 'Notifications unavailable')
    } finally {
      setNotificationBusy(false)
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
        <div className={styles.headerActions}>
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
        </div>
      </header>

      <div className={styles.shell}>
        <h1 className="ui-sr-only">Borrower Portal overview</h1>

        {modeError ? <div className={styles.error} role="alert">{modeError}</div> : null}

        {!notificationsEnabled ? (
          <section
            className={styles.notificationNotice}
            aria-labelledby={notificationNoticeTitleId}
            aria-describedby={notificationNotice.message ? notificationNoticeDescriptionId : undefined}
          >
            <span className={styles.notificationNoticeIcon}>
              <Bell aria-hidden="true" />
            </span>
            <div className={styles.notificationNoticeCopy}>
              <h2 id={notificationNoticeTitleId}>{notificationNotice.title}</h2>
              {notificationNotice.message ? <p id={notificationNoticeDescriptionId}>{notificationNotice.message}</p> : null}
            </div>
            <Button
              className={styles.notificationNoticeButton}
              onClick={enableNotifications}
              disabled={notificationBusy || notificationStatus === 'checking' || notificationStatus === 'unsupported' || notificationStatus === 'denied'}
            >
              <Bell aria-hidden="true" />
              {notificationBusy ? 'Enabling notifications...' : notificationNotice.actionLabel}
            </Button>
          </section>
        ) : null}

        <div className={styles.contentGrid}>
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div><h2>Active loans</h2></div>
              </div>
              <div className={styles.list}>
                {summary.loans.length ? summary.loans.map((loan) => {
                  const dueSummary = getNextDueSummary(loan, todayDateKey)
                  const scheduleRows = [...(loan.schedule ?? [])]
                    .sort((firstRow, secondRow) => firstRow.sequence - secondRow.sequence)

                  return (
                    <article className={styles.item} key={loan.id}>
                      <div className={styles.itemTop}>
                        <div>
                          <strong>{dueSummary.dueDate ? formatDate(dueSummary.dueDate) : 'No payment due'}</strong>
                          <span>Due</span>
                          <span className={styles.loanNumber}>Loan # {loan.loanNumber}</span>
                        </div>
                      </div>
                      <div className={styles.loanStatus}>
                        <span>Status</span>
                        {dueSummary.dueStatus ? (
                          <strong className={classNames(styles.dueStatus, dueStatusClassNames[dueSummary.dueStatus.tone])}>
                            {dueSummary.dueStatus.label}
                          </strong>
                        ) : (
                          <strong className={classNames(styles.dueStatus, styles.dueStatusUpcoming)}>Unavailable</strong>
                        )}
                        {dueSummary.dueStatus?.detail ? (
                          <span className={styles.statusDetail}>{dueSummary.dueStatus.detail}</span>
                        ) : null}
                        {dueSummary.partialPaidAmountMinor !== null ? (
                          <span className={styles.statusDetail}>
                            Paid {formatCurrency(dueSummary.partialPaidAmountMinor / 100, loan.loanProduct.currency)}
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.loanAmount}>
                        <span>Amount due</span>
                        <strong>{dueSummary.amountMinor === null ? 'Unavailable' : formatCurrency(dueSummary.amountMinor / 100, loan.loanProduct.currency)}</strong>
                      </div>
                      <div className={styles.itemFooter}>
                        <span>{dueSummary.progress}</span>
                        <small>Paid</small>
                      </div>
                      {scheduleRows.length ? (
                        <details className={styles.scheduleDisclosure}>
                          <summary className={styles.scheduleSummary}>
                            <span className={styles.scheduleIcon} aria-hidden="true">
                              <CalendarRange />
                            </span>
                            <span className={styles.scheduleLabel}>Schedules</span>
                            <ChevronDown className={styles.scheduleChevron} aria-hidden="true" />
                          </summary>
                          <div className={styles.scheduleDetails}>
                            <DataTable className={styles.scheduleTable} data-responsive-table-skip="true">
                              <thead>
                                <tr>
                                  <th>Scheduled payment</th>
                                  <th>Status</th>
                                  <th>Payment date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {scheduleRows.map((scheduleRow) => {
                                  const scheduleStatus = getScheduleRowStatus(scheduleRow, todayDateKey)
                                  const paymentDate = scheduleRow.status === 'paid' ? scheduleRow.paymentDate : null

                                  return (
                                    <tr key={scheduleRow.id}>
                                      <td><time dateTime={scheduleRow.dueDate}>{formatDate(scheduleRow.dueDate)}</time></td>
                                      <td>
                                        <span className={classNames(styles.scheduleStatus, scheduleStatusClassNames[scheduleStatus.tone])}>
                                          {scheduleStatus.label}
                                        </span>
                                      </td>
                                      <td>
                                        {paymentDate ? (
                                          <time dateTime={paymentDate}>{formatDate(paymentDate)}</time>
                                        ) : (
                                          <span className={styles.scheduleEmptyDate}>-</span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </DataTable>
                          </div>
                        </details>
                      ) : null}
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
