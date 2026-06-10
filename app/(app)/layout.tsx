import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ToastProvider } from '@/components/shared'
import { hasLoanAppAccess } from '@/lib/access'
import { getSessionUser } from '@/lib/server/backend'

export const dynamic = 'force-dynamic'

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
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
