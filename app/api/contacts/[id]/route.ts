import { NextRequest, NextResponse } from 'next/server'
import { authorizedBackendRequest, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { Contact } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const contact = await authorizedBackendRequest<Contact>(`/contacts/${id}`)
    return NextResponse.json(contact)
  } catch {
    try {
      const contacts = await authorizedBackendRequest<Contact[]>('/contacts')
      const contact = contacts.find((row) => row._id === id)

      if (!contact) {
        return jsonError('Contact was not found', 404)
      }

      return NextResponse.json(contact)
    } catch (caughtError) {
      return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to load contact', 404)
    }
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (!body) {
      return jsonError('Invalid request body', 400)
    }

    const contact = await authorizedBackendRequest<Contact>(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    return NextResponse.json(contact)
  } catch (caughtError) {
    return jsonError(caughtError instanceof Error ? caughtError.message : 'Unable to update contact', 400)
  }
}
