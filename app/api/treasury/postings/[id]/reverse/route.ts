import { NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  try {
    return NextResponse.json(await authorizedBackendRequest(`/treasury/postings/${id}/reverse`, {
      method: 'POST',
      body: await request.text(),
    }))
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to reverse Treasury interest', 400)
  }
}
