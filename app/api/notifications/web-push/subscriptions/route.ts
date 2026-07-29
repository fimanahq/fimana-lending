import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, backendErrorResponse, jsonError } from '@/lib/server/backend'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return jsonError('Invalid notification subscription', 400)
  }

  try {
    const response = await authorizedBackendRequest<{ enabled: boolean }>('/notifications/web-push/subscriptions', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return NextResponse.json(response)
  } catch (error) {
    return backendErrorResponse(error, 'Unable to save notification subscription')
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null) as { endpoint?: unknown } | null
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
  if (!endpoint) {
    return jsonError('Notification subscription endpoint is required', 400)
  }

  try {
    const response = await authorizedBackendRequest<{ deleted: boolean }>('/notifications/web-push/subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    })
    return NextResponse.json(response)
  } catch (error) {
    return backendErrorResponse(error, 'Unable to remove notification subscription')
  }
}
