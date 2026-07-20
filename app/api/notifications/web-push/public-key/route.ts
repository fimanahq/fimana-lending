import { NextResponse } from 'next/server'
import { authorizedBackendRequest, backendErrorResponse } from '@/lib/server/backend'

export async function GET() {
  try {
    const response = await authorizedBackendRequest<{ publicKey: string }>('/notifications/web-push/public-key')
    return NextResponse.json(response)
  } catch (error) {
    return backendErrorResponse(error, 'Unable to load notification settings', 503)
  }
}
