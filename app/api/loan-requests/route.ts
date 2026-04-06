import { NextRequest, NextResponse } from 'next/server'
import { buildPaymentDays } from '@/lib/loan-schedule'
import { getSessionUser, jsonError } from '@/lib/server/backend'
import { createLoanRequest, listLoanRequests } from '@/lib/server/loan-requests'
import type { LoanSchedulePreset, PaymentFrequency } from '@/lib/types'

function isPaymentFrequency(value: unknown): value is PaymentFrequency {
  return value === 'monthly' || value === 'twice_monthly'
}

function isPaymentPreset(value: unknown): value is LoanSchedulePreset {
  return value === '15_month_end' || value === '5_20' || value === 'custom'
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  return NextResponse.json(await listLoanRequests())
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) {
    return jsonError('Invalid request body', 400)
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
  const firstPaymentDate = typeof body.firstPaymentDate === 'string' ? body.firstPaymentDate : ''
  const firstDay = typeof body.firstDay === 'string' ? body.firstDay : '15'
  const secondDay = typeof body.secondDay === 'string' ? body.secondDay : 'month_end'
  const principal = Number(body.principal)
  const gives = Number(body.gives)
  const paymentFrequency = body.paymentFrequency
  const paymentPreset = body.paymentPreset

  if (!firstName || !lastName) {
    return jsonError('Borrower first and last name are required', 400)
  }

  if (!email && !phone) {
    return jsonError('Provide at least an email address or phone number', 400)
  }

  if (!Number.isFinite(principal) || principal <= 0) {
    return jsonError('Requested amount must be greater than zero', 400)
  }

  if (!Number.isFinite(gives) || gives < 1) {
    return jsonError('Number of gives must be at least 1', 400)
  }

  if (!isPaymentFrequency(paymentFrequency)) {
    return jsonError('Invalid payment frequency', 400)
  }

  if (!isPaymentPreset(paymentPreset)) {
    return jsonError('Invalid payment schedule preset', 400)
  }

  if (!firstPaymentDate) {
    return jsonError('Preferred first payment date is required', 400)
  }

  const paymentDays = buildPaymentDays(paymentFrequency, firstDay, secondDay, paymentPreset)

  const created = await createLoanRequest({
    firstName,
    lastName,
    email: email || undefined,
    phone: phone || undefined,
    principal,
    gives,
    paymentFrequency,
    paymentDays,
    paymentPreset,
    firstPaymentDate,
    notes: notes || undefined,
  })

  return NextResponse.json(created, { status: 201 })
}
