'use client'

import type { ApiErrorPayload } from '@/lib/types'

export class ApiRequestError extends Error {
  status: number
  payload: ApiErrorPayload | null

  constructor(message: string, status: number, payload: ApiErrorPayload | null) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.payload = payload
  }
}

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
    const errorPayload = payload as ApiErrorPayload | null
    throw new ApiRequestError(errorPayload?.message || 'Request failed', response.status, errorPayload)
  }

  return payload as T
}
