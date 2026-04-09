import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { LoanRequest } from '@/lib/types'

const REQUESTS_FILE_PATH = path.join(process.cwd(), 'data', 'loan-requests.json')
const REQUESTS_LOCK_PATH = `${REQUESTS_FILE_PATH}.lock`
const REQUESTS_TEMP_PATH = `${REQUESTS_FILE_PATH}.tmp`
const LOCK_RETRY_MS = 25
const LOCK_TIMEOUT_MS = 5000

interface ReviewLock {
  actor: string
  acquiredAt: string
  token: string
}

interface StoredLoanRequest extends LoanRequest {
  reviewLock?: ReviewLock
}

type ClaimResult =
  | { kind: 'claimed'; request: LoanRequest; token: string }
  | { kind: 'conflict' }
  | { kind: 'not_found' }

async function ensureRequestsFile() {
  await fs.mkdir(path.dirname(REQUESTS_FILE_PATH), { recursive: true })

  try {
    await fs.access(REQUESTS_FILE_PATH)
  } catch {
    await fs.writeFile(REQUESTS_FILE_PATH, '[]\n', 'utf8')
  }
}

function toPublicLoanRequest({ reviewLock, ...request }: StoredLoanRequest): LoanRequest {
  void reviewLock
  return request
}

async function sleep(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function withRequestsLock<T>(operation: () => Promise<T>) {
  await ensureRequestsFile()
  const startedAt = Date.now()

  while (true) {
    try {
      const lockHandle = await fs.open(REQUESTS_LOCK_PATH, 'wx')

      try {
        return await operation()
      } finally {
        await lockHandle.close()
        await fs.unlink(REQUESTS_LOCK_PATH).catch(() => null)
      }
    } catch (caughtError) {
      const isBusy = caughtError instanceof Error && 'code' in caughtError && caughtError.code === 'EEXIST'
      if (!isBusy) {
        throw caughtError
      }

      if (Date.now() - startedAt >= LOCK_TIMEOUT_MS) {
        throw new Error('Loan request store is busy. Please try again.')
      }

      await sleep(LOCK_RETRY_MS)
    }
  }
}

async function readRequestsFile() {
  await ensureRequestsFile()
  const raw = await fs.readFile(REQUESTS_FILE_PATH, 'utf8')

  try {
    const parsed = JSON.parse(raw) as StoredLoanRequest[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeRequestsFile(requests: StoredLoanRequest[]) {
  const sorted = [...requests].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  await fs.writeFile(REQUESTS_TEMP_PATH, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
  await fs.rename(REQUESTS_TEMP_PATH, REQUESTS_FILE_PATH)
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
  const requests = await readRequestsFile()
  return requests.map(toPublicLoanRequest)
}

export async function getLoanRequest(id: string) {
  const requests = await readRequestsFile()
  const request = requests.find((current) => current.id === id)
  return request ? toPublicLoanRequest(request) : null
}

export async function createLoanRequest(input: CreateLoanRequestInput) {
  return withRequestsLock(async () => {
    const requests = await readRequestsFile()
    const nextRequest: StoredLoanRequest = {
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

    return toPublicLoanRequest(nextRequest)
  })
}

export async function claimLoanRequestReview(id: string, actor: string): Promise<ClaimResult> {
  return withRequestsLock(async () => {
    const requests = await readRequestsFile()
    const index = requests.findIndex((request) => request.id === id)

    if (index === -1) {
      return { kind: 'not_found' }
    }

    const current = requests[index]
    if (current.status !== 'pending' || current.reviewLock) {
      return { kind: 'conflict' }
    }

    const token = crypto.randomUUID()
    const claimed: StoredLoanRequest = {
      ...current,
      reviewLock: {
        actor,
        acquiredAt: new Date().toISOString(),
        token,
      },
    }

    requests[index] = claimed
    await writeRequestsFile(requests)

    return {
      kind: 'claimed',
      request: toPublicLoanRequest(claimed),
      token,
    }
  })
}

export async function saveLoanRequestReviewProgress(
  id: string,
  token: string,
  updater: (current: LoanRequest) => LoanRequest,
) {
  return withRequestsLock(async () => {
    const requests = await readRequestsFile()
    const index = requests.findIndex((request) => request.id === id)

    if (index === -1) {
      throw new Error('Loan request not found')
    }

    const current = requests[index]
    if (current.reviewLock?.token !== token) {
      throw new Error('Loan request review is no longer active')
    }

    const updated: StoredLoanRequest = {
      ...updater(toPublicLoanRequest(current)),
      reviewLock: current.reviewLock,
    }

    requests[index] = updated
    await writeRequestsFile(requests)

    return toPublicLoanRequest(updated)
  })
}

export async function completeLoanRequestReview(
  id: string,
  token: string,
  updater: (current: LoanRequest) => LoanRequest,
) {
  return withRequestsLock(async () => {
    const requests = await readRequestsFile()
    const index = requests.findIndex((request) => request.id === id)

    if (index === -1) {
      throw new Error('Loan request not found')
    }

    const current = requests[index]
    if (current.reviewLock?.token !== token) {
      throw new Error('Loan request review is no longer active')
    }

    const updated = updater(toPublicLoanRequest(current))
    requests[index] = updated
    await writeRequestsFile(requests)

    return updated
  })
}

export async function releaseLoanRequestReview(id: string, token: string) {
  return withRequestsLock(async () => {
    const requests = await readRequestsFile()
    const index = requests.findIndex((request) => request.id === id)

    if (index === -1) {
      return null
    }

    const current = requests[index]
    if (current.reviewLock?.token !== token) {
      return toPublicLoanRequest(current)
    }

    const { reviewLock, ...released } = current
    void reviewLock
    requests[index] = released
    await writeRequestsFile(requests)

    return toPublicLoanRequest(released)
  })
}
