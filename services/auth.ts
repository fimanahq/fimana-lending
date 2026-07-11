import { apiRequest } from '@/lib/client-api'
import { LOGIN_FETCH_TIMEOUT_MS } from '@/lib/fetch-timeout'
import type { User, UserAppCode } from '@/lib/types/shared'

export interface LoginCredentials {
  identifier: string
  password: string
}

export type AccountType = 'lender' | 'borrower'

export interface RegisterCredentials {
  email: string
  mobileNumber: string
  password: string
  firstName: string
  lastName: string
}

export interface LoginResponse {
  user: User
}

export interface RegisterResponse extends LoginResponse {
  verificationEmailSent: boolean
}

export interface EmailVerificationResponse {
  message: string
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

export function register(credentials: RegisterCredentials) {
  return apiRequest<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: credentials.email.trim(),
      mobileNumber: credentials.mobileNumber.trim(),
      password: credentials.password,
      firstName: credentials.firstName.trim(),
      lastName: credentials.lastName.trim(),
    }),
    timeoutMs: LOGIN_FETCH_TIMEOUT_MS,
  })
}

export function selectAccountType(accountType: AccountType) {
  return apiRequest<LoginResponse>('/api/auth/account-type', {
    method: 'POST',
    body: JSON.stringify({ accountType }),
    timeoutMs: LOGIN_FETCH_TIMEOUT_MS,
  })
}

export function updateCurrentUserProfile(profile: Partial<Pick<User, 'firstName' | 'lastName' | 'mobileNumber'>>) {
  return apiRequest<LoginResponse>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
    timeoutMs: LOGIN_FETCH_TIMEOUT_MS,
  })
}

export function resendEmailVerification() {
  return apiRequest<EmailVerificationResponse>('/api/auth/email-verification/resend', {
    method: 'POST',
    timeoutMs: LOGIN_FETCH_TIMEOUT_MS,
  })
}

export function confirmEmailVerification(token: string) {
  return apiRequest<LoginResponse>('/api/auth/email-verification/confirm', {
    method: 'POST',
    body: JSON.stringify({ token }),
    timeoutMs: LOGIN_FETCH_TIMEOUT_MS,
  })
}
