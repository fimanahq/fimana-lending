'use client'

import { useEffect } from 'react'

interface ApiWakeupProps {
  apiUrl: string
}

export function ApiWakeup({ apiUrl }: ApiWakeupProps) {
  useEffect(() => {
    const normalizedApiUrl = apiUrl.trim().replace(/\/+$/, '')
    if (!normalizedApiUrl) {
      return
    }

    let healthUrl: string

    try {
      const url = new URL(`${normalizedApiUrl}/health`)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return
      }

      healthUrl = url.toString()
    } catch {
      return
    }

    void fetch(healthUrl, {
      cache: 'no-store',
      credentials: 'omit',
    }).catch(() => undefined)
  }, [apiUrl])

  return null
}
