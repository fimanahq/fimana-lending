import { AuthProvider } from '@/components/providers/auth-provider'
import { ToastProvider } from '@/components/shared'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider shouldRefreshOnMount={false}>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  )
}
