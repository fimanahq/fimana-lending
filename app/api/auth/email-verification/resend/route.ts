import { NextResponse } from 'next/server'
import { authorizedBackendRequest, backendErrorResponse } from '@/lib/server/backend'

export async function POST() {
  try {
    const response = await authorizedBackendRequest<{ message: string }>('/auth/email-verification/resend', {
      method: 'POST',
    })

    return NextResponse.json(response)
  } catch (error) {
    return backendErrorResponse(error, 'Unable to resend verification email')
  }
}
