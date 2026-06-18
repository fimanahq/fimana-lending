'use client'

import { useEffect, useRef } from 'react'

type RefreshSessionOutcome = {
  ok: boolean
  status: number
}

let refreshSessionPromise: Promise<RefreshSessionOutcome> | null = null

interface RefreshSessionClientProps {
  nextPath: string
}

function requestRefreshSession() {
  if (!refreshSessionPromise) {
    const currentPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then((response) => ({ ok: response.ok, status: response.status }))
      .catch(() => ({ ok: false, status: 0 }))
      .finally(() => {
        globalThis.setTimeout(() => {
          if (refreshSessionPromise === currentPromise) {
            refreshSessionPromise = null
          }
        }, 5000)
      })

    refreshSessionPromise = currentPromise
  }

  return refreshSessionPromise
}

export function RefreshSessionClient({ nextPath }: RefreshSessionClientProps) {
  const refreshStartedRef = useRef(false)

  useEffect(() => {
    if (refreshStartedRef.current) {
      return
    }

    refreshStartedRef.current = true

    const loginUrl = new URL('/login', window.location.origin)
    loginUrl.searchParams.set('next', nextPath)

    async function refreshSession() {
      const response = await requestRefreshSession()

      if (response.ok) {
        window.location.replace(nextPath)
        return
      }

      if (response.status !== 401 && response.status !== 403) {
        loginUrl.searchParams.set('authError', 'refresh_unavailable')
      }

      window.location.replace(loginUrl.toString())
    }

    void refreshSession()
  }, [nextPath])

  return (
    <main className="session-restore" aria-live="polite" aria-busy="true">
      <div className="session-restore__mark" aria-hidden="true" />
      <p>Restoring session...</p>
    </main>
  )
}
