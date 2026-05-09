import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/constants'
import { hasLoanAppAccess } from '@/lib/access'
import { clearSessionCookies, getSessionUser } from '@/lib/server/backend'

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const hasSession =
    Boolean(cookieStore.get(ACCESS_COOKIE_NAME)?.value)
    || Boolean(cookieStore.get(REFRESH_COOKIE_NAME)?.value)

  if (!hasSession) {
    redirect('/login')
  }

  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  if (!hasLoanAppAccess(user)) {
    await clearSessionCookies()
    redirect('/login')
  }

  return (
    <AuthProvider initialUser={user} shouldRefreshOnMount={false}>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  )
}
