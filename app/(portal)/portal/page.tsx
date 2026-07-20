import { redirect } from 'next/navigation'
import { BorrowerPortalDashboard } from '@/components/borrower-portal/borrower-portal-dashboard'
import { hasBorrowerPortalAccess, hasLoanAppAccess } from '@/lib/access'
import { authorizedBackendRequest, BackendRequestError, getSessionUserWithRefresh } from '@/lib/server/backend'
import type { BorrowerPortalSummary } from '@/lib/types/borrower-portal'

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

export default async function BorrowerPortalPage() {
  let summary: BorrowerPortalSummary

  try {
    summary = await authorizedBackendRequest<BorrowerPortalSummary>('/borrower-portal/summary')
  } catch (error) {
    if (error instanceof BackendRequestError && (error.status === 401 || error.status === 403)) {
      const user = await getSessionUserWithRefresh()

      if (!user) {
        redirect('/login?next=/portal')
      }

      if (hasLoanAppAccess(user)) {
        redirect('/dashboard')
      }

      if (!hasBorrowerPortalAccess(user)) {
        redirect('/login')
      }

      if (!user.emailVerified) {
        redirect('/verify-email')
      }
    }

    throw error
  }

  return <BorrowerPortalDashboard initialSummary={summary} todayDateKey={getDateKey(new Date())} />
}
