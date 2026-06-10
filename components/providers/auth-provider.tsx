'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AUTH_FETCH_TIMEOUT_MS, fetchWithTimeout } from '@/lib/fetch-timeout'
import type { User } from '@/lib/types/shared'

interface AuthContextValue {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
  initialUser?: User | null
  shouldRefreshOnMount?: boolean
}

export function AuthProvider({
  children,
  initialUser = null,
  shouldRefreshOnMount = true,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [loading, setLoading] = useState(initialUser ? false : shouldRefreshOnMount)
  const refreshInFlightRef = useRef<Promise<void> | null>(null)

  const refresh = useCallback(() => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current
    }

    refreshInFlightRef.current = (async () => {
      setLoading(true)

      try {
        const response = await fetchWithTimeout('/api/auth/session', { cache: 'no-store' }, AUTH_FETCH_TIMEOUT_MS)
        if (response.status === 408 || response.status === 503) {
          return
        }

        if (!response.ok) {
          setUser(null)
          return
        }

        const payload = (await response.json()) as { user: User }
        setUser(payload.user)
      } catch {
        return
      } finally {
        setLoading(false)
        refreshInFlightRef.current = null
      }
    })()

    return refreshInFlightRef.current
  }, [])

  useEffect(() => {
    if (!shouldRefreshOnMount || initialUser) {
      return
    }

    void refresh()
  }, [initialUser, refresh, shouldRefreshOnMount])

  const value = useMemo(() => ({
    user,
    loading,
    setUser,
    refresh,
  }), [loading, refresh, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
