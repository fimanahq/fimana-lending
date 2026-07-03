import { NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await context.params
  try {
    return NextResponse.json(await authorizedBackendRequest(`/loans/${id}/payments/${paymentId}/excess-profit`, {
      method: 'POST',
      body: await request.text(),
    }))
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to classify payment excess', 400)
  }
}
