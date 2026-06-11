import { apiRequest } from '@/lib/client-api'
import { LOGIN_FETCH_TIMEOUT_MS } from '@/lib/fetch-timeout'
import type { User, UserAppCode } from '@/lib/types/shared'

export interface LoginCredentials {
  identifier: string
  password: string
}

export interface LoginResponse {
  user: User
}

export function login(credentials: LoginCredentials) {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: credentials.identifier.trim(),
      password: credentials.password,
    }),
    timeoutMs: LOGIN_FETCH_TIMEOUT_MS,
  })
}
