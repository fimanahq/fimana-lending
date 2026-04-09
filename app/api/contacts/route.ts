import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { Contact } from '@/lib/types'

export async function GET() {
  try {
    const contacts = await authorizedBackendRequest<Contact[]>('/contacts')
    return NextResponse.json(contacts)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load contacts', 401)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }

    const contact = await authorizedBackendRequest<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return NextResponse.json(contact, { status: 201 })
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to create contact', 400)
  }
}
