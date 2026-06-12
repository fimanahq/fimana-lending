export const DEFAULT_FETCH_TIMEOUT_MS = 15_000
export const AUTH_FETCH_TIMEOUT_MS = 30_000
export const LOGIN_FETCH_TIMEOUT_MS = 30_000
export const REQUEST_LOAN_FETCH_TIMEOUT_MS = 90_000
export const REQUEST_TIMEOUT_MESSAGE = 'Request timed out. Please try again.'
export const API_UNAVAILABLE_MESSAGE = 'FiMana API is unavailable. Please try again.'

export function isAbortLikeError(error: unknown) {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.name === 'TimeoutError'
  }

  if (typeof error === 'object' && error !== null && 'name' in error) {
    return error.name === 'AbortError' || error.name === 'TimeoutError'
  }

  return false
}

export function getFetchFailureMessage(error: unknown) {
  return isAbortLikeError(error) ? REQUEST_TIMEOUT_MESSAGE : API_UNAVAILABLE_MESSAGE
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
) {
  const controller = new AbortController()
  const signal = init.signal

  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new DOMException('Request aborted', 'AbortError')
  }

  const abortFromParent = () => {
    controller.abort(signal?.reason ?? new DOMException('Request aborted', 'AbortError'))
  }

  signal?.addEventListener('abort', abortFromParent, { once: true })

  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError'))
  }, timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    globalThis.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromParent)
  }
}
