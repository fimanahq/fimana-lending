import { BorrowerPortalDashboard } from '@/components/borrower-portal/borrower-portal-dashboard'
import { authorizedBackendRequest } from '@/lib/server/backend'
import type { BorrowerPortalSummary } from '@/lib/types/borrower-portal'

export default async function BorrowerPortalPage() {
  const summary = await authorizedBackendRequest<BorrowerPortalSummary>('/borrower-portal/summary')
  return <BorrowerPortalDashboard initialSummary={summary} />
}
