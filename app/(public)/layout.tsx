import { AuthProvider } from '@/components/providers/auth-provider'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider shouldRefreshOnMount={false}>{children}</AuthProvider>
}
