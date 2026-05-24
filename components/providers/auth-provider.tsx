'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
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

  const refresh = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' })
      if (!response.ok) {
        setUser(null)
        return
      }

      const payload = (await response.json()) as { user: User }
      setUser(payload.user)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!shouldRefreshOnMount || initialUser) {
      return
    }

    void refresh()
  }, [initialUser, shouldRefreshOnMount])

  const value = useMemo(() => ({
    user,
    loading,
    setUser,
    refresh,
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
