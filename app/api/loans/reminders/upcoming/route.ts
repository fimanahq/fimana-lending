import { NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import type { UpcomingLoanReminder } from '@/lib/types'

export async function GET() {
  try {
    const reminders = await authorizedBackendRequest<UpcomingLoanReminder[]>('/loans/reminders/upcoming')
    return NextResponse.json(reminders)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load reminders', 400)
  }
}
