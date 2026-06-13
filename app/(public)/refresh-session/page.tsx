import { RefreshSessionClient } from '@/components/auth/refresh-session-client'
import { isProtectedPath } from '@/lib/protected-routes'

interface RefreshSessionPageProps {
  searchParams?: Promise<{
    next?: string | string[]
  }>
}

function getSafeDestination(nextPath: string | string[] | undefined) {
  const path = Array.isArray(nextPath) ? nextPath[0] : nextPath
  return path && path.startsWith('/') && !path.startsWith('//') && isProtectedPath(path) ? path : '/dashboard'
}

export default async function RefreshSessionPage({ searchParams }: RefreshSessionPageProps) {
  const params = await searchParams
  const nextPath = getSafeDestination(params?.next)

  return <RefreshSessionClient nextPath={nextPath} />
}
