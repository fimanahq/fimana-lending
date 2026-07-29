import { shouldDefaultAdminToLender } from '@/lib/access'
import { API_BASE_URL } from '@/lib/constants'
import { AUTH_FETCH_TIMEOUT_MS, fetchWithTimeout } from '@/lib/fetch-timeout'
import type { User } from '@/lib/types/shared'

export interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

interface BackendEnvelope<T> {
  data: T
}

export async function resolveDefaultAdminLenderMode(authPayload: AuthPayload) {
  if (!shouldDefaultAdminToLender(authPayload.user)) {
    return authPayload
  }

  let response: Response

  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/auth/mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authPayload.accessToken}`,
      },
      body: JSON.stringify({ accountType: 'lender' }),
      cache: 'no-store',
    }, AUTH_FETCH_TIMEOUT_MS)
  } catch {
    return authPayload
  }

  if (!response.ok) {
    return authPayload
  }

  const payload = await response.json().catch(() => null) as BackendEnvelope<AuthPayload> | null
  return payload?.data ?? authPayload
}
