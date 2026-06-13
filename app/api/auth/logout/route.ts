import { NextResponse } from 'next/server'
import { API_BASE_URL, REFRESH_COOKIE_NAME } from '@/lib/constants'
import { AUTH_FETCH_TIMEOUT_MS, fetchWithTimeout } from '@/lib/fetch-timeout'
import { clearSessionCookies } from '@/lib/server/backend'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value

  if (refreshToken) {
    await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    }, AUTH_FETCH_TIMEOUT_MS).catch(() => null)
  }

  await clearSessionCookies()
  return NextResponse.json({ ok: true })
}
