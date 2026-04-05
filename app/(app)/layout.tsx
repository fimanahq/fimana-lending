import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { REFRESH_COOKIE_NAME } from '@/lib/constants'

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  if (!cookieStore.get(REFRESH_COOKIE_NAME)?.value) {
    redirect('/login')
  }

  return <DashboardShell>{children}</DashboardShell>
}
