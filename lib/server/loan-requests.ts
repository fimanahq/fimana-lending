import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { LoanRequest } from '@/lib/types'

const REQUESTS_FILE_PATH = path.join(process.cwd(), 'data', 'loan-requests.json')

async function ensureRequestsFile() {
  await fs.mkdir(path.dirname(REQUESTS_FILE_PATH), { recursive: true })

  try {
    await fs.access(REQUESTS_FILE_PATH)
  } catch {
    await fs.writeFile(REQUESTS_FILE_PATH, '[]\n', 'utf8')
  }
}

async function readRequestsFile() {
  await ensureRequestsFile()
  const raw = await fs.readFile(REQUESTS_FILE_PATH, 'utf8')

  try {
    const parsed = JSON.parse(raw) as LoanRequest[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeRequestsFile(requests: LoanRequest[]) {
  const sorted = [...requests].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  await fs.writeFile(REQUESTS_FILE_PATH, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
}

export interface CreateLoanRequestInput {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  principal: number
  gives: number
  paymentFrequency: LoanRequest['paymentFrequency']
  paymentDays: string[]
  paymentPreset: LoanRequest['paymentPreset']
  firstPaymentDate: string
  notes?: string
}

export async function listLoanRequests() {
  return readRequestsFile()
}

export async function getLoanRequest(id: string) {
  const requests = await readRequestsFile()
  return requests.find((request) => request.id === id) ?? null
}

export async function createLoanRequest(input: CreateLoanRequestInput) {
  const requests = await readRequestsFile()
  const nextRequest: LoanRequest = {
    id: crypto.randomUUID(),
    ...input,
    status: 'pending',
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    contactId: null,
    loanId: null,
  }

  requests.unshift(nextRequest)
  await writeRequestsFile(requests)

  return nextRequest
}

export async function updateLoanRequest(
  id: string,
  updater: (current: LoanRequest) => LoanRequest,
) {
  const requests = await readRequestsFile()
  const index = requests.findIndex((request) => request.id === id)
  if (index === -1) {
    return null
  }

  const updated = updater(requests[index])
  requests[index] = updated
  await writeRequestsFile(requests)

  return updated
}
