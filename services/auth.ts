import { apiRequest } from '@/lib/client-api'
import type { User, UserAppCode } from '@/lib/types'

export interface LoginCredentials {
  identifier: string
  password: string
}

export interface LoginResponse {
  user: User
}

export interface RegisterCredentials {
  firstName: string
  lastName: string
  email: string
  password: string
  appCode: UserAppCode
}

export interface RegisterResponse {
  user: User
}

export function login(credentials: LoginCredentials) {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: credentials.identifier.trim(),
      password: credentials.password,
    }),
  })
}

export function register(credentials: RegisterCredentials) {
  return apiRequest<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}
