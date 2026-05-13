import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { AuthProvider } from '@/components/providers/auth-provider'
import { hasLoanAppAccess } from '@/lib/access'
import { getSessionUserWithRefresh } from '@/lib/server/backend'

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUserWithRefresh()

  if (!user) {
    redirect('/login')
  }

  if (!hasLoanAppAccess(user)) {
    redirect('/login')
  }

  return (
    <AuthProvider initialUser={user} shouldRefreshOnMount={false}>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  )
}
