'use client'

import type { ApiErrorPayload } from '@/lib/types'

export async function apiRequest<T>(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  const payload = (await response.json().catch(() => null)) as T | ApiErrorPayload | null

  if (!response.ok) {
    throw new Error((payload as ApiErrorPayload | null)?.message || 'Request failed')
  }

  return payload as T
}
