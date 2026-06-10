'use client'

import { fetchWithTimeout, getFetchFailureMessage, isAbortLikeError } from '@/lib/fetch-timeout'
import type { ApiErrorPayload } from '@/lib/types/shared'

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

  let response: Response

  try {
    response = await fetchWithTimeout(input, {
      ...init,
      headers,
    })
  } catch (error) {
    if (isAbortLikeError(error)) {
      throw new ApiRequestError(getFetchFailureMessage(error), 408, null)
    }

    throw error
  }

  const payload = (await response.json().catch(() => null)) as T | ApiErrorPayload | null

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null
    throw new ApiRequestError(errorPayload?.message || 'Request failed', response.status, errorPayload)
  }

  return payload as T
}
