import { NextRequest, NextResponse } from 'next/server'
import { normalizePhilippineMobileNumber } from '@/lib/phone'
import { authorizedBackendRequest, backendErrorResponse, jsonError } from '@/lib/server/backend'
import { readJsonBody } from '@/lib/server/request'
import type { User } from '@/lib/types/shared'

export async function PATCH(request: NextRequest) {
  const body = await readJsonBody<{
    firstName?: unknown
    lastName?: unknown
    mobileNumber?: unknown
  }>(request)

  if (!body) {
    return jsonError('Invalid request body', 400)
  }

  const mobileNumber = typeof body.mobileNumber === 'string'
    ? normalizePhilippineMobileNumber(body.mobileNumber)
    : undefined

  if (typeof body.mobileNumber === 'string' && !mobileNumber) {
    return jsonError('Use a valid Philippine mobile number', 400)
  }

  const payload = {
    ...(typeof body.firstName === 'string' && { firstName: body.firstName.trim() }),
    ...(typeof body.lastName === 'string' && { lastName: body.lastName.trim() }),
    ...(mobileNumber && { mobileNumber }),
  }

  try {
    const user = await authorizedBackendRequest<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return NextResponse.json({ user })
  } catch (error) {
    return backendErrorResponse(error, 'Unable to update profile')
  }
}
