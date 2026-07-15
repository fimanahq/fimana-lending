import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ToastProvider } from '@/components/shared'
import { hasBorrowerPortalAccess, hasLoanAppAccess } from '@/lib/access'
import { REFRESH_COOKIE_NAME } from '@/lib/constants'
import { getSessionUser } from '@/lib/server/backend'

export const dynamic = 'force-dynamic'

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()

  if (!user) {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value

    if (refreshToken) {
      const headerStore = await headers()
      const nextPath = headerStore.get('x-fimana-current-path') || '/dashboard'
      redirect(`/api/auth/refresh?next=${encodeURIComponent(nextPath)}`)
    }

    redirect('/login')
  }

  if (hasBorrowerPortalAccess(user)) {
    redirect('/portal')
  }

  if (!hasLoanAppAccess(user)) {
    redirect('/login')
  }

  return (
    <AuthProvider initialUser={user} shouldRefreshOnMount={false}>
      <ToastProvider>
        <DashboardShell>{children}</DashboardShell>
      </ToastProvider>
    </AuthProvider>
  )
}
