import { getJwtMaxAgeSeconds } from '@/lib/jwt-expiry'

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export function getSessionCookieOptions(token: string) {
  const maxAge = getJwtMaxAgeSeconds(token)
  return maxAge ? { ...sessionCookieOptions, maxAge } : null
}

export function getExpiredSessionCookieOptions() {
  return {
    ...sessionCookieOptions,
    expires: new Date(0),
    maxAge: 0,
  }
}
