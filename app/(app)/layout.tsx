import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/constants'

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const hasSession =
    Boolean(cookieStore.get(ACCESS_COOKIE_NAME)?.value)
    || Boolean(cookieStore.get(REFRESH_COOKIE_NAME)?.value)

  if (!hasSession) {
    redirect('/login')
  }

  return <DashboardShell>{children}</DashboardShell>
}
